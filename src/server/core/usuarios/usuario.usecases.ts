import { requestPasswordSetup } from '~/server/core/auth/auth.usecases'
import type { EixoRepository } from '~/server/repository/eixo.repository'
import type { NovoUsuarioInput, Perfil, Usuario, UsuarioRepository, UserModo } from '~/server/repository/usuario.repository'
import type { PasswordSetupTokenRepository } from '~/server/repository/passwordSetupToken.repository'

export interface UsuarioFormInput {
  nome: string
  email: string
  modo: UserModo
  perfil: Perfil
  eixoId: string | null
}

/**
 * Chefia é só de um eixo (o próprio eixo do usuário) — sincroniza `eixos.chefiaUserId`
 * com `usuarios.perfil` sempre que um dos dois muda, ao invés de deixar isso só
 * editável na tela do eixo. Remove de qualquer outro eixo onde o usuário ainda
 * conste como chefia (não pode ser chefia de mais de um).
 */
async function sincronizarChefia(eixoRepo: EixoRepository, usuario: Usuario) {
  const eixos = await eixoRepo.findAll()
  const ondeEChefiaAtual = eixos.filter((e) => e.chefiaUserId === usuario.id)

  if (usuario.perfil === 'chefia' && usuario.eixoId) {
    for (const e of ondeEChefiaAtual) {
      if (e.id !== usuario.eixoId) await eixoRepo.update(e.id, { nome: e.nome, chefiaUserId: null })
    }
    const proprioEixo = eixos.find((e) => e.id === usuario.eixoId)
    if (proprioEixo && proprioEixo.chefiaUserId !== usuario.id) {
      await eixoRepo.update(proprioEixo.id, { nome: proprioEixo.nome, chefiaUserId: usuario.id })
    }
  } else {
    for (const e of ondeEChefiaAtual) {
      await eixoRepo.update(e.id, { nome: e.nome, chefiaUserId: null })
    }
  }
}

/**
 * A senha nunca é digitada no formulário — quem define é o próprio usuário,
 * via e-mail com link de definição de senha (mesmo mecanismo usado em
 * "esqueci minha senha", `requestPasswordSetup`).
 */
export async function createUsuario(
  repo: UsuarioRepository,
  eixoRepo: EixoRepository,
  tokenRepo: PasswordSetupTokenRepository,
  input: UsuarioFormInput,
): Promise<Usuario> {
  const nome = input.nome.trim()
  const email = input.email.trim().toLowerCase()
  if (!nome || !email) throw new Error('Nome e e-mail são obrigatórios.')
  if (input.perfil !== 'diretoria' && !input.eixoId) throw new Error('Eixo é obrigatório para Chefia e Operacional.')

  const data: NovoUsuarioInput = { nome, email, modo: input.modo, senhaHash: null, perfil: input.perfil, eixoId: input.eixoId }
  const usuario = await repo.create(data)
  await sincronizarChefia(eixoRepo, usuario)
  await requestPasswordSetup(repo, tokenRepo, email)
  return usuario
}

export async function updateUsuario(repo: UsuarioRepository, eixoRepo: EixoRepository, id: string, input: UsuarioFormInput): Promise<Usuario> {
  const nome = input.nome.trim()
  const email = input.email.trim().toLowerCase()
  if (!nome || !email) throw new Error('Nome e e-mail são obrigatórios.')
  if (input.perfil !== 'diretoria' && !input.eixoId) throw new Error('Eixo é obrigatório para Chefia e Operacional.')

  // Editar nunca mexe na senha — quem troca é o próprio usuário via "esqueci minha senha".
  // Busca por id (não por e-mail): trocar o e-mail no formulário não pode apagar a senha atual.
  const existente = await repo.findByIdForAuth(id)
  const senhaHash = existente?.senhaHash ?? null

  const data: NovoUsuarioInput = { nome, email, modo: input.modo, senhaHash, perfil: input.perfil, eixoId: input.eixoId }
  const updated = await repo.update(id, data)
  if (!updated) throw new Error('Usuário não encontrado.')
  await sincronizarChefia(eixoRepo, updated)
  return updated
}

export async function updateUsuarioPerfil(repo: UsuarioRepository, eixoRepo: EixoRepository, id: string, perfil: Perfil): Promise<Usuario> {
  const updated = await repo.updatePerfil(id, perfil)
  if (!updated) throw new Error('Usuário não encontrado.')
  await sincronizarChefia(eixoRepo, updated)
  return updated
}
