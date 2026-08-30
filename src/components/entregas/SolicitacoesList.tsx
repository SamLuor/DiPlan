import { subject } from '@casl/ability'
import type { EntregaDetalhada } from '~/server/repository/entrega.repository'
import { useAbility } from '~/hooks/useAbility'
import { SolicitacaoCard } from './SolicitacaoCard'
import { useUiStore } from '~/store/useUiStore'

export function SolicitacoesList({ entrega, eixoId }: { entrega: EntregaDetalhada; eixoId: string | undefined }) {
  const openSolicitacaoModal = useUiStore((s) => s.openSolicitacaoModal)
  const ability = useAbility()
  const solicitacoes = [...entrega.solicitacoes].reverse()
  const podeDelegar = ability.can('delegar', subject('Entrega', { ...entrega, eixoId }))

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <h4 className="text-[13px] font-semibold text-muted-foreground">Solicitações de colaboração</h4>
        {podeDelegar && (
          <button type="button" onClick={openSolicitacaoModal} className="text-xs font-medium text-primary">
            + Nova solicitação
          </button>
        )}
      </div>
      {solicitacoes.length > 0 && (
        <div className="flex flex-col gap-2">
          {solicitacoes.map((sol) => (
            <SolicitacaoCard key={sol.id} entregaId={entrega.id} entregaResponsavelUserId={entrega.responsavelUserId} sol={sol} />
          ))}
        </div>
      )}
    </div>
  )
}
