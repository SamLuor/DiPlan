import { markerMeta } from '~/lib/domain'
import type { CalendarDateEntry } from './types'

export interface AgendaDay {
  label: string
  items: CalendarDateEntry[]
}

export function AgendaList({ days, onItemClick }: { days: AgendaDay[]; onItemClick: (entregaId: string) => void }) {
  if (days.length === 0) {
    return <div className="pt-2 text-sm text-muted-foreground/70">Selecione um período válido.</div>
  }

  return (
    <div className="flex flex-col gap-4 pt-1">
      {days.map((day) => (
        <div key={day.label}>
          <div className="mb-2 text-[13px] font-semibold text-foreground">{day.label}</div>
          <div className="flex flex-col gap-2">
            {day.items.map(({ entrega, tipo }, idx) => {
              const meta = markerMeta(entrega)
              return (
                <div
                  key={`${entrega.id}-${idx}`}
                  onClick={() => onItemClick(entrega.id)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg bg-card px-3.5 py-2.5 shadow-[0_0_0_1px_var(--secondary)]"
                >
                  <span className={`size-2 flex-none rounded-full ${meta.dotClass}`} />
                  <span className="flex-1 text-[13px] font-medium text-foreground">{entrega.titulo}</span>
                  <span className="text-[11px] text-muted-foreground">{tipo}</span>
                </div>
              )
            })}
            {day.items.length === 0 && <div className="text-xs text-muted-foreground/60">Nenhuma entrega</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
