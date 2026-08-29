import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { PlanoBreadcrumb } from '~/components/planos/PlanoBreadcrumb'
import { EntregasKanbanBoard } from '~/components/entregas/EntregasKanbanBoard'
import { eixosQueryOptions } from '~/server/api/eixos.functions'
import { planosQueryOptions } from '~/server/api/planos.functions'
import { entregasQueryOptions } from '~/server/api/entregas.functions'

export const Route = createFileRoute('/app/eixos/$eixoId/planos/$planoId')({
  component: PlanoEntregasPage,
})

function PlanoEntregasPage() {
  const { eixoId, planoId } = Route.useParams()
  const { data: planos = [] } = useQuery(planosQueryOptions())
  const plano = planos.find((p) => p.id === planoId)
  const { data: entregas = [] } = useQuery(entregasQueryOptions(planoId))
  const { data: eixos = [] } = useQuery(eixosQueryOptions())
  const eixo = eixos.find((e) => e.id === eixoId)

  if (!plano) {
    return (
      <main className="flex flex-1 items-center justify-center rounded-3xl bg-muted/40">
        <div className="text-sm text-muted-foreground">Plano não encontrado.</div>
      </main>
    )
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden rounded-3xl bg-gray-50">
      <div className="px-8 pt-6.5">
        <h2 className="text-[25px] font-medium tracking-tight text-foreground">{eixo ? eixo.nome : 'Selecione um eixo'}</h2>
      </div>
      <PlanoBreadcrumb eixoId={eixoId} plano={plano} />
      <EntregasKanbanBoard entregas={entregas} />
    </main>
  )
}
