import { date, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { prioridadeEnum, solicitacaoTipoEnum } from './enums'
import { entregas } from './entregas'

export const solicitacoes = pgTable('solicitacoes', {
  id: uuid('id').defaultRandom().primaryKey(),
  entregaId: uuid('entrega_id')
    .notNull()
    .references(() => entregas.id, { onDelete: 'cascade' }),
  tipo: solicitacaoTipoEnum('tipo').notNull(),
  descricao: text('descricao').notNull(),
  prazo: date('prazo'),
  prioridade: prioridadeEnum('prioridade').notNull().default('normal'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow().notNull(),
})
