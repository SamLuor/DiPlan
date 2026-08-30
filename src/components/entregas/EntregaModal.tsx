import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import { FormField } from '~/components/common/FormField'
import { formatPrazo } from '~/lib/dates'
import type { Prioridade } from '~/server/repository/entrega.repository'
import { PrioritySelector } from '~/components/common/PrioritySelector'
import { createEntregaFn } from '~/server/api/entregas.functions'
import { planosQueryOptions } from '~/server/api/planos.functions'
import { usuariosQueryOptions } from '~/server/api/usuarios.functions'
import { useUiStore } from '~/store/useUiStore'

export function EntregaModal() {
  const modal = useUiStore((s) => s.entregaModal)
  const closeModal = useUiStore((s) => s.closeModal)
  const queryClient = useQueryClient()
  const { data: planos = [] } = useQuery(planosQueryOptions())
  const { data: usuarios = [] } = useQuery(usuariosQueryOptions())

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dataPrevista, setDataPrevista] = useState('')
  const [responsavelUserId, setResponsavelUserId] = useState('')
  const [prioridade, setPrioridade] = useState<Prioridade>('normal')

  const plano = modal ? planos.find((p) => p.id === modal.planoId) : undefined
  const hasPlanoPrazo = !!(plano && (plano.dataInicio || plano.dataFim))
  const usuariosDoEixo = plano ? usuarios.filter((u) => u.eixoId === plano.eixoId) : []

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof createEntregaFn>[0]['data']) => createEntregaFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregas'] })
      toast.success('Entrega criada.')
      closeModal()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar entrega.')
    },
  })

  function handleConfirm() {
    if (!modal) return
    mutation.mutate({
      titulo,
      descricao,
      planoId: modal.planoId,
      dataPrevista: dataPrevista || null,
      prioridade,
      responsavelUserId: responsavelUserId || null,
    })
  }

  return (
    <Dialog open={!!modal} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-115">
        <DialogHeader>
          <DialogTitle>Nova entrega</DialogTitle>
        </DialogHeader>
        <FormField label="Título">
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="ex: Revisão de contrato" />
        </FormField>
        <FormField label="Descrição">
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className="min-h-16" />
        </FormField>
        <div className="flex gap-3.5">
          <div className="flex-1">
            <FormField label="Data prevista">
              <Input type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} min={plano?.dataInicio ?? undefined} max={plano?.dataFim ?? undefined} />
            </FormField>
            {hasPlanoPrazo && plano && <div className="mt-1 text-[11px] text-muted-foreground">Prazo do plano: {formatPrazo(plano.dataInicio, plano.dataFim)}</div>}
          </div>
          <div className="flex-1">
            <FormField label="Responsável">
              <Select value={responsavelUserId || 'none'} onValueChange={(v) => setResponsavelUserId(v === 'none' ? '' : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {usuariosDoEixo.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </div>
        <FormField label="Prioridade">
          <PrioritySelector value={prioridade} onChange={setPrioridade} />
        </FormField>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeModal}>
            Cancelar
          </Button>
          <Button type="button" variant="outline" className="border-primary text-primary hover:bg-accent hover:text-primary" onClick={handleConfirm}>
            Criar entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
