import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ChevronLeft, Pencil } from 'lucide-react'
import { formatPrazo } from '~/lib/dates'
import { planoProgress, statusMeta } from '~/lib/domain'
import type { Plano } from '~/server/repository/plano.repository'
import { entregasQueryOptions } from '~/server/api/entregas.functions'
import { useUiStore } from '~/store/useUiStore'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'

export function PlanoBreadcrumb({ eixoId, plano }: { eixoId: string; plano: Plano }) {
  const navigate = useNavigate()
  const { data: entregas = [] } = useQuery(entregasQueryOptions(plano.id))
  const openPlanoModal = useUiStore((s) => s.openPlanoModal)
  const openEntregaModal = useUiStore((s) => s.openEntregaModal)
  const { total, percent } = planoProgress(plano, entregas)
  const sm = statusMeta(plano.status || 'planejado')
  const isPlanejado = (plano.status || 'planejado') === 'planejado'

  return (
    <div className="px-8">
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate({ to: '/app/eixos/$eixoId', params: { eixoId } })}
          className="flex items-center gap-1.5 text-[13px] font-medium text-primary"
        >
          <ChevronLeft className="size-3.5" />
          Planos
        </button>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm font-medium text-foreground">{plano.nome}</span>
        <Badge className={sm.badgeClass}>{sm.label}</Badge>
        <button type="button" onClick={() => openPlanoModal({ mode: 'edit', planoId: plano.id })} className="flex text-muted-foreground/70">
          <Pencil className="size-3.25" />
        </button>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground">
          {total > 0 ? `${percent}%` : '—'} concluído · prazo: {formatPrazo(plano.dataInicio, plano.dataFim)}
        </span>
        <Button variant="dashed" className="border-primary text-primary/80 hover:cursor-pointer hover:bg-accent hover:text-primary" onClick={() => openEntregaModal({ planoId: plano.id })}>
          + Nova entrega
        </Button>
      </div>

      {isPlanejado && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <AlertTriangle className="size-3.25 text-warning-foreground" />
          <span className="text-[11.5px] text-muted-foreground">Plano planejado: as tarefas podem ser criadas, mas ainda não podem ser executadas.</span>
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-1.5">
        <AlertTriangle className="size-3.25 text-destructive" />
        <span className="text-[11.5px] text-muted-foreground">Borda vermelha e ícone de alerta indicam entrega atrasada (início ou prazo vencido sem conclusão)</span>
      </div>
    </div>
  )
}
