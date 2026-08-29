import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { usuarios } from './usuarios'

export const passwordSetupTokens = pgTable('password_setup_tokens', {
  /** Token opaco (crypto.randomBytes), enviado por e-mail no link de definição de senha. */
  token: text('token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  /** Marca uso — token de uso único. */
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
