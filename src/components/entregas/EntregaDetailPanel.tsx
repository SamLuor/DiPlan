import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { subject } from '@casl/ability'
import { isOverdue } from '~/lib/domain'
import { useAbility } from '~/hooks/useAbility'
import { formatPrazo } from '~/lib/dates'
import type { EntregaInput, SituacaoEntrega } from '~/server/repository/entrega.repository'
import { Sheet, SheetContent, SheetTitle } from '~/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { PrioritySelector } from '~/components/common/PrioritySelector'
import { AttachmentsList } from './AttachmentsList'
import { SolicitacoesList } from './SolicitacoesList'
import { DetailTimeline } from './DetailTimeline'
import { NoteComposer } from './NoteComposer'
import { entregaQueryOptions, performAcaoFn, updateEntregaFn } from '~/server/api/entregas.functions'
import { eixosQueryOptions } from '~/server/api/eixos.functions'
import { planosQueryOptions } from '~/server/api/planos.functions'
import { usuariosQueryOptions } from '~/server/api/usuarios.functions'
import { useUiStore } from '~/store/useUiStore'

const SITUACAO_LABEL: Record<SituacaoEntrega, string> = {
  aguardando: 'Aguardando início',
  andamento: 'Em andamento',
  concluida: 'Concluída',
}

const SITUACAO_BADGE: Record<SituacaoEntrega, string> = {
  aguardando: 'bg-secondary text-secondary-foreground',
  andamento: 'bg-accent text-accent-foreground',
  concluida: 'bg-accent text-accent-foreground',
}

export function EntregaDetailPanel() {
  const detailEntregaId = useUiStore((s) => s.detailEntregaId)
  const closeDetail = useUiStore((s) => s.closeDetail)

  return (
    <Sheet open={!!detailEntregaId} onOpenChange={(open) => !open && closeDetail()}>
      <SheetContent side="right" className="w-110 gap-0 p-0 sm:max-w-110">
        {detailEntregaId && <EntregaDetailBody entregaId={detailEntregaId} />}
      </SheetContent>
    </Sheet>
  )
}

function EntregaDetailBody({ entregaId }: { entregaId: string }) {
  const queryClient = useQueryClient()
  const { data: entrega } = useQuery(entregaQueryOptions(entregaId))
  const { data: planos = [] } = useQuery(planosQueryOptions())
  const { data: eixos = [] } = useQuery(eixosQueryOptions())
  const { data: usuarios = [] } = useQuery(usuariosQueryOptions())
  const ability = useAbility()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['entregas'] })
    queryClient.invalidateQueries({ queryKey: ['entrega', entregaId] })
  }

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<EntregaInput>) => updateEntregaFn({ data: { id: entregaId, ...patch } }),
    onSuccess: invalidate,
    // Sem toast de sucesso aqui: título/descrição salvam a cada tecla digitada, viraria spam.
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao salvar alteração.'),
  })

  const acaoMutation = useMutation({
    mutationFn: () => performAcaoFn({ data: { id: entregaId } }),
    onSuccess: () => {
      invalidate()
      toast.success('Entrega atualizada.')
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao executar ação.'),
  })

  if (!entrega) return null

  const plano = planos.find((p) => p.id === entrega.planoId)
  const eixoDoPlano = plano ? eixos.find((e) => e.id === plano.eixoId) : null
  const usuariosDoEixoDaEntrega = eixoDoPlano ? usuarios.filter((u) => u.eixoId === eixoDoPlano.id) : []

  const entregaSubject = subject('Entrega', { ...entrega, eixoId: eixoDoPlano?.id })
  let actionLabel: string | null = null
  let showReabrir = false
  if (entrega.situacao === 'aguardando' && ability.can('iniciar', entregaSubject)) actionLabel = 'Iniciar'
  else if (entrega.situacao === 'andamento' && ability.can('concluir', entregaSubject)) actionLabel = 'Concluir'
  else if (entrega.situacao === 'concluida' && ability.can('reabrir', entregaSubject)) showReabrir = true

  const overdue = isOverdue(entrega)
  const dataMin = plano?.dataInicio ?? undefined
  const dataMax = plano?.dataFim ?? undefined

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-6 pt-5.5">
        <SheetTitle asChild>
          <Input
            value={entrega.titulo}
            onChange={(e) => updateMutation.mutate({ titulo: e.target.value })}
            className="h-auto border-none bg-transparent px-0 py-1 text-lg font-medium shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
        </SheetTitle>
      </div>
      <div className="px-6 pt-3 text-xs text-muted-foreground">
        {eixoDoPlano ? eixoDoPlano.nome : '—'} · {plano ? plano.nome : '—'}
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 pt-4 pb-5">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Descrição</label>
          <Textarea
            value={entrega.descricao || ''}
            onChange={(e) => updateMutation.mutate({ descricao: e.target.value })}
            placeholder="Sem descrição"
            className="min-h-20"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs text-muted-foreground">Data de início (opcional)</label>
            <Input type="date" value={entrega.dataInicio || ''} onChange={(e) => updateMutation.mutate({ dataInicio: e.target.value })} min={dataMin} max={dataMax} />
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="text-xs text-muted-foreground">Prazo final</label>
            <Input type="date" value={entrega.dataPrevista || ''} onChange={(e) => updateMutation.mutate({ dataPrevista: e.target.value })} min={dataMin} max={dataMax} />
            {overdue && <div className="mt-1 text-xs text-destructive">Prazo vencido</div>}
            {!!(plano && (plano.dataInicio || plano.dataFim)) && (
              <div className="mt-1 text-[11px] text-muted-foreground">Prazo do plano: {formatPrazo(plano?.dataInicio, plano?.dataFim)}</div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Responsável</label>
          <Select value={entrega.responsavelUserId || 'none'} onValueChange={(v) => updateMutation.mutate({ responsavelUserId: v === 'none' ? null : v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem responsável</SelectItem>
              {usuariosDoEixoDaEntrega.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Prioridade</label>
          <PrioritySelector value={entrega.prioridade} onChange={(p) => updateMutation.mutate({ prioridade: p })} />
        </div>

        <SolicitacoesList entrega={entrega} />

        <div className="flex items-center justify-between border-t pt-4">
          <Badge className={SITUACAO_BADGE[entrega.situacao]}>{SITUACAO_LABEL[entrega.situacao]}</Badge>
          {actionLabel && (
            <Button type="button" variant="outline" className="border-primary text-primary hover:bg-accent hover:text-primary" onClick={() => acaoMutation.mutate()}>
              {actionLabel}
            </Button>
          )}
          {showReabrir && (
            <Button type="button" variant="ghost" className="text-muted-foreground" onClick={() => acaoMutation.mutate()}>
              Reabrir
            </Button>
          )}
        </div>

        <AttachmentsList entregaId={entrega.id} anexos={entrega.anexos} />

        <DetailTimeline entrega={entrega} />
      </div>

      <NoteComposer entregaId={entrega.id} />
    </div>
  )
}
