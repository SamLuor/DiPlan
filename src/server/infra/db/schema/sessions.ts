import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { usuarios } from './usuarios'

export const sessions = pgTable('sessions', {
  /** Token opaco (gerado com crypto.randomBytes), guardado também no cookie do cliente. */
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
