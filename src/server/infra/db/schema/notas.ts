import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { notaTipoEnum } from './enums'
import { entregas } from './entregas'

export const notas = pgTable('notas', {
  id: uuid('id').defaultRandom().primaryKey(),
  entregaId: uuid('entrega_id')
    .notNull()
    .references(() => entregas.id, { onDelete: 'cascade' }),
  texto: text('texto').notNull(),
  /** Texto livre (nome de quem registrou) — ainda não é vínculo de usuário, igual ao front hoje. */
  autor: text('autor').notNull(),
  tipo: notaTipoEnum('tipo').notNull(),
  proximoPasso: text('proximo_passo'),
  anexoNome: text('anexo_nome'),
  editado: boolean('editado').notNull().default(false),
  /** Soft delete — preserva o registro para auditoria (Seção 8.2 do documento fonte). */
  excluido: boolean('excluido').notNull().default(false),
  dataHora: timestamp('data_hora', { withTimezone: true }).defaultNow().notNull(),
})
