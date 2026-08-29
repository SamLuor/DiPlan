const ITEMS = [
  { label: 'Aguardando início', dotClass: 'bg-secondary-foreground' },
  { label: 'Em andamento', dotClass: 'bg-accent-foreground' },
  { label: 'Concluída', dotClass: 'bg-accent-foreground' },
  { label: 'Urgente / atrasada', dotClass: 'bg-destructive' },
]

export function CalendarLegend() {
  return (
    <div className="mt-3.5 flex flex-wrap items-center gap-4 pb-4.5">
      {ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={`inline-block size-2.25 rounded-full ${item.dotClass}`} />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
