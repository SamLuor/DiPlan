import { currentUser } from '~/server/core/auth/auth.usecases'
import { defineAbilityFor, type AppAbility } from '~/lib/ability'
import type { EixoRepository } from '~/server/repository/eixo.repository'
import type { UsuarioRepository } from '~/server/repository/usuario.repository'

export interface Actor {
  id: string
  email: string
}

export interface ActorWithAbility {
  actor: Actor
  ability: AppAbility
}

/**
 * Substitui o `requireActor()` duplicado em cada `*.functions.ts` — além de exigir sessão,
 * já monta a ability CASL do usuário (resolve eixosChefiados via `eixos.chefiaUserId`,
 * mesma lógica de `isChefiaAtual`).
 */
export async function requireActorWithAbility(usuarioRepo: UsuarioRepository, eixoRepo: EixoRepository): Promise<ActorWithAbility> {
  const usuario = await currentUser(usuarioRepo)
  if (!usuario) throw new Error('Não autenticado.')
  const eixos = await eixoRepo.findAll()
  const eixosChefiados = eixos.filter((e) => e.chefiaUserId === usuario.id).map((e) => e.id)
  const ability = defineAbilityFor(usuario, { eixosChefiados })
  return { actor: { id: usuario.id, email: usuario.email }, ability }
}
