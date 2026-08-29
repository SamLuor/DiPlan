import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { entregas } from './entregas'

export const anexos = pgTable('anexos', {
  id: uuid('id').defaultRandom().primaryKey(),
  entregaId: uuid('entrega_id')
    .notNull()
    .references(() => entregas.id, { onDelete: 'cascade' }),
  /** Nome original do arquivo, só para exibição — nunca usado para montar o `key` do S3. */
  nome: text('nome').notNull(),
  /** Chave do objeto no S3 (gerada com uuid, ver `infra/storage/s3.server.ts`). Sem versionamento ainda. */
  key: text('key').notNull(),
  contentType: text('content_type').notNull(),
  tamanho: integer('tamanho').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
