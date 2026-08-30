import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { subject } from '@casl/ability'
import { z } from 'zod'
import {
  addNota,
  addSolicitacao,
  confirmAnexoUpload,
  createAnexoUploadUrl,
  createEntrega,
  deleteNota,
  editNota,
  getAnexoDownloadUrl,
  moveEntregaToStatus,
  performAcao,
  removeAnexo,
  responderSolicitacao,
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
    const { ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    const entrega = await entregaRepository.findById(data.id)
    if (!entrega) return null
    const plano = await planoRepository.findById(entrega.planoId)
    // 404-like (null) em vez de 403 — não revela se a entrega existe pra quem não tem acesso.
    if (ability.cannot('read', subject('Entrega', { ...entrega, eixoId: plano?.eixoId }))) return null
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
    const { ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    const plano = await planoRepository.findById(data.planoId)
    if (ability.cannot('create', subject('Entrega', { eixoId: plano?.eixoId }))) throw new Error('Sem permissão para criar entrega.')
    return createEntrega(repos, { dataInicio: null, ...data })
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

export const addNotaFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      entregaId: z.string().min(1),
      texto: z.string().min(1),
      proximoPasso: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const actor = await requireActor()
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

export const createAnexoUploadUrlFn = createServerFn({ method: 'POST' })
  .validator(z.object({ entregaId: z.string().min(1) }).and(anexoMetaSchema))
  .handler(async ({ data }) => {
    await requireActor()
    const { entregaId, ...meta } = data
    return createAnexoUploadUrl(repos, entregaId, meta)
  })

export const confirmAnexoUploadFn = createServerFn({ method: 'POST' })
  .validator(z.object({ entregaId: z.string().min(1), key: z.string().min(1), notaId: z.string().optional() }).and(anexoMetaSchema))
  .handler(async ({ data }) => {
    await requireActor()
    const { entregaId, ...input } = data
    return confirmAnexoUpload(repos, entregaId, input)
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
    const actor = await requireActor()
    const { entregaId, ...input } = data
    return addSolicitacao(repos, entregaId, input, actor)
  })

export const responderSolicitacaoFn = createServerFn({ method: 'POST' })
  .validator(z.object({ entregaId: z.string().min(1), solicitacaoId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const actor = await requireActor()
    const entrega = await entregaRepository.findById(data.entregaId)
    if (!entrega) throw new Error('Entrega não encontrada.')
    await responderSolicitacao(repos, entrega, data.solicitacaoId, actor)
  })
