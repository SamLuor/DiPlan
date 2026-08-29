import { eq } from 'drizzle-orm'
import { db } from '~/server/infra/db/client'
import { planos } from '~/server/infra/db/schema'
import type { Plano, PlanoRepository } from './plano.repository'

export const planoRepository: PlanoRepository = {
  async findAll() {
    return db.select().from(planos)
  },

  async findById(id) {
    const [row] = await db.select().from(planos).where(eq(planos.id, id)).limit(1)
    return row ?? null
  },

  async findByEixo(eixoId) {
    return db.select().from(planos).where(eq(planos.eixoId, eixoId))
  },

  async create(data) {
    const [row] = await db.insert(planos).values(data).returning()
    return row as Plano
  },

  async update(id, data) {
    const [row] = await db.update(planos).set({ ...data, updatedAt: new Date() }).where(eq(planos.id, id)).returning()
    return row ?? null
  },

  async updateStatus(id, status) {
    const [row] = await db.update(planos).set({ status, updatedAt: new Date() }).where(eq(planos.id, id)).returning()
    return row ?? null
  },
}
