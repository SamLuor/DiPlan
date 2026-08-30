import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { createUsuario, updateUsuario } from '~/server/core/usuarios/usuario.usecases'
import { requireActorWithAbility } from '~/server/core/auth/actor'
import { eixoRepository } from '~/server/repository/eixo.repository.drizzle'
import { usuarioRepository } from '~/server/repository/usuario.repository.drizzle'
import { passwordSetupTokenRepository } from '~/server/repository/passwordSetupToken.repository.drizzle'

const usuarioFormSchema = z.object({
  nome: z.string().min(1),
  email: z.string().min(1),
  modo: z.enum(['senha', 'convite']),
  eixoId: z.string().min(1),
})

const perfilSchema = z.enum(['diretoria', 'chefia', 'operacional'])

export const listUsuariosFn = createServerFn({ method: 'GET' }).handler(async () => {
  return usuarioRepository.findAll()
})

export const usuariosQueryOptions = () =>
  queryOptions({
    queryKey: ['usuarios'],
    queryFn: () => listUsuariosFn(),
  })

export const createUsuarioFn = createServerFn({ method: 'POST' })
  .validator(usuarioFormSchema)
  .handler(async ({ data }) => {
    const { ability } = await requireActorWithAbility(usuarioRepository, eixoRepository)
    if (ability.cannot('administrar', 'Usuario')) throw new Error('Sem permissão para cadastrar usuários.')
    return createUsuario(usuarioRepository, passwordSetupTokenRepository, data)
  })

export const updateUsuarioFn = createServerFn({ method: 'POST' })
  .validator(usuarioFormSchema.extend({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { ability } = await requireActorWithAbility(usuarioRepository, eixoRepository)
    if (ability.cannot('administrar', 'Usuario')) throw new Error('Sem permissão para editar usuários.')
    const { id, ...rest } = data
    return updateUsuario(usuarioRepository, id, rest)
  })

/**
 * Endpoint dedicado — mudança de perfil é sensível o suficiente pra não ficar
 * dentro do `updateUsuarioFn` genérico (mais fácil de auditar/restringir depois).
 */
export const updateUsuarioPerfilFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1), perfil: perfilSchema }))
  .handler(async ({ data }) => {
    const { ability } = await requireActorWithAbility(usuarioRepository, eixoRepository)
    if (ability.cannot('administrar', 'Usuario')) throw new Error('Sem permissão para alterar perfis.')
    const updated = await usuarioRepository.updatePerfil(data.id, data.perfil)
    if (!updated) throw new Error('Usuário não encontrado.')
    return updated
  })
