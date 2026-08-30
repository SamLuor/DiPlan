import { AbilityBuilder, createMongoAbility, type AbilityTuple, type ForcedSubject, type MongoAbility } from '@casl/ability'
import type { Perfil } from '~/server/repository/usuario.repository'

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
  | 'administrar'
  | 'ver-geral'
  | 'ver-unidade'
  | 'ver-individual'

/** Só os campos usados nas condições CASL (`eixoId`/`responsavelUserId`) — o objeto real pode ter mais campos. */
type PlanoSubject = { eixoId?: string } & ForcedSubject<'Plano'>
type EntregaSubject = { eixoId?: string; responsavelUserId?: string | null } & ForcedSubject<'Entrega'>

type AppAbilities =
  | AbilityTuple<Acao, 'all'>
  | AbilityTuple<Acao, 'Usuario'>
  | AbilityTuple<Acao, 'Eixo'>
  | AbilityTuple<Acao, 'Relatorio'>
  | AbilityTuple<Acao, 'Plano' | PlanoSubject>
  | AbilityTuple<Acao, 'Entrega' | EntregaSubject>

export type AppAbility = MongoAbility<AppAbilities>

export interface AbilityUser {
  id: string
  perfil: Perfil
}

/** Chefia é definida por eixo (eixos.chefiaUserId), não pelo eixoId do próprio usuário — precisa ser resolvido antes de chamar isso. */
export interface AbilityContext {
  eixosChefiados: string[]
}

/**
 * Ver `domain-info/rbac-spec.md` pra tabela completa (matriz da Seção 4 → regra CASL).
 * Isomórfico: sem import de infra, usável tanto no servidor (enforcement) quanto no client (gating de UI).
 */
export function defineAbilityFor(usuario: AbilityUser, ctx: AbilityContext): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

  if (usuario.perfil === 'diretoria') {
    can('manage', 'all')
    return build()
  }

  if (usuario.perfil === 'chefia') {
    const doEixo = { eixoId: { $in: ctx.eixosChefiados } }
    can(['create', 'read', 'update', 'delete'], 'Plano', doEixo)
    can(['create', 'read', 'update', 'delete', 'reabrir', 'iniciar', 'registrarAndamento', 'anexar', 'delegar', 'solicitarRevisao', 'concluir'], 'Entrega', doEixo)
    can('ver-unidade', 'Relatorio')
    can('ver-individual', 'Relatorio')
    return build()
  }

  // Operacional
  const proprias = { responsavelUserId: usuario.id }
  can('read', 'Entrega', proprias)
  // Contradição 1 (rbac-spec.md): Operacional pode editar o descritivo das entregas das quais é responsável.
  can('update', 'Entrega', proprias)
  can(['iniciar', 'registrarAndamento', 'anexar', 'delegar', 'solicitarRevisao', 'concluir'], 'Entrega', proprias)
  // Contradição 2 (rbac-spec.md): sem fluxo de aprovação implementado, Operacional não cria entrega.
  cannot('create', 'Entrega')
  cannot('delete', 'Entrega')
  cannot('reabrir', 'Entrega')
  cannot(['create', 'read', 'update', 'delete'], 'Plano')
  can('ver-individual', 'Relatorio')
  return build()
}
