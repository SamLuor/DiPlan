import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { notaTipoEnum } from './enums'
import { entregas } from './entregas'
import { usuarios } from './usuarios'

export const notas = pgTable('notas', {
  id: uuid('id').defaultRandom().primaryKey(),
  entregaId: uuid('entrega_id')
    .notNull()
    .references(() => entregas.id, { onDelete: 'cascade' }),
  texto: text('texto').notNull(),
  /** Nome exibido — denormalizado, sobrevive mesmo se o usuário for removido depois. */
  autor: text('autor').notNull(),
  /** Vínculo real do autor, nulo pra registros automáticos do sistema (autor='Sistema'). */
  autorUserId: uuid('autor_user_id').references(() => usuarios.id, { onDelete: 'set null' }),
  tipo: notaTipoEnum('tipo').notNull(),
  proximoPasso: text('proximo_passo'),
  editado: boolean('editado').notNull().default(false),
  /** Soft delete — preserva o registro para auditoria (Seção 8.2 do documento fonte). */
  excluido: boolean('excluido').notNull().default(false),
  dataHora: timestamp('data_hora', { withTimezone: true }).defaultNow().notNull(),
})
