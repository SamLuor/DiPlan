import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import type { CalendarModo } from './types'

const MODO_OPTIONS: Array<{ key: CalendarModo; label: string }> = [
  { key: 'diaria', label: 'Dia' },
  { key: 'semanal', label: 'Semana' },
  { key: 'mensal', label: 'Mês' },
  { key: 'periodo', label: 'Período' },
]

interface CalendarioToolbarProps {
  modo: CalendarModo
  onModoChange: (modo: CalendarModo) => void
  navLabel: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  periodoInicio: string
  periodoFim: string
  onPeriodoInicioChange: (value: string) => void
  onPeriodoFimChange: (value: string) => void
}

export function CalendarioToolbar({
  modo,
  onModoChange,
  navLabel,
  onPrev,
  onNext,
  onToday,
  periodoInicio,
  periodoFim,
  onPeriodoInicioChange,
  onPeriodoFimChange,
}: CalendarioToolbarProps) {
  return (
    <div className="mt-4.5 flex flex-wrap items-center justify-between gap-4">
      <ToggleGroup type="single" variant="outline" spacing={6} value={modo} onValueChange={(v) => v && onModoChange(v as CalendarModo)}>
        {MODO_OPTIONS.map((opt) => (
          <ToggleGroupItem key={opt.key} value={opt.key} className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {modo !== 'periodo' ? (
        <div className="flex items-center gap-1.5">
          <Button type="button" variant="outline" size="icon" onClick={onPrev}>
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="min-w-42.5 text-center text-sm font-medium text-foreground">{navLabel}</span>
          <Button type="button" variant="outline" size="icon" onClick={onNext}>
            <ChevronRight className="size-3.5" />
          </Button>
          <Button type="button" variant="outline" size="sm" className="text-muted-foreground" onClick={onToday}>
            Hoje
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input type="date" value={periodoInicio} onChange={(e) => onPeriodoInicioChange(e.target.value)} className="h-8.5 w-auto" />
          <span className="text-sm text-muted-foreground">até</span>
          <Input type="date" value={periodoFim} onChange={(e) => onPeriodoFimChange(e.target.value)} className="h-8.5 w-auto" />
        </div>
      )}
    </div>
  )
}
