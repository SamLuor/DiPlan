import { pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core'
import { delegacaoStatusEnum } from './enums'
import { solicitacoes } from './solicitacoes'
import { usuarios } from './usuarios'

export const solicitacaoResponsaveis = pgTable(
  'solicitacao_responsaveis',
  {
    solicitacaoId: uuid('solicitacao_id')
      .notNull()
      .references(() => solicitacoes.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    status: delegacaoStatusEnum('status').notNull().default('aguardando'),
    iniciadoEm: timestamp('iniciado_em', { withTimezone: true }),
    concluidoEm: timestamp('concluido_em', { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.solicitacaoId, table.userId] })],
)
