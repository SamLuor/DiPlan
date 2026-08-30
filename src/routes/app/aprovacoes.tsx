import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { formatDateShort } from '~/lib/dates'
import { aprovarEntregaFn, entregasQueryOptions } from '~/server/api/entregas.functions'
import { planosQueryOptions } from '~/server/api/planos.functions'
import { eixosQueryOptions } from '~/server/api/eixos.functions'
import { usuariosQueryOptions } from '~/server/api/usuarios.functions'
import { useUiStore } from '~/store/useUiStore'

export const Route = createFileRoute('/app/aprovacoes')({
  beforeLoad: ({ context }) => {
    if (context.user?.perfil === 'operacional') throw redirect({ to: '/app/eixos' })
  },
  component: AprovacoesPage,
})

function AprovacoesPage() {
  const queryClient = useQueryClient()
  const openDetail = useUiStore((s) => s.openDetail)
  // listEntregasFn já filtra por ability: Diretoria vê todas as pendentes, Chefia só do(s) eixo(s) que chefia.
  const { data: entregas = [] } = useQuery(entregasQueryOptions())
  const { data: planos = [] } = useQuery(planosQueryOptions())
  const { data: eixos = [] } = useQuery(eixosQueryOptions())
  const { data: usuarios = [] } = useQuery(usuariosQueryOptions())

  const pendentes = entregas.filter((e) => e.situacao === 'aguardando aprovação')

  const aprovarMutation = useMutation({
    mutationFn: (id: string) => aprovarEntregaFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregas'] })
      toast.success('Entrega aprovada.')
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao aprovar entrega.'),
  })

  const porPlano = new Map<string, typeof pendentes>()
  for (const e of pendentes) {
    if (!porPlano.has(e.planoId)) porPlano.set(e.planoId, [])
    porPlano.get(e.planoId)!.push(e)
  }

  return (
    <main className="flex flex-1 flex-col overflow-auto rounded-3xl bg-gray-50 px-8 py-6.5">
      <h2 className="text-[25px] font-medium tracking-tight text-foreground">Solicitações de Aprovação</h2>
      <p className="mt-1 text-sm text-muted-foreground">Entregas criadas por usuários Operacionais, aguardando aprovação antes de entrar no fluxo normal.</p>

      {pendentes.length === 0 && <div className="mt-6 rounded-2xl bg-card p-6 text-sm text-muted-foreground shadow-[0_0_0_1px_var(--secondary)]">Nada pendente de aprovação.</div>}

      <div className="mt-6 flex flex-col gap-5">
        {[...porPlano.entries()].map(([planoId, itens]) => {
          const plano = planos.find((p) => p.id === planoId)
          const eixo = plano ? eixos.find((ex) => ex.id === plano.eixoId) : null
          return (
            <div key={planoId} className="rounded-2xl bg-card shadow-[0_0_0_1px_var(--secondary)]">
              <div className="border-b px-4 py-3">
                <div className="text-sm font-medium text-foreground">{plano?.nome ?? 'Plano não encontrado'}</div>
                <div className="text-xs text-muted-foreground">{eixo?.nome ?? '—'}</div>
              </div>
              <div className="flex flex-col">
                {itens.map((e) => {
                  const responsavel = usuarios.find((u) => u.id === e.responsavelUserId)
                  return (
                    <div key={e.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-none">
                      <button type="button" onClick={() => openDetail(e.id)} className="min-w-0 flex-1 text-left">
                        <div className="truncate text-sm font-medium text-foreground hover:underline">{e.titulo}</div>
                        <div className="text-xs text-muted-foreground">
                          {responsavel?.nome ?? 'Sem responsável'} · prazo {formatDateShort(e.dataPrevista)}
                        </div>
                      </button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-none border-primary text-primary hover:bg-accent hover:text-primary"
                        onClick={() => aprovarMutation.mutate(e.id)}
                      >
                        Aprovar
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
