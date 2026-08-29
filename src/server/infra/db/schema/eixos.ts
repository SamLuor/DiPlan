import { pgTable, text, timestamp, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core'
import { usuarios } from './usuarios'

export const eixos = pgTable('eixos', {
  id: uuid('id').defaultRandom().primaryKey(),
  nome: text('nome').notNull(),
  chefiaUserId: uuid('chefia_user_id').references((): AnyPgColumn => usuarios.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
