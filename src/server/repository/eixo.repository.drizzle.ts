import { eq } from 'drizzle-orm'
import { db } from '~/server/infra/db/client'
import { eixos } from '~/server/infra/db/schema'
import type { Eixo, EixoRepository } from './eixo.repository'

export const eixoRepository: EixoRepository = {
  async findAll() {
    return db.select().from(eixos).orderBy(eixos.nome)
  },

  async findById(id) {
    const [row] = await db.select().from(eixos).where(eq(eixos.id, id)).limit(1)
    return row ?? null
  },

  async create(data) {
    const [row] = await db.insert(eixos).values({ nome: data.nome }).returning()
    return row as Eixo
  },

  async update(id, data) {
    const [row] = await db
      .update(eixos)
      .set({ nome: data.nome, chefiaUserId: data.chefiaUserId, updatedAt: new Date() })
      .where(eq(eixos.id, id))
      .returning()
    return row ?? null
  },
}
