import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET precisa ter pelo menos 16 caracteres'),
  APP_URL: z.string().min(1).default('http://localhost:3000'),
  /** Sem isso, o mailer cai no fallback de log no console (ver infra/email/mailer.server.ts). */
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().default('onboarding@resend.dev'),
  AWS_REGION: z.string().min(1, 'AWS_REGION é obrigatório'),
  S3_BUCKET_NAME: z.string().min(1, 'S3_BUCKET_NAME é obrigatório'),
})

function loadEnv() {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`)
  }
  return parsed.data
}

export const env = loadEnv()
