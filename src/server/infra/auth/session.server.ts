import { randomBytes } from 'node:crypto'
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '~/server/infra/db/client'
import { sessions } from '~/server/infra/db/schema'
import { env } from '~/server/infra/config/env.server'

const COOKIE_NAME = 'ge_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 dias

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await db.insert(sessions).values({ id: token, userId, expiresAt })
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    // Depende do protocolo real servido, não de NODE_ENV — um `secure: true` fixo em produção
    // quebra login silenciosamente sempre que o acesso ainda é por http:// (ex.: só IP, sem
    // domínio/TLS configurado ainda), porque o navegador descarta cookie Secure fora de HTTPS.
    secure: env.APP_URL.startsWith('https://'),
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export async function getSessionUserId(): Promise<string | null> {
  const token = getCookie(COOKIE_NAME)
  if (!token) return null
  const [session] = await db.select().from(sessions).where(eq(sessions.id, token)).limit(1)
  if (!session || session.expiresAt < new Date()) return null
  return session.userId
}

export async function destroySession(): Promise<void> {
  const token = getCookie(COOKIE_NAME)
  if (token) await db.delete(sessions).where(eq(sessions.id, token))
  deleteCookie(COOKIE_NAME, { path: '/' })
}
