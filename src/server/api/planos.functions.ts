import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { createPlano, getPlanosComStatusAtualizado, updatePlano } from '~/server/core/planos/plano.usecases'
import { planoRepository } from '~/server/repository/plano.repository.drizzle'

const planoFormSchema = z.object({
  nome: z.string().min(1),
  eixoId: z.string().min(1),
  dataInicio: z.string().min(1),
  dataFim: z.string().min(1),
})

export const listPlanosFn = createServerFn({ method: 'GET' })
  .validator(z.object({ eixoId: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    const planos = data?.eixoId ? await planoRepository.findByEixo(data.eixoId) : await planoRepository.findAll()
    return getPlanosComStatusAtualizado(planoRepository, planos)
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
