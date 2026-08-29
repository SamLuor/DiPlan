import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { createUsuario, updateUsuario } from '~/server/core/usuarios/usuario.usecases'
import { usuarioRepository } from '~/server/repository/usuario.repository.drizzle'
import { passwordSetupTokenRepository } from '~/server/repository/passwordSetupToken.repository.drizzle'

const usuarioFormSchema = z.object({
  nome: z.string().min(1),
  email: z.string().min(1),
  modo: z.enum(['senha', 'convite']),
  eixoId: z.string().min(1),
})

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
    return createUsuario(usuarioRepository, passwordSetupTokenRepository, data)
  })

export const updateUsuarioFn = createServerFn({ method: 'POST' })
  .validator(usuarioFormSchema.extend({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { id, ...rest } = data
    return updateUsuario(usuarioRepository, id, rest)
  })
