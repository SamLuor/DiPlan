import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Paperclip } from 'lucide-react'
import { formatDateShort } from '~/lib/dates'
import { initials, isOverdue, priorityMeta } from '~/lib/domain'
import type { Entrega } from '~/server/repository/entrega.repository'
import { Badge } from '~/components/ui/badge'
import { cn } from '~/lib/utils'
import { usuariosQueryOptions } from '~/server/api/usuarios.functions'
import { useUiStore } from '~/store/useUiStore'

export function EntregaCard({ entrega }: { entrega: Entrega }) {
  const openDetail = useUiStore((s) => s.openDetail)
  const { data: usuarios = [] } = useQuery(usuariosQueryOptions())
  const responsavel = usuarios.find((u) => u.id === entrega.responsavelUserId)
  const overdue = isOverdue(entrega)
  const pm = priorityMeta(entrega.prioridade)

  return (
    <div
      draggable={entrega.situacao !== 'aguardando aprovação'}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', entrega.id)}
      onClick={() => openDetail(entrega.id)}
      className={cn('flex cursor-pointer flex-col gap-2 rounded-2xl bg-card p-4 shadow-[0_0_0_1px_var(--secondary)]', overdue && 'shadow-[0_0_0_1px_rgba(179,38,30,0.45)]')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[15px] leading-tight font-medium text-foreground">{entrega.titulo}</div>
        {entrega.anexosCount > 0 && <Paperclip className="mt-0.5 size-3.5 flex-none text-muted-foreground" />}
        {overdue && (
          <span title="Atrasada" className="mt-0.5 flex-none">
            <AlertTriangle className="size-3.5 text-destructive" />
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cn("text-[11px] font-normal", pm.badgeClass)}>{pm.label}</Badge>
        <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-normal', overdue ? 'bg-destructive/15 text-destructive font-semibold' : 'text-muted-foreground')}>
          {formatDateShort(entrega.dataPrevista)}
        </span>
      </div>
      {!!responsavel && (
        <div className="flex items-center gap-1.5">
          <div className="flex size-5 flex-none items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">{initials(responsavel.nome)}</div>
          <span className="truncate text-xs text-muted-foreground">{responsavel.nome}</span>
        </div>
      )}
    </div>
  )
}
