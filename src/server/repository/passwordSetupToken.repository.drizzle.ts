import { eq } from 'drizzle-orm'
import { db } from '~/server/infra/db/client'
import { passwordSetupTokens } from '~/server/infra/db/schema'
import type { PasswordSetupTokenRepository } from './passwordSetupToken.repository'

export const passwordSetupTokenRepository: PasswordSetupTokenRepository = {
  async create(data) {
    const [row] = await db.insert(passwordSetupTokens).values(data).returning()
    return row!
  },

  async findValid(token) {
    const [row] = await db.select().from(passwordSetupTokens).where(eq(passwordSetupTokens.token, token)).limit(1)
    if (!row) return null
    if (row.usedAt) return null
    if (row.expiresAt < new Date()) return null
    return row
  },

  async markUsed(token) {
    await db.update(passwordSetupTokens).set({ usedAt: new Date() }).where(eq(passwordSetupTokens.token, token))
  },
}
