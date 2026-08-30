import { currentUser } from '~/server/core/auth/auth.usecases'
import { defineAbilityFor, type AppAbility } from '~/lib/ability'
import type { EixoRepository } from '~/server/repository/eixo.repository'
import type { EntregaRepository } from '~/server/repository/entrega.repository'
import type { Perfil, UsuarioRepository } from '~/server/repository/usuario.repository'

export interface Actor {
  id: string
  email: string
  perfil: Perfil
}

export interface ActorWithAbility {
  actor: Actor
  ability: AppAbility
}

/**
 * Substitui o `requireActor()` duplicado em cada `*.functions.ts` — além de exigir sessão,
 * já monta a ability CASL do usuário: resolve eixosChefiados via `eixos.chefiaUserId` (mesma
 * lógica de `isChefiaAtual`) e, pra Operacional, os planos onde ele tem entrega própria
 * (necessário pra decidir quais planos ele pode ver — matriz não cobre isso por campo direto).
 */
export async function requireActorWithAbility(
  usuarioRepo: UsuarioRepository,
  eixoRepo: EixoRepository,
  entregaRepo: EntregaRepository,
): Promise<ActorWithAbility> {
  const usuario = await currentUser(usuarioRepo)
  if (!usuario) throw new Error('Não autenticado.')

  const eixos = await eixoRepo.findAll()
  const eixosChefiados = eixos.filter((e) => e.chefiaUserId === usuario.id).map((e) => e.id)

  let planosComEntregaPropria: string[] = []
  if (usuario.perfil === 'operacional') {
    const entregas = await entregaRepo.findAll()
    planosComEntregaPropria = [...new Set(entregas.filter((e) => e.responsavelUserId === usuario.id).map((e) => e.planoId))]
  }

  const ability = defineAbilityFor(usuario, { eixosChefiados, planosComEntregaPropria })
  return { actor: { id: usuario.id, email: usuario.email, perfil: usuario.perfil }, ability }
}
