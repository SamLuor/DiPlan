import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { formatPrazo } from '~/lib/dates'
import { planoProgress } from '~/lib/domain'
import type { Plano } from '~/server/repository/plano.repository'
import { entregasQueryOptions } from '~/server/api/entregas.functions'
import { useUiStore } from '~/store/useUiStore'

export function PlanoCard({ plano }: { plano: Plano }) {
  const navigate = useNavigate()
  const { data: entregas = [] } = useQuery(entregasQueryOptions(plano.id))
  const openPlanoModal = useUiStore((s) => s.openPlanoModal)
  const { total, percent } = planoProgress(plano, entregas)

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', plano.id)}
      onClick={() => navigate({ to: '/app/eixos/$eixoId/planos/$planoId', params: { eixoId: plano.eixoId, planoId: plano.id } })}
      className="flex cursor-pointer flex-col gap-2 rounded-2xl bg-card p-4 shadow-[0_0_0_1px_var(--secondary)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[15px] leading-tight font-medium text-foreground">{plano.nome}</div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            openPlanoModal({ mode: 'edit', planoId: plano.id })
          }}
          className="flex flex-none text-muted-foreground"
        >
          <Pencil className="size-3" />
        </button>
      </div>
      <div className="text-xs text-muted-foreground">prazo: {formatPrazo(plano.dataInicio, plano.dataFim)}</div>
      <div className="flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
          <div className={percent === 100 ? 'h-full rounded-full bg-accent-foreground' : 'h-full rounded-full bg-primary'} style={{ width: `${percent}%` }} />
        </div>
        <span className="flex-none text-xs text-muted-foreground">{total > 0 ? `${percent}%` : '—'}</span>
      </div>
      <div className="text-[11.5px] text-muted-foreground">
        {total} {total === 1 ? 'entrega' : 'entregas'}
      </div>
    </div>
  )
}
