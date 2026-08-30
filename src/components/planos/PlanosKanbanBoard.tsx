import { Plus } from 'lucide-react'
import { subject } from '@casl/ability'
import type { Plano, StatusPlano } from '~/server/repository/plano.repository'
import { PlanoCard } from './PlanoCard'
import { Button } from '~/components/ui/button'
import { useUiStore } from '~/store/useUiStore'
import { useAbility } from '~/hooks/useAbility'

const COLUMNS: Array<{ key: StatusPlano; label: string }> = [
  { key: 'planejado', label: 'Planejado' },
  { key: 'execucao', label: 'Execução' },
  { key: 'concluido', label: 'Concluído' },
]

export function PlanosKanbanBoard({ eixoId, planos }: { eixoId: string; planos: Plano[] }) {
  const openPlanoModal = useUiStore((s) => s.openPlanoModal)
  const ability = useAbility()
  // Client só esconde o botão — a checagem real (que não pode ser burlada) já está no servidor (createPlanoFn).
  const podeCriar = ability.can('create', subject('Plano', { eixoId }))

  return (
    <>
      <div className="px-8">
        <div className="mt-4.5 flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Planos</span>
          {podeCriar && (
            <Button variant="dashed" className="cursor-pointer border-primary text-primary hover:bg-accent hover:text-primary" onClick={() => openPlanoModal({ mode: 'create', eixoId })}>
              <Plus className="size-3" /> Novo plano
            </Button>
          )}
        </div>

        {planos.length === 0 && (
          <div className="mt-5 flex items-center justify-between gap-4 rounded-xl bg-card p-6">
            <div className="text-sm text-muted-foreground">Este eixo ainda não tem planos de entrega.</div>
            {podeCriar && (
              <Button variant="dashed" className="cursor-pointer border-primary text-primary hover:bg-accent hover:text-primary" onClick={() => openPlanoModal({ mode: 'create', eixoId })}>
                + Novo plano
              </Button>
            )}
          </div>
        )}
      </div>

      {planos.length > 0 && (
        <div className="flex flex-1 gap-5 overflow-auto px-8 pt-4.5 pb-7">
          {COLUMNS.map((col) => {
            const items = planos.filter((p) => (p.status || 'planejado') === col.key)
            return (
              <div key={col.key} className="flex min-w-70 flex-1 flex-col gap-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{col.label}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">{items.length}</span>
                </div>
                <div className="flex min-h-full flex-1 flex-col gap-2.5 overflow-y-auto pb-2 pt-2 px-1">
                  {items.map((p) => (
                    <PlanoCard key={p.id} plano={p} />
                  ))}
                  {items.length === 0 && <div className="p-0.5 text-sm text-muted-foreground/60">Nenhum plano</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
