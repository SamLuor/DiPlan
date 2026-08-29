import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { currentUser, login, logout, requestPasswordSetup, setPassword, validateSetupToken } from '~/server/core/auth/auth.usecases'
import { usuarioRepository } from '~/server/repository/usuario.repository.drizzle'
import { passwordSetupTokenRepository } from '~/server/repository/passwordSetupToken.repository.drizzle'

export const loginFn = createServerFn({ method: 'POST' })
  .validator(z.object({ email: z.string().min(1), senha: z.string().min(1) }))
  .handler(async ({ data }) => {
    return login(usuarioRepository, data.email, data.senha)
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  await logout()
})

export const getCurrentUserFn = createServerFn({ method: 'GET' }).handler(async () => {
  return currentUser(usuarioRepository)
})

export const currentUserQueryOptions = () =>
  queryOptions({
    queryKey: ['auth', 'currentUser'],
    queryFn: () => getCurrentUserFn(),
  })

export const requestPasswordSetupFn = createServerFn({ method: 'POST' })
  .validator(z.object({ email: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requestPasswordSetup(usuarioRepository, passwordSetupTokenRepository, data.email)
    return { ok: true }
  })

export const validateSetupTokenFn = createServerFn({ method: 'GET' })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }) => {
    const valid = await validateSetupToken(passwordSetupTokenRepository, data.token)
    return { valid }
  })

export const setPasswordFn = createServerFn({ method: 'POST' })
  .validator(z.object({ token: z.string().min(1), senha: z.string().min(1) }))
  .handler(async ({ data }) => {
    await setPassword(usuarioRepository, passwordSetupTokenRepository, data.token, data.senha)
    return { ok: true }
  })
