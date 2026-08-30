import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createMongoAbility } from '@casl/ability'
import { defineAbilityFor, type AppAbility } from '~/lib/ability'
import { currentUserQueryOptions } from '~/server/api/auth.functions'
import { eixosQueryOptions } from '~/server/api/eixos.functions'
import { entregasQueryOptions } from '~/server/api/entregas.functions'

const EMPTY_ABILITY = createMongoAbility([]) as AppAbility

/** Deriva a mesma ability CASL usada no servidor — falha fechado (sem permissão nenhuma) enquanto carrega/deslogado. */
export function useAbility(): AppAbility {
  const { data: currentUser } = useQuery(currentUserQueryOptions())
  const { data: eixos = [] } = useQuery(eixosQueryOptions())
  const { data: entregas = [] } = useQuery(entregasQueryOptions())

  return useMemo(() => {
    if (!currentUser) return EMPTY_ABILITY
    const eixosChefiados = eixos.filter((e) => e.chefiaUserId === currentUser.id).map((e) => e.id)
    const planosComEntregaPropria =
      currentUser.perfil === 'operacional'
        ? [...new Set(entregas.filter((e) => e.responsavelUserId === currentUser.id).map((e) => e.planoId))]
        : []
    return defineAbilityFor(currentUser, { eixosChefiados, planosComEntregaPropria, entregasComDelegacao: [], planosComDelegacao: [] })
  }, [currentUser, eixos, entregas])
}
