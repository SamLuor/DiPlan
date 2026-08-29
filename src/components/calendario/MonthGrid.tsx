import { addDays, isoFromDate, startOfWeek, todayIso, weekdayShort } from '~/lib/dates'
import { markerMeta } from '~/lib/domain'
import { cn } from '~/lib/utils'
import type { CalendarDateMap } from './types'

export function MonthGrid({ refDate, dateMap, onItemClick }: { refDate: Date; dateMap: CalendarDateMap; onItemClick: (entregaId: string) => void }) {
  const monthStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1)
  const gridStart = startOfWeek(monthStart)
  const today = todayIso()

  const days = Array.from({ length: 42 }, (_, i) => {
    const d = addDays(gridStart, i)
    const iso = isoFromDate(d)
    const isCurrentMonth = d.getMonth() === refDate.getMonth()
    const isToday = iso === today
    const dayItems = dateMap[iso] || []
    return { iso, dayNum: d.getDate(), isCurrentMonth, isToday, items: dayItems.slice(0, 3), overflow: Math.max(0, dayItems.length - 3) }
  })

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {weekdayShort.map((wd) => (
        <div key={wd} className="px-1 pb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {wd}
        </div>
      ))}
      {days.map((day) => (
        <div
          key={day.iso}
          className={cn('min-h-22 rounded-lg p-1.5 shadow-[0_0_0_1px_var(--secondary)]', day.isToday ? 'bg-accent' : 'bg-card', !day.isCurrentMonth && 'opacity-40')}
        >
          <div className={cn('text-xs', day.isToday ? 'font-bold text-accent-foreground' : 'font-medium text-foreground')}>{day.dayNum}</div>
          <div className="mt-1 flex flex-col gap-0.75">
            {day.items.map(({ entrega }, idx) => {
              const meta = markerMeta(entrega)
              return (
                <button
                  key={`${entrega.id}-${idx}`}
                  type="button"
                  onClick={() => onItemClick(entrega.id)}
                  className={cn('truncate rounded px-1.5 py-0.5 text-left text-[10.5px]', meta.badgeClass)}
                >
                  {entrega.titulo}
                </button>
              )
            })}
            {day.overflow > 0 && <div className="pl-0.5 text-[10px] text-muted-foreground">+{day.overflow} mais</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
