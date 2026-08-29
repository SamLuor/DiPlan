import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import type { Eixo } from '~/server/repository/eixo.repository'

export function EixoFilterChips({
  eixos,
  filtroEixos,
  onToggle,
}: {
  eixos: Eixo[]
  filtroEixos: string[]
  onToggle: (id: string | null) => void
}) {
  const value = filtroEixos.length === 0 ? ['todos'] : filtroEixos

  return (
    <ToggleGroup
      type="multiple"
      variant="outline"
      spacing={8}
      value={value}
      onValueChange={() => {}}
      className="mt-4 flex-wrap"
    >
      <ToggleGroupItem
        value="todos"
        onClick={() => onToggle(null)}
        className="rounded-full data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
      >
        Todos
      </ToggleGroupItem>
      {eixos.map((e) => (
        <ToggleGroupItem
          key={e.id}
          value={e.id}
          onClick={() => onToggle(e.id)}
          className="rounded-full data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
        >
          {e.nome}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
