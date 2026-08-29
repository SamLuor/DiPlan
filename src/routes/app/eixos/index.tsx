import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { eixosQueryOptions } from '~/server/api/eixos.functions'

export const Route = createFileRoute('/app/eixos/')({
  component: EixosIndexPage,
})

function EixosIndexPage() {
  const navigate = useNavigate()
  const { data: eixos, isPending } = useQuery(eixosQueryOptions())
  const firstEixoId = eixos?.[0]?.id

  useEffect(() => {
    if (firstEixoId) {
      navigate({ to: '/app/eixos/$eixoId', params: { eixoId: firstEixoId }, replace: true })
    }
  }, [firstEixoId, navigate])

  if (isPending) return null

  return (
    <main className="flex flex-1 items-center justify-center rounded-3xl bg-muted">
      <div className="text-sm text-muted-foreground">Nenhum eixo cadastrado ainda. Crie um eixo para começar.</div>
    </main>
  )
}
