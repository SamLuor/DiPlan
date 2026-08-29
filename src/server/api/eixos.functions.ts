import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { createEixo, updateEixo } from '~/server/core/eixos/eixo.usecases'
import { eixoRepository } from '~/server/repository/eixo.repository.drizzle'

export const listEixosFn = createServerFn({ method: 'GET' }).handler(async () => {
  return eixoRepository.findAll()
})

export const eixosQueryOptions = () =>
  queryOptions({
    queryKey: ['eixos'],
    queryFn: () => listEixosFn(),
  })

export const createEixoFn = createServerFn({ method: 'POST' })
  .validator(z.object({ nome: z.string().min(1) }))
  .handler(async ({ data }) => {
    return createEixo(eixoRepository, data.nome)
  })

export const updateEixoFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string(), nome: z.string().min(1), chefiaUserId: z.string().nullable() }))
  .handler(async ({ data }) => {
    return updateEixo(eixoRepository, data.id, { nome: data.nome, chefiaUserId: data.chefiaUserId })
  })
