import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatDateShort } from '~/lib/dates'
import { findUsuarioByEmail, priorityMeta, solicitacaoTipoLabel } from '~/lib/domain'
import type { DelegacaoStatus, Solicitacao } from '~/server/repository/entrega.repository'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { cn } from '~/lib/utils'
import { currentUserQueryOptions } from '~/server/api/auth.functions'
import { concluirDelegacaoFn, iniciarDelegacaoFn, reabrirDelegacaoFn } from '~/server/api/entregas.functions'
import { usuariosQueryOptions } from '~/server/api/usuarios.functions'

const STATUS_LABEL: Record<DelegacaoStatus, string> = {
  aguardando: 'Aguardando',
  andamento: 'Em andamento',
  concluido: 'Concluído',
}

const STATUS_BADGE: Record<DelegacaoStatus, string> = {
  aguardando: 'bg-secondary text-secondary-foreground',
  andamento: 'bg-warning text-warning-foreground',
  concluido: 'bg-accent text-accent-foreground',
}

export function SolicitacaoCard({ entregaId, entregaResponsavelUserId, sol }: { entregaId: string; entregaResponsavelUserId: string | null; sol: Solicitacao }) {
  const queryClient = useQueryClient()
  const { data: usuarios = [] } = useQuery(usuariosQueryOptions())
  const { data: currentUser } = useQuery(currentUserQueryOptions())
  const [reabrindoPara, setReabrindoPara] = useState<string | null>(null)
  const [justificativa, setJustificativa] = useState('')

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['entrega', entregaId] })

  const iniciarMutation = useMutation({
    mutationFn: (solicitacaoId: string) => iniciarDelegacaoFn({ data: { solicitacaoId } }),
    onSuccess: invalidate,
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao iniciar delegação.'),
  })

  const concluirMutation = useMutation({
    mutationFn: (solicitacaoId: string) => concluirDelegacaoFn({ data: { solicitacaoId } }),
    onSuccess: invalidate,
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao concluir delegação.'),
  })

  const reabrirMutation = useMutation({
    mutationFn: (input: { solicitacaoId: string; responsavelId: string; justificativa: string }) => reabrirDelegacaoFn({ data: input }),
    onSuccess: () => {
      invalidate()
      setReabrindoPara(null)
      setJustificativa('')
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao reabrir delegação.'),
  })

  const usuarioAtual = findUsuarioByEmail(usuarios, currentUser?.email ?? '')
  const souResponsavelPrincipal = !!usuarioAtual && usuarioAtual.id === entregaResponsavelUserId
  const pessoas = sol.responsaveis.map((r) => {
    const u = usuarios.find((x) => x.id === r.userId)
    return { id: r.userId, nome: u ? u.nome : '—', status: r.status }
  })
  const geral: DelegacaoStatus = pessoas.every((p) => p.status === 'concluido')
    ? 'concluido'
    : pessoas.some((p) => p.status === 'andamento' || p.status === 'concluido')
      ? 'andamento'
      : 'aguardando'
  const pm = priorityMeta(sol.prioridade)

  return (
    <div className="rounded-lg bg-card p-3 shadow-[0_0_0_1px_var(--secondary)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-foreground">{solicitacaoTipoLabel(sol.tipo)}</span>
        <div className="flex items-center gap-1.5">
          <Badge className={pm.badgeClass}>{pm.label}</Badge>
          <Badge className={STATUS_BADGE[geral]}>{STATUS_LABEL[geral]}</Badge>
        </div>
      </div>
      <div className="mt-1.5 text-sm leading-snug text-foreground/70">{sol.descricao}</div>
      <div className="mt-1.5 text-[11.5px] text-muted-foreground">Prazo para retorno: {sol.prazo ? formatDateShort(sol.prazo) : 'Sem prazo'}</div>
      <div className="mt-2 flex flex-col gap-1.5">
        {pessoas.map((pessoa) => {
          const souEu = !!usuarioAtual && usuarioAtual.id === pessoa.id
          return (
            <div key={pessoa.id} className="flex flex-wrap items-center gap-1.5">
              <span className={cn('rounded-full px-2.25 py-0.75 text-[11.5px] font-medium', STATUS_BADGE[pessoa.status])}>
                {pessoa.nome} · {STATUS_LABEL[pessoa.status]}
              </span>
              {souEu && pessoa.status === 'aguardando' && (
                <button type="button" onClick={() => iniciarMutation.mutate(sol.id)} className="text-[11.5px] font-medium text-primary">
                  Iniciar
                </button>
              )}
              {souEu && pessoa.status === 'andamento' && (
                <button type="button" onClick={() => concluirMutation.mutate(sol.id)} className="text-[11.5px] font-medium text-primary">
                  Concluir
                </button>
              )}
              {!souEu && souResponsavelPrincipal && pessoa.status === 'concluido' && reabrindoPara !== pessoa.id && (
                <button type="button" onClick={() => setReabrindoPara(pessoa.id)} className="text-[11.5px] font-medium text-muted-foreground">
                  Reabrir
                </button>
              )}
            </div>
          )
        })}
        {reabrindoPara && (
          <div className="mt-1 flex flex-col gap-1.5 rounded-md bg-secondary/50 p-2">
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Justificativa da reabertura..."
              className="min-h-12 bg-card text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="h-auto px-2 py-1 text-xs"
                onClick={() => {
                  setReabrindoPara(null)
                  setJustificativa('')
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto border-primary px-2 py-1 text-xs text-primary hover:bg-accent hover:text-primary"
                disabled={!justificativa.trim()}
                onClick={() => reabrirMutation.mutate({ solicitacaoId: sol.id, responsavelId: reabrindoPara, justificativa })}
              >
                Confirmar reabertura
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
