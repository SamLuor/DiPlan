import { date, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { statusPlanoEnum } from './enums'
import { eixos } from './eixos'

export const planos = pgTable('planos', {
  id: uuid('id').defaultRandom().primaryKey(),
  nome: text('nome').notNull(),
  eixoId: uuid('eixo_id')
    .notNull()
    .references(() => eixos.id, { onDelete: 'cascade' }),
  status: statusPlanoEnum('status').notNull().default('planejado'),
  dataInicio: date('data_inicio').notNull(),
  dataFim: date('data_fim').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
