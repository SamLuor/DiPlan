import { useQuery } from '@tanstack/react-query'
import { isChefiaAtual } from '~/lib/domain'
import type { EntregaDetalhada } from '~/server/repository/entrega.repository'
import { TimelineNoteItem } from './TimelineNoteItem'
import { currentUserQueryOptions } from '~/server/api/auth.functions'
import { eixosQueryOptions } from '~/server/api/eixos.functions'
import { planosQueryOptions } from '~/server/api/planos.functions'
import { usuariosQueryOptions } from '~/server/api/usuarios.functions'

export function DetailTimeline({ entrega }: { entrega: EntregaDetalhada }) {
  const { data: planos = [] } = useQuery(planosQueryOptions())
  const { data: eixos = [] } = useQuery(eixosQueryOptions())
  const { data: usuarios = [] } = useQuery(usuariosQueryOptions())
  const { data: currentUser } = useQuery(currentUserQueryOptions())

  const canDelete = isChefiaAtual(entrega, planos, eixos, usuarios, currentUser?.email ?? '')
  const notasOrdenadas = entrega.notas.filter((n) => !n.excluido).reverse()

  return (
    <div>
      <h4 className="mb-2.5 text-[13px] font-semibold text-muted-foreground">Timeline</h4>
      {notasOrdenadas.length > 0 && (
        <div className="flex flex-col gap-2">
          {notasOrdenadas.map((nota) => (
            <TimelineNoteItem key={nota.id} entregaId={entrega.id} nota={nota} canDelete={canDelete} currentUserId={currentUser?.id ?? null} />
          ))}
        </div>
      )}
    </div>
  )
}
