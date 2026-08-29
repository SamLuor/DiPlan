import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { priorityMeta } from '~/lib/domain'
import type { Prioridade } from '~/server/repository/entrega.repository'
import { cn } from '~/lib/utils';

const OPTIONS: Prioridade[] = ['baixa', 'normal', 'alta', 'urgente']

export function PrioritySelector({ value, onChange }: { value: Prioridade; onChange: (p: Prioridade) => void }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={8}
      value={value}
      onValueChange={(v) => v && onChange(v as Prioridade)}
      className="flex-wrap"
    >
      {OPTIONS.map((key) => (
        <ToggleGroupItem key={key} value={key} className={cn("data-[state=on] data-[state=on]:text-accent-foreground", priorityMeta(key).badgeClass)}>
          {priorityMeta(key).label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
