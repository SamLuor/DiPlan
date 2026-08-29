import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDateShort } from '~/lib/dates'
import { findUsuarioByEmail, priorityMeta, solicitacaoTipoLabel } from '~/lib/domain'
import type { Solicitacao } from '~/server/repository/entrega.repository'
import { Badge } from '~/components/ui/badge'
import { cn } from '~/lib/utils'
import { currentUserQueryOptions } from '~/server/api/auth.functions'
import { responderSolicitacaoFn } from '~/server/api/entregas.functions'
import { usuariosQueryOptions } from '~/server/api/usuarios.functions'

export function SolicitacaoCard({ entregaId, sol }: { entregaId: string; sol: Solicitacao }) {
  const queryClient = useQueryClient()
  const { data: usuarios = [] } = useQuery(usuariosQueryOptions())
  const { data: currentUser } = useQuery(currentUserQueryOptions())

  const responderMutation = useMutation({
    mutationFn: (solicitacaoId: string) => responderSolicitacaoFn({ data: { entregaId, solicitacaoId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entrega', entregaId] }),
  })

  const usuarioAtual = findUsuarioByEmail(usuarios, currentUser?.email ?? '')
  const pessoas = sol.responsaveis.map((r) => {
    const u = usuarios.find((x) => x.id === r.userId)
    return {
      id: r.userId,
      nome: u ? u.nome : '—',
      respondeu: r.respondeu,
      showResponder: !r.respondeu && !!usuarioAtual && usuarioAtual.id === r.userId,
    }
  })
  const todasRespondidas = pessoas.every((p) => p.respondeu)
  const pm = priorityMeta(sol.prioridade)

  return (
    <div className="rounded-lg bg-card p-3 shadow-[0_0_0_1px_var(--secondary)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-foreground">{solicitacaoTipoLabel(sol.tipo)}</span>
        <div className="flex items-center gap-1.5">
          <Badge className={pm.badgeClass}>{pm.label}</Badge>
          <Badge className={todasRespondidas ? 'bg-accent text-accent-foreground' : 'bg-warning text-warning-foreground'}>
            {todasRespondidas ? 'Respondida' : 'Pendente'}
          </Badge>
        </div>
      </div>
      <div className="mt-1.5 text-sm leading-snug text-foreground/70">{sol.descricao}</div>
      <div className="mt-1.5 text-[11.5px] text-muted-foreground">Prazo para retorno: {sol.prazo ? formatDateShort(sol.prazo) : 'Sem prazo'}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {pessoas.map((pessoa) => (
          <div key={pessoa.id} className="flex items-center gap-1.5">
            <span className={cn('rounded-full px-2.25 py-0.75 text-[11.5px] font-medium', pessoa.respondeu ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground')}>
              {pessoa.nome}
            </span>
            {pessoa.showResponder && (
              <button type="button" onClick={() => responderMutation.mutate(sol.id)} className="text-[11.5px] font-medium text-primary">
                Responder
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
