import { date, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { prioridadeEnum, situacaoEntregaEnum } from './enums'
import { planos } from './planos'
import { usuarios } from './usuarios'

export const entregas = pgTable('entregas', {
  id: uuid('id').defaultRandom().primaryKey(),
  titulo: text('titulo').notNull(),
  descricao: text('descricao').notNull().default(''),
  planoId: uuid('plano_id')
    .notNull()
    .references(() => planos.id, { onDelete: 'cascade' }),
  dataInicio: date('data_inicio'),
  dataPrevista: date('data_prevista'),
  prioridade: prioridadeEnum('prioridade').notNull().default('normal'),
  responsavelUserId: uuid('responsavel_user_id').references(() => usuarios.id, { onDelete: 'set null' }),
  situacao: situacaoEntregaEnum('situacao').notNull().default('aguardando'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
