import { createStart } from '@tanstack/react-start'
import { rateLimitMiddleware } from '~/server/infra/rateLimit/rateLimit.middleware'

export const startInstance = createStart(() => ({
  requestMiddleware: [
    rateLimitMiddleware({
      defaultMax: 300,
      defaultWindowMs: 60_000,
      sensitiveMax: 30,
      sensitiveWindowMs: 60_000,
    }),
  ],
}))
