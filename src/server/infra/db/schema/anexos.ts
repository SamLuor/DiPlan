import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { entregas } from './entregas'

export const anexos = pgTable('anexos', {
  id: uuid('id').defaultRandom().primaryKey(),
  entregaId: uuid('entrega_id')
    .notNull()
    .references(() => entregas.id, { onDelete: 'cascade' }),
  /** Só o metadado do nome por enquanto — sem upload/armazenamento real nem versionamento. */
  nome: text('nome').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
