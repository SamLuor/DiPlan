import { requestPasswordSetup } from '~/server/core/auth/auth.usecases'
import type { NovoUsuarioInput, Usuario, UsuarioRepository, UserModo } from '~/server/repository/usuario.repository'
import type { PasswordSetupTokenRepository } from '~/server/repository/passwordSetupToken.repository'

export interface UsuarioFormInput {
  nome: string
  email: string
  modo: UserModo
  eixoId: string
}

/**
 * A senha nunca é digitada no formulário — quem define é o próprio usuário,
 * via e-mail com link de definição de senha (mesmo mecanismo usado em
 * "esqueci minha senha", `requestPasswordSetup`).
 */
export async function createUsuario(
  repo: UsuarioRepository,
  tokenRepo: PasswordSetupTokenRepository,
  input: UsuarioFormInput,
): Promise<Usuario> {
  const nome = input.nome.trim()
  const email = input.email.trim().toLowerCase()
  if (!nome || !email || !input.eixoId) throw new Error('Nome, e-mail e eixo são obrigatórios.')

  const data: NovoUsuarioInput = { nome, email, modo: input.modo, senhaHash: null, eixoId: input.eixoId }
  const usuario = await repo.create(data)
  await requestPasswordSetup(repo, tokenRepo, email)
  return usuario
}

export async function updateUsuario(repo: UsuarioRepository, id: string, input: UsuarioFormInput): Promise<Usuario> {
  const nome = input.nome.trim()
  const email = input.email.trim().toLowerCase()
  if (!nome || !email || !input.eixoId) throw new Error('Nome, e-mail e eixo são obrigatórios.')

  // Editar nunca mexe na senha — quem troca é o próprio usuário via "esqueci minha senha".
  // Busca por id (não por e-mail): trocar o e-mail no formulário não pode apagar a senha atual.
  const existente = await repo.findByIdForAuth(id)
  const senhaHash = existente?.senhaHash ?? null

  const data: NovoUsuarioInput = { nome, email, modo: input.modo, senhaHash, eixoId: input.eixoId }
  const updated = await repo.update(id, data)
  if (!updated) throw new Error('Usuário não encontrado.')
  return updated
}
