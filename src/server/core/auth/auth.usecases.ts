import { randomBytes } from 'node:crypto'
// Exceção deliberada à regra "core não importa infra": hashing de senha,
// cookie de sessão e envio de e-mail são primitivas amarradas ao request
// HTTP/infra externa, não regra de negócio — não compensa esconder isso
// atrás de uma interface aqui.
import { hashPassword, verifyPassword } from '~/server/infra/auth/password.server'
import { createSession, destroySession, getSessionUserId } from '~/server/infra/auth/session.server'
import { env } from '~/server/infra/config/env.server'
import { sendPasswordSetupEmail } from '~/server/infra/email/mailer.server'
import type { Usuario, UsuarioRepository } from '~/server/repository/usuario.repository'
import type { PasswordSetupTokenRepository } from '~/server/repository/passwordSetupToken.repository'

export class InvalidCredentialsError extends Error {
  constructor() {
    super('E-mail ou senha inválidos.')
  }
}

/**
 * Login simples, sem diferenciação de perfil — decisão de escopo registrada em
 * `domain-info/domain-system.md` Seção 2 (RBAC completo fica para depois).
 */
export async function login(repo: UsuarioRepository, email: string, senha: string): Promise<Usuario> {
  const usuario = await repo.findByEmailForAuth(email)
  if (!usuario || !usuario.senhaHash) throw new InvalidCredentialsError()
  const ok = await verifyPassword(usuario.senhaHash, senha)
  if (!ok) throw new InvalidCredentialsError()
  await createSession(usuario.id)
  const { senhaHash: _senhaHash, ...publico } = usuario
  return publico
}

export async function logout(): Promise<void> {
  await destroySession()
}

export async function currentUser(repo: UsuarioRepository): Promise<Usuario | null> {
  const userId = await getSessionUserId()
  if (!userId) return null
  return repo.findById(userId)
}

const PASSWORD_SETUP_TTL_MS = 1000 * 60 * 60 * 24 * 2 // 2 dias

/**
 * Gera um token de definição de senha e envia por e-mail — usada tanto para
 * o convite de um usuário recém-cadastrado (`modo: 'convite'`) quanto para o
 * fluxo de "esqueci minha senha". Silenciosa se o e-mail não existir (não
 * revela se um e-mail está cadastrado).
 */
export async function requestPasswordSetup(
  usuarioRepo: UsuarioRepository,
  tokenRepo: PasswordSetupTokenRepository,
  email: string,
): Promise<void> {
  const usuario = await usuarioRepo.findByEmailForAuth(email.trim().toLowerCase())
  if (!usuario) return

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + PASSWORD_SETUP_TTL_MS)
  await tokenRepo.create({ token, userId: usuario.id, expiresAt })

  const link = `${env.APP_URL}/redefinir-senha?token=${token}`
  await sendPasswordSetupEmail({ to: usuario.email, nome: usuario.nome, link })
}

export async function validateSetupToken(tokenRepo: PasswordSetupTokenRepository, token: string): Promise<boolean> {
  const valid = await tokenRepo.findValid(token)
  return !!valid
}

export class InvalidTokenError extends Error {
  constructor() {
    super('Link inválido ou expirado.')
  }
}

export async function setPassword(
  usuarioRepo: UsuarioRepository,
  tokenRepo: PasswordSetupTokenRepository,
  token: string,
  novaSenha: string,
): Promise<void> {
  const valid = await tokenRepo.findValid(token)
  if (!valid) throw new InvalidTokenError()
  if (!novaSenha || novaSenha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.')

  const usuario = await usuarioRepo.findById(valid.userId)
  if (!usuario) throw new InvalidTokenError()

  const senhaHash = await hashPassword(novaSenha)
  await usuarioRepo.update(usuario.id, { nome: usuario.nome, email: usuario.email, modo: usuario.modo, senhaHash, eixoId: usuario.eixoId })
  await tokenRepo.markUsed(token)
}
