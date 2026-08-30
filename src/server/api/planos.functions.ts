import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { subject } from '@casl/ability'
import { z } from 'zod'
import { createPlano, getPlanosComStatusAtualizado, updatePlano } from '~/server/core/planos/plano.usecases'
import { requireActorWithAbility } from '~/server/core/auth/actor'
import { eixoRepository } from '~/server/repository/eixo.repository.drizzle'
import { entregaRepository } from '~/server/repository/entrega.repository.drizzle'
import { planoRepository } from '~/server/repository/plano.repository.drizzle'
import { usuarioRepository } from '~/server/repository/usuario.repository.drizzle'

const planoFormSchema = z.object({
  nome: z.string().min(1),
  eixoId: z.string().min(1),
  dataInicio: z.string().min(1),
  dataFim: z.string().min(1),
})

export const listPlanosFn = createServerFn({ method: 'GET' })
  .validator(z.object({ eixoId: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    const { ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    const planos = data?.eixoId ? await planoRepository.findByEixo(data.eixoId) : await planoRepository.findAll()
    const visiveis = planos.filter((p) => ability.can('read', subject('Plano', { id: p.id, eixoId: p.eixoId })))
    return getPlanosComStatusAtualizado(planoRepository, visiveis)
  })

export const planosQueryOptions = (eixoId?: string) =>
  queryOptions({
    queryKey: ['planos', eixoId ?? null],
    queryFn: () => listPlanosFn({ data: { eixoId } }),
  })

export const createPlanoFn = createServerFn({ method: 'POST' })
  .validator(planoFormSchema)
  .handler(async ({ data }) => {
    const { ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    if (ability.cannot('create', subject('Plano', { eixoId: data.eixoId }))) throw new Error('Sem permissão para criar plano.')
    return createPlano(planoRepository, data)
  })

export const updatePlanoFn = createServerFn({ method: 'POST' })
  .validator(planoFormSchema.extend({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    if (ability.cannot('update', subject('Plano', { eixoId: data.eixoId }))) throw new Error('Sem permissão para editar este plano.')
    const { id, ...rest } = data
    return updatePlano(planoRepository, id, rest)
  })
