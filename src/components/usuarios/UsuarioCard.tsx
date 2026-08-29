import { useQuery } from '@tanstack/react-query'
import type { Usuario } from '~/server/repository/usuario.repository'
import { Avatar } from '~/components/common/Avatar'
import { Badge } from '~/components/ui/badge'
import { eixosQueryOptions } from '~/server/api/eixos.functions'
import { useUiStore } from '~/store/useUiStore'

export function UsuarioCard({ usuario }: { usuario: Usuario }) {
  const { data: eixos = [] } = useQuery(eixosQueryOptions())
  const eixo = eixos.find((e) => e.id === usuario.eixoId)
  const openUsuarioModal = useUiStore((s) => s.openUsuarioModal)
  const isChefia = !!(eixo && eixo.chefiaUserId === usuario.id)

  return (
    <div
      onClick={() => openUsuarioModal({ mode: 'edit', usuarioId: usuario.id })}
      className="flex cursor-pointer items-center gap-3 rounded-2xl bg-card p-4 shadow-[0_0_0_1px_var(--secondary)]"
    >
      <Avatar name={usuario.nome} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">{usuario.nome}</span>
          {isChefia && <Badge className="flex-none bg-accent text-[10px] text-accent-foreground">Chefia</Badge>}
        </div>
        <div className="truncate text-xs text-muted-foreground">{usuario.email}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground/70">{eixo ? eixo.nome : '—'}</div>
      </div>
    </div>
  )
}
