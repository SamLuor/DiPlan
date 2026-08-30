import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { subject } from '@casl/ability'
import { z } from 'zod'
import { createEixo, updateEixo } from '~/server/core/eixos/eixo.usecases'
import { requireActorWithAbility } from '~/server/core/auth/actor'
import { eixoRepository } from '~/server/repository/eixo.repository.drizzle'
import { entregaRepository } from '~/server/repository/entrega.repository.drizzle'
import { usuarioRepository } from '~/server/repository/usuario.repository.drizzle'

export const listEixosFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
  const eixos = await eixoRepository.findAll()
  return eixos.filter((e) => ability.can('read', subject('Eixo', { id: e.id })))
})

export const eixosQueryOptions = () =>
  queryOptions({
    queryKey: ['eixos'],
    queryFn: () => listEixosFn(),
  })

export const createEixoFn = createServerFn({ method: 'POST' })
  .validator(z.object({ nome: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    if (ability.cannot('administrar', 'Eixo')) throw new Error('Sem permissão para cadastrar eixos.')
    return createEixo(eixoRepository, data.nome)
  })

export const updateEixoFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string(), nome: z.string().min(1), chefiaUserId: z.string().nullable() }))
  .handler(async ({ data }) => {
    const { ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    if (ability.cannot('administrar', 'Eixo')) throw new Error('Sem permissão para editar eixos.')
    return updateEixo(eixoRepository, data.id, { nome: data.nome, chefiaUserId: data.chefiaUserId })
  })
