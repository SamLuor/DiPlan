export interface PasswordSetupToken {
  token: string
  userId: string
  expiresAt: Date
  usedAt: Date | null
}

export interface PasswordSetupTokenRepository {
  create(data: { token: string; userId: string; expiresAt: Date }): Promise<PasswordSetupToken>
  /** Só retorna se existir, não estiver expirado e não tiver sido usado ainda. */
  findValid(token: string): Promise<PasswordSetupToken | null>
  markUsed(token: string): Promise<void>
}
