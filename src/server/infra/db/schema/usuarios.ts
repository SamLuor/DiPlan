import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { perfilEnum, userModoEnum } from './enums'
import { eixos } from './eixos'

export const usuarios = pgTable('usuarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  /** Nulo enquanto `modo = 'convite'` e a pessoa ainda não definiu senha própria. */
  senhaHash: text('senha_hash'),
  modo: userModoEnum('modo').notNull().default('senha'),
  /** Fail-closed: usuário novo começa sem privilégio nenhum até a Diretoria promover. */
  perfil: perfilEnum('perfil').notNull().default('operacional'),
  eixoId: uuid('eixo_id')
    .notNull()
    .references(() => eixos.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
