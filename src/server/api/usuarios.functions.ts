import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { createUsuario, updateUsuario, updateUsuarioPerfil } from '~/server/core/usuarios/usuario.usecases'
import { requireActorWithAbility } from '~/server/core/auth/actor'
import { eixoRepository } from '~/server/repository/eixo.repository.drizzle'
import { entregaRepository } from '~/server/repository/entrega.repository.drizzle'
import { usuarioRepository } from '~/server/repository/usuario.repository.drizzle'
import { passwordSetupTokenRepository } from '~/server/repository/passwordSetupToken.repository.drizzle'

const perfilSchema = z.enum(['diretoria', 'chefia', 'operacional'])

const usuarioFormSchema = z.object({
  nome: z.string().min(1),
  email: z.string().min(1),
  modo: z.enum(['senha', 'convite']),
  perfil: perfilSchema,
  eixoId: z.string().nullable(),
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
    const { ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    if (ability.cannot('administrar', 'Usuario')) throw new Error('Sem permissão para cadastrar usuários.')
    return createUsuario(usuarioRepository, eixoRepository, passwordSetupTokenRepository, data)
  })

export const updateUsuarioFn = createServerFn({ method: 'POST' })
  .validator(usuarioFormSchema.extend({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    if (ability.cannot('administrar', 'Usuario')) throw new Error('Sem permissão para editar usuários.')
    const { id, ...rest } = data
    return updateUsuario(usuarioRepository, eixoRepository, id, rest)
  })

/**
 * Endpoint dedicado — pensado pra tela de Permissões, que só edita o perfil sem
 * abrir o formulário inteiro do usuário. Reaproveita a mesma sincronização de
 * chefia usada pelo create/update genérico.
 */
export const updateUsuarioPerfilFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1), perfil: perfilSchema }))
  .handler(async ({ data }) => {
    const { ability } = await requireActorWithAbility(usuarioRepository, eixoRepository, entregaRepository)
    if (ability.cannot('administrar', 'Usuario')) throw new Error('Sem permissão para alterar perfis.')
    return updateUsuarioPerfil(usuarioRepository, eixoRepository, data.id, data.perfil)
  })
