import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { PlanosKanbanBoard } from '~/components/planos/PlanosKanbanBoard'
import { eixosQueryOptions } from '~/server/api/eixos.functions'
import { planosQueryOptions } from '~/server/api/planos.functions'

export const Route = createFileRoute('/app/eixos/$eixoId/')({
  component: EixoPlanosPage,
})

function EixoPlanosPage() {
  const { eixoId } = Route.useParams()
  const { data: eixos = [] } = useQuery(eixosQueryOptions())
  const eixo = eixos.find((e) => e.id === eixoId)
  const { data: planos = [] } = useQuery(planosQueryOptions(eixoId))

  return (
    <main className="flex flex-1 flex-col overflow-hidden rounded-3xl bg-gray-50">
      <div className="px-8 pt-6.5">
        <h2 className="text-[25px] font-medium tracking-tight text-foreground">{eixo ? eixo.nome : 'Selecione um eixo'}</h2>
      </div>
      <PlanosKanbanBoard eixoId={eixoId} planos={planos} />
    </main>
  )
}
