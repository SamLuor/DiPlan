import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Entrega, SituacaoEntrega } from '~/server/repository/entrega.repository'
import { EntregaCard } from './EntregaCard'
import { moveEntregaToStatusFn } from '~/server/api/entregas.functions'

const COLUMNS: Array<{ key: SituacaoEntrega; label: string }> = [
  { key: 'aguardando', label: 'Aguardando início' },
  { key: 'andamento', label: 'Em andamento' },
  { key: 'concluida', label: 'Concluída' },
]

export function EntregasKanbanBoard({ entregas }: { entregas: Entrega[] }) {
  const queryClient = useQueryClient()

  const moveMutation = useMutation({
    mutationFn: (input: { id: string; status: SituacaoEntrega }) => moveEntregaToStatusFn({ data: input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entregas'] })
      queryClient.invalidateQueries({ queryKey: ['entrega', variables.id] })
    },
  })

  return (
    <div className="flex flex-1 gap-5 overflow-auto px-8 pt-5.5 pb-7">
      {COLUMNS.map((col) => {
        const items = entregas.filter((en) => en.situacao === col.key)
        return (
          <div key={col.key} className="flex min-w-70 flex-1 flex-col gap-3.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{col.label}</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">{items.length}</span>
            </div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                moveMutation.mutate({ id: e.dataTransfer.getData('text/plain'), status: col.key })
              }}
              className="flex min-h-full flex-1 flex-col gap-2.5 overflow-y-auto pb-2 px-1 pt-2"
            >
              {items.map((en) => (
                <EntregaCard key={en.id} entrega={en} />
              ))}
              {items.length === 0 && <div className="p-0.5 text-sm text-muted-foreground/60">Nenhuma entrega</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
