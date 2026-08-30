import { AbilityBuilder, createMongoAbility, type AbilityTuple, type ForcedSubject, type MongoAbility } from '@casl/ability'
import type { Perfil } from '~/server/repository/usuario.repository'
import type { SituacaoEntrega } from '~/server/repository/entrega.repository'

/**
 * Ações do documento fonte (Seções 3 e 4) traduzidas pra verbos CASL.
 * `manage`/`all` é o wildcard nativo do CASL — só a Diretoria usa.
 */
export type Acao =
  | 'manage'
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'iniciar'
  | 'registrarAndamento'
  | 'anexar'
  | 'delegar'
  | 'solicitarRevisao'
  | 'concluir'
  | 'reabrir'
  | 'aprovar'
  | 'administrar'
  | 'ver-geral'
  | 'ver-unidade'
  | 'ver-individual'

/** Só os campos usados nas condições CASL — o objeto real pode ter mais campos. */
type EixoSubject = { id?: string } & ForcedSubject<'Eixo'>
type PlanoSubject = { id?: string; eixoId?: string } & ForcedSubject<'Plano'>
type EntregaSubject = { eixoId?: string; responsavelUserId?: string | null; situacao?: SituacaoEntrega } & ForcedSubject<'Entrega'>

type AppAbilities =
  | AbilityTuple<Acao, 'all'>
  | AbilityTuple<Acao, 'Usuario'>
  | AbilityTuple<Acao, 'Eixo' | EixoSubject>
  | AbilityTuple<Acao, 'Relatorio'>
  | AbilityTuple<Acao, 'Plano' | PlanoSubject>
  | AbilityTuple<Acao, 'Entrega' | EntregaSubject>

export type AppAbility = MongoAbility<AppAbilities>

export interface AbilityUser {
  id: string
  perfil: Perfil
  eixoId: string | null
}

export interface AbilityContext {
  /** Eixo(s) dos quais o usuário é chefia (`eixos.chefiaUserId`) — não é o mesmo que `usuario.eixoId`. */
  eixosChefiados: string[]
  /** Só relevante pra Operacional: planos que têm ao menos uma entrega da qual ele é responsável. */
  planosComEntregaPropria: string[]
}

/**
 * Ver `domain-info/rbac-spec.md` pra tabela completa (matriz da Seção 4 → regra CASL).
 * Isomórfico: sem import de infra, usável tanto no servidor (enforcement) quanto no client (gating de UI).
 */
export function defineAbilityFor(usuario: AbilityUser, ctx: AbilityContext): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

  if (usuario.perfil === 'diretoria') {
    // Diretoria não precisa estar vinculada a eixo nenhum — acesso total, sem escopo.
    can('manage', 'all')
    return build()
  }

  if (usuario.perfil === 'chefia') {
    const doEixo = { eixoId: { $in: ctx.eixosChefiados } }
    can('read', 'Eixo', { id: { $in: ctx.eixosChefiados } })
    can(['create', 'read', 'update', 'delete'], 'Plano', doEixo)
    can(
      ['create', 'read', 'update', 'delete', 'reabrir', 'aprovar', 'iniciar', 'registrarAndamento', 'anexar', 'delegar', 'solicitarRevisao', 'concluir'],
      'Entrega',
      doEixo,
    )
    can('ver-unidade', 'Relatorio')
    can('ver-individual', 'Relatorio')
    return build()
  }

  // Operacional
  const proprias = { responsavelUserId: usuario.id }
  if (usuario.eixoId) can('read', 'Eixo', { id: usuario.eixoId })
  can('read', 'Plano', { id: { $in: ctx.planosComEntregaPropria } })
  can('read', 'Entrega', proprias)
  // Fluxo de aprovação (spec-task-aprovacao-entrega.md): Operacional pode criar entrega — mas
  // sempre nasce 'aguardando aprovação' (o usecase decide isso, não o client). Antes dessa
  // feature era `cannot('create', 'Entrega')` — a contradição 2 do rbac-spec.md era resolvida
  // negando a criação; agora o fluxo de aprovação resolve a contradição de verdade.
  can('create', 'Entrega')
  // Contradição 1 (rbac-spec.md): pode editar o descritivo, mas só enquanto ainda não foi
  // aprovada — depois de aprovada, só Chefia/Diretoria mexem nesses campos (regra 6 do spec).
  can('update', 'Entrega', { ...proprias, situacao: 'aguardando aprovação' })
  can(['iniciar', 'registrarAndamento', 'anexar', 'delegar', 'solicitarRevisao', 'concluir'], 'Entrega', proprias)
  cannot('delete', 'Entrega')
  cannot('reabrir', 'Entrega')
  cannot('aprovar', 'Entrega')
  cannot(['create', 'update', 'delete'], 'Plano')
  can('ver-individual', 'Relatorio')
  return build()
}
