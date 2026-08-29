import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { createPlano, movePlanoToStatus, updatePlano } from '~/server/core/planos/plano.usecases'
import { planoRepository } from '~/server/repository/plano.repository.drizzle'

const statusPlanoSchema = z.enum(['planejado', 'execucao', 'concluido'])

const planoFormSchema = z.object({
  nome: z.string().min(1),
  eixoId: z.string().min(1),
  status: statusPlanoSchema,
  dataInicio: z.string().nullable(),
  dataFim: z.string().nullable(),
})

export const listPlanosFn = createServerFn({ method: 'GET' })
  .validator(z.object({ eixoId: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    if (data?.eixoId) return planoRepository.findByEixo(data.eixoId)
    return planoRepository.findAll()
  })

export const planosQueryOptions = (eixoId?: string) =>
  queryOptions({
    queryKey: ['planos', eixoId ?? null],
    queryFn: () => listPlanosFn({ data: { eixoId } }),
  })

export const createPlanoFn = createServerFn({ method: 'POST' })
  .validator(planoFormSchema)
  .handler(async ({ data }) => {
    return createPlano(planoRepository, data)
  })

export const updatePlanoFn = createServerFn({ method: 'POST' })
  .validator(planoFormSchema.extend({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { id, ...rest } = data
    return updatePlano(planoRepository, id, rest)
  })

export const movePlanoToStatusFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1), status: statusPlanoSchema }))
  .handler(async ({ data }) => {
    return movePlanoToStatus(planoRepository, data.id, data.status)
  })
