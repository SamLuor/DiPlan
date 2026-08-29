import { createMiddleware } from '@tanstack/react-start'
import { getRequestIP } from '@tanstack/react-start/server'

interface Bucket {
  count: number
  resetAt: number
}

// server functions sensíveis a brute-force / abuso de e-mail: limite bem mais apertado
// que o resto da navegação normal do app (que já refaz várias buscas a cada troca de rota).
const SENSITIVE_FN_NAMES = new Set(['loginFn', 'requestPasswordSetupFn', 'setPasswordFn'])

// Em memória, por processo — suficiente para uma ferramenta interna de instância única.
// Não sobrevive a restart nem é compartilhado entre múltiplas instâncias do servidor.
function createLimiter(max: number, windowMs: number) {
  const buckets = new Map<string, Bucket>()
  let checksSinceSweep = 0

  function sweepExpired(now: number) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key)
    }
  }

  return function check(key: string): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now()

    checksSinceSweep += 1
    if (checksSinceSweep >= 1000) {
      checksSinceSweep = 0
      sweepExpired(now)
    }

    const bucket = buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      return { allowed: true, retryAfterSeconds: 0 }
    }

    if (bucket.count >= max) {
      return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
    }

    bucket.count += 1
    return { allowed: true, retryAfterSeconds: 0 }
  }
}

export function rateLimitMiddleware(opts: {
  defaultMax: number
  defaultWindowMs: number
  sensitiveMax: number
  sensitiveWindowMs: number
}) {
  const checkDefault = createLimiter(opts.defaultMax, opts.defaultWindowMs)
  const checkSensitive = createLimiter(opts.sensitiveMax, opts.sensitiveWindowMs)

  return createMiddleware({ type: 'request' }).server(async ({ next, serverFnMeta }) => {
    const ip = getRequestIP({ xForwardedFor: true }) ?? 'unknown'
    const isSensitive = serverFnMeta ? SENSITIVE_FN_NAMES.has(serverFnMeta.name) : false
    const { allowed, retryAfterSeconds } = isSensitive ? checkSensitive(ip) : checkDefault(ip)

    if (!allowed) {
      return new Response('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSeconds) },
      })
    }

    return next()
  })
}
