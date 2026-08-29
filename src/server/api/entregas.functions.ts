import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { currentUser } from '~/server/core/auth/auth.usecases'
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
  type Actor,
  type EntregaRepos,
} from '~/server/core/entregas/entrega.usecases'
import { eixoRepository } from '~/server/repository/eixo.repository.drizzle'
import { entregaRepository } from '~/server/repository/entrega.repository.drizzle'
import { planoRepository } from '~/server/repository/plano.repository.drizzle'
import { usuarioRepository } from '~/server/repository/usuario.repository.drizzle'

const repos: EntregaRepos = { entregas: entregaRepository, planos: planoRepository, eixos: eixoRepository, usuarios: usuarioRepository }

async function requireActor(): Promise<Actor> {
  const user = await currentUser(usuarioRepository)
  if (!user) throw new Error('Não autenticado.')
  return { id: user.id, email: user.email }
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
    if (data?.planoId) return entregaRepository.findByPlano(data.planoId)
    return entregaRepository.findAll()
  })

export const getEntregaFn = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    return entregaRepository.findById(data.id)
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
    return createEntrega(repos, { dataInicio: null, ...data })
  })

export const updateEntregaFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1) }).and(entregaFormSchema.partial()))
  .handler(async ({ data }) => {
    const { id, ...patch } = data
    return updateEntrega(repos, id, patch)
  })

export const moveEntregaToStatusFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1), status: situacaoSchema }))
  .handler(async ({ data }) => {
    const actor = await requireActor()
    return moveEntregaToStatus(repos, data.id, data.status, actor)
  })

export const performAcaoFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const actor = await requireActor()
    return performAcao(repos, data.id, actor)
  })

export const addNotaFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      entregaId: z.string().min(1),
      texto: z.string().min(1),
      autor: z.string().min(1),
      proximoPasso: z.string().optional(),
      anexoNome: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { entregaId, ...input } = data
    return addNota(repos, entregaId, input)
  })

export const editNotaFn = createServerFn({ method: 'POST' })
  .validator(z.object({ notaId: z.string().min(1), texto: z.string().min(1) }))
  .handler(async ({ data }) => {
    return editNota(repos, data.notaId, data.texto)
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
  .validator(z.object({ entregaId: z.string().min(1), key: z.string().min(1) }).and(anexoMetaSchema))
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
