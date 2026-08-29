import { boolean, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core'
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
    respondeu: boolean('respondeu').notNull().default(false),
    respondidoEm: timestamp('respondido_em', { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.solicitacaoId, table.userId] })],
)
