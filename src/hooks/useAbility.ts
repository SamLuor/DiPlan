import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createMongoAbility } from '@casl/ability'
import { defineAbilityFor, type AppAbility } from '~/lib/ability'
import { currentUserQueryOptions } from '~/server/api/auth.functions'
import { eixosQueryOptions } from '~/server/api/eixos.functions'

const EMPTY_ABILITY = createMongoAbility([]) as AppAbility

/** Deriva a mesma ability CASL usada no servidor — falha fechado (sem permissão nenhuma) enquanto carrega/deslogado. */
export function useAbility(): AppAbility {
  const { data: currentUser } = useQuery(currentUserQueryOptions())
  const { data: eixos = [] } = useQuery(eixosQueryOptions())

  return useMemo(() => {
    if (!currentUser) return EMPTY_ABILITY
    const eixosChefiados = eixos.filter((e) => e.chefiaUserId === currentUser.id).map((e) => e.id)
    return defineAbilityFor(currentUser, { eixosChefiados })
  }, [currentUser, eixos])
}
