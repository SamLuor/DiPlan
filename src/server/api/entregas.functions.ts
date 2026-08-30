import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { subject } from '@casl/ability'
import { z } from 'zod'
import {
  addNota,
  addSolicitacao,
  aprovarEntrega,
  concluirDelegacao,
  confirmAnexoUpload,
  createAnexoUploadUrl,
  createEntrega,
  deleteNota,
  editNota,
  getAnexoDownloadUrl,
  iniciarDelegacao,
  moveEntregaToStatus,
  performAcao,
  reabrirDelegacao,
  removeAnexo,
  updateEntrega,
  type EntregaRepos,
} from '~/server/core/entregas/entrega.usecases'
import { requireActorWithAbility } from '~/server/core/auth/actor'
import { eixoRepository } from '~/server/repository/eixo.repository.drizzle'
import { entregaRepository } from '~/server/repository/entrega.repository.drizzle'
import { planoRepository } from '~/server/repository/plano.repository.drizzle'
import { usuarioRepository } from '~/server/repository/usuario.repository.drizzle'

const repos: EntregaRepos = { entregas: entregaRepository, planos: planoRepository, eixos: eixoRepository, usuarios: usuarioRepository }

async function requireActor() {
  const { actor } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
  return actor
}

const prioridadeSchema = z.enum(['baixa', 'normal', 'alta', 'urgente'])
const situacaoSchema = z.enum(['aguardando', 'andamento', 'concluida'])
const solicitacaoTipoSchema = z.enum(['revisao', 'manifestacao', 'complementacao', 'analise', 'elaboracao', 'aprovacao'])

const entregaFormSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string(),
  planoId: z.string().min(1),
  dataInicio: z.string().nullable(),
  dataPrevista: z.string().nullable(),
  prioridade: prioridadeSchema,
  responsavelUserId: z.string().nullable(),
})

export const listEntregasFn = createServerFn({ method: 'GET' })
  .validator(z.object({ planoId: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    const { ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    const entregas = data?.planoId ? await entregaRepository.findByPlano(data.planoId) : await entregaRepository.findAll()
    const planos = await planoRepository.findAll()
    const eixoIdPorPlano = new Map(planos.map((p) => [p.id, p.eixoId]))
    return entregas.filter((e) => ability.can('read', subject('Entrega', { ...e, eixoId: eixoIdPorPlano.get(e.planoId) })))
  })

export const getEntregaFn = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { actor, ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    const entrega = await entregaRepository.findById(data.id)
    if (!entrega) return null
    const plano = await planoRepository.findById(entrega.planoId)
    // 404-like (null) em vez de 403 — não revela se a entrega existe pra quem não tem acesso.
    if (ability.cannot('read', subject('Entrega', { ...entrega, eixoId: plano?.eixoId }))) return null

    // Quem só chegou aqui via delegação (não é responsável/chefia/diretoria) só enxerga a
    // própria delegação na lista de Solicitações — nunca as de outras pessoas (spec-task-delegar-entrega.md).
    const eixo = plano ? await eixoRepository.findById(plano.eixoId) : null
    const acessoNormal = actor.perfil === 'diretoria' || entrega.responsavelUserId === actor.id || eixo?.chefiaUserId === actor.id
    if (!acessoNormal) {
      entrega.solicitacoes = entrega.solicitacoes
        .map((s) => ({ ...s, responsaveis: s.responsaveis.filter((r) => r.userId === actor.id) }))
        .filter((s) => s.responsaveis.length > 0)
    }
    return entrega
  })

export const entregasQueryOptions = (planoId?: string) =>
  queryOptions({
    queryKey: ['entregas', planoId ?? null],
    queryFn: () => listEntregasFn({ data: { planoId } }),
  })

export const entregaQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['entrega', id],
    queryFn: () => getEntregaFn({ data: { id } }),
  })

export const createEntregaFn = createServerFn({ method: 'POST' })
  .validator(entregaFormSchema.partial({ dataInicio: true }))
  .handler(async ({ data }) => {
    const { actor, ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    const plano = await planoRepository.findById(data.planoId)
    if (ability.cannot('create', subject('Entrega', { eixoId: plano?.eixoId }))) throw new Error('Sem permissão para criar entrega.')
    return createEntrega(repos, { dataInicio: null, ...data }, actor)
  })

export const updateEntregaFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1) }).and(entregaFormSchema.partial()))
  .handler(async ({ data }) => {
    const { ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    const { id, ...patch } = data
    const entrega = await entregaRepository.findById(id)
    if (!entrega) throw new Error('Entrega não encontrada.')
    const plano = await planoRepository.findById(entrega.planoId)
    if (ability.cannot('update', subject('Entrega', { ...entrega, eixoId: plano?.eixoId }))) throw new Error('Sem permissão para editar esta entrega.')
    return updateEntrega(repos, id, patch)
  })

export const moveEntregaToStatusFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1), status: situacaoSchema }))
  .handler(async ({ data }) => {
    const { actor, ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    const entrega = await entregaRepository.findById(data.id)
    if (!entrega) throw new Error('Entrega não encontrada.')
    const plano = await planoRepository.findById(entrega.planoId)
    const verbo = data.status === 'andamento' ? 'iniciar' : data.status === 'concluida' ? 'concluir' : 'reabrir'
    if (ability.cannot(verbo, subject('Entrega', { ...entrega, eixoId: plano?.eixoId }))) throw new Error('Sem permissão para mover esta entrega.')
    return moveEntregaToStatus(repos, data.id, data.status, actor)
  })

export const performAcaoFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { actor, ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    const entrega = await entregaRepository.findById(data.id)
    if (!entrega) throw new Error('Entrega não encontrada.')
    const plano = await planoRepository.findById(entrega.planoId)
    const verbo = entrega.situacao === 'aguardando' ? 'iniciar' : entrega.situacao === 'andamento' ? 'concluir' : 'reabrir'
    if (ability.cannot(verbo, subject('Entrega', { ...entrega, eixoId: plano?.eixoId }))) throw new Error('Sem permissão para executar esta ação.')
    return performAcao(repos, data.id, actor)
  })

export const aprovarEntregaFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { actor, ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    const entrega = await entregaRepository.findById(data.id)
    if (!entrega) throw new Error('Entrega não encontrada.')
    const plano = await planoRepository.findById(entrega.planoId)
    if (ability.cannot('aprovar', subject('Entrega', { ...entrega, eixoId: plano?.eixoId }))) throw new Error('Sem permissão para aprovar esta entrega.')
    return aprovarEntrega(repos, data.id, actor)
  })

export const addNotaFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      entregaId: z.string().min(1),
      texto: z.string().min(1),
      proximoPasso: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { actor, ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    const entrega = await entregaRepository.findById(data.entregaId)
    if (!entrega) throw new Error('Entrega não encontrada.')
    const plano = await planoRepository.findById(entrega.planoId)
    if (ability.cannot('read', subject('Entrega', { ...entrega, eixoId: plano?.eixoId }))) throw new Error('Sem permissão para acessar esta entrega.')
    const { entregaId, ...input } = data
    return addNota(repos, entregaId, input, actor)
  })

export const editNotaFn = createServerFn({ method: 'POST' })
  .validator(z.object({ notaId: z.string().min(1), texto: z.string().min(1) }))
  .handler(async ({ data }) => {
    const actor = await requireActor()
    return editNota(repos, data.notaId, data.texto, actor)
  })

export const deleteNotaFn = createServerFn({ method: 'POST' })
  .validator(z.object({ entregaId: z.string().min(1), notaId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const actor = await requireActor()
    const entrega = await entregaRepository.findById(data.entregaId)
    if (!entrega) throw new Error('Entrega não encontrada.')
    await deleteNota(repos, entrega, data.notaId, actor)
  })

const anexoMetaSchema = z.object({
  nome: z.string().min(1),
  contentType: z.string().min(1),
  tamanho: z.number().int().positive(),
})

async function requireEntregaAcessivel(entregaId: string) {
  const { actor, ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
  const entrega = await entregaRepository.findById(entregaId)
  if (!entrega) throw new Error('Entrega não encontrada.')
  const plano = await planoRepository.findById(entrega.planoId)
  if (ability.cannot('read', subject('Entrega', { ...entrega, eixoId: plano?.eixoId }))) throw new Error('Sem permissão para acessar esta entrega.')
  return actor
}

export const createAnexoUploadUrlFn = createServerFn({ method: 'POST' })
  .validator(z.object({ entregaId: z.string().min(1) }).and(anexoMetaSchema))
  .handler(async ({ data }) => {
    const actor = await requireEntregaAcessivel(data.entregaId)
    const { entregaId, ...meta } = data
    return createAnexoUploadUrl(repos, entregaId, meta, actor)
  })

export const confirmAnexoUploadFn = createServerFn({ method: 'POST' })
  .validator(z.object({ entregaId: z.string().min(1), key: z.string().min(1), notaId: z.string().optional() }).and(anexoMetaSchema))
  .handler(async ({ data }) => {
    const actor = await requireEntregaAcessivel(data.entregaId)
    const { entregaId, ...input } = data
    return confirmAnexoUpload(repos, entregaId, input, actor)
  })

export const getAnexoDownloadUrlFn = createServerFn({ method: 'POST' })
  .validator(z.object({ anexoId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireActor()
    return getAnexoDownloadUrl(repos, data.anexoId)
  })

export const removeAnexoFn = createServerFn({ method: 'POST' })
  .validator(z.object({ anexoId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireActor()
    await removeAnexo(repos, data.anexoId)
  })

export const addSolicitacaoFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      entregaId: z.string().min(1),
      tipo: solicitacaoTipoSchema,
      descricao: z.string().min(1),
      prazo: z.string().nullable(),
      prioridade: prioridadeSchema,
      responsavelIds: z.array(z.string().min(1)),
    }),
  )
  .handler(async ({ data }) => {
    const { actor, ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    const entrega = await entregaRepository.findById(data.entregaId)
    if (!entrega) throw new Error('Entrega não encontrada.')
    const plano = await planoRepository.findById(entrega.planoId)
    if (ability.cannot('delegar', subject('Entrega', { ...entrega, eixoId: plano?.eixoId }))) throw new Error('Sem permissão para delegar nesta entrega.')
    const { entregaId, ...input } = data
    return addSolicitacao(repos, entregaId, input, actor)
  })

export const iniciarDelegacaoFn = createServerFn({ method: 'POST' })
  .validator(z.object({ solicitacaoId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const actor = await requireActor()
    return iniciarDelegacao(repos, data.solicitacaoId, actor)
  })

export const concluirDelegacaoFn = createServerFn({ method: 'POST' })
  .validator(z.object({ solicitacaoId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const actor = await requireActor()
    return concluirDelegacao(repos, data.solicitacaoId, actor)
  })

export const reabrirDelegacaoFn = createServerFn({ method: 'POST' })
  .validator(z.object({ solicitacaoId: z.string().min(1), responsavelId: z.string().min(1), justificativa: z.string().min(1) }))
  .handler(async ({ data }) => {
    const actor = await requireActor()
    return reabrirDelegacao(repos, data.solicitacaoId, data.responsavelId, data.justificativa, actor)
  })
