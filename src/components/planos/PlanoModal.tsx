import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { FormField } from '~/components/common/FormField'
import { eixosQueryOptions } from '~/server/api/eixos.functions'
import { createPlanoFn, planosQueryOptions, updatePlanoFn } from '~/server/api/planos.functions'
import { useUiStore } from '~/store/useUiStore'

export function PlanoModal() {
  const modal = useUiStore((s) => s.planoModal)
  const closeModal = useUiStore((s) => s.closeModal)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: eixos = [] } = useQuery(eixosQueryOptions())
  const { data: planos = [] } = useQuery(planosQueryOptions())

  const editing = modal?.mode === 'edit' ? planos.find((p) => p.id === modal.planoId) : null
  const defaultEixoId = modal?.mode === 'create' ? modal.eixoId : (editing?.eixoId ?? eixos[0]?.id ?? '')

  const [nome, setNome] = useState(editing?.nome ?? '')
  const [eixoId, setEixoId] = useState(defaultEixoId)
  const [dataInicio, setDataInicio] = useState(editing?.dataInicio ?? '')
  const [dataFim, setDataFim] = useState(editing?.dataFim ?? '')

  const datasFaltando = !dataInicio || !dataFim
  const datasInvalidas = !!(dataInicio && dataFim && dataFim < dataInicio)

  const mutation = useMutation({
    mutationFn: (input: { id?: string; nome: string; eixoId: string; dataInicio: string; dataFim: string }) =>
      input.id ? updatePlanoFn({ data: { id: input.id, ...input } }) : createPlanoFn({ data: input }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['planos'] })
      toast.success(modal?.mode === 'edit' ? 'Plano atualizado.' : 'Plano criado.')
      closeModal()
      if (modal?.mode === 'create' && result) {
        navigate({ to: '/app/eixos/$eixoId/planos/$planoId', params: { eixoId, planoId: result.id } })
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar plano.')
    },
  })

  function handleConfirm() {
    const trimmed = nome.trim()
    if (!trimmed || !eixoId || datasFaltando || datasInvalidas) return
    mutation.mutate({
      id: modal?.mode === 'edit' ? modal.planoId : undefined,
      nome: trimmed,
      eixoId,
      dataInicio,
      dataFim,
    })
  }

  return (
    <Dialog open={!!modal} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-105">
        <DialogHeader>
          <DialogTitle>{modal?.mode === 'edit' ? 'Editar plano' : 'Novo plano'}</DialogTitle>
        </DialogHeader>
        <FormField label="Nome do plano">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex: Plano 2026" />
        </FormField>
        <div className="flex gap-3.5">
          <div className="flex-1">
            <FormField label="Início do plano">
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} required />
            </FormField>
          </div>
          <div className="flex-1">
            <FormField label="Fim do plano">
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} required />
            </FormField>
          </div>
        </div>
        {datasInvalidas && <div className="-mt-2 text-xs text-destructive">A data de fim deve ser igual ou posterior ao início.</div>}
        <FormField label="Eixo vinculado">
          <Select value={eixoId} onValueChange={setEixoId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eixos.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <div className="text-[11.5px] text-muted-foreground">
          O status do plano é automático: começa em "Planejado", passa a "Execução" quando uma entrega interna é iniciada, e a "Concluído" ao atingir a data final.
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeModal}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-primary text-primary hover:bg-accent hover:text-primary disabled:opacity-50"
            onClick={handleConfirm}
            disabled={!nome.trim() || !eixoId || datasFaltando || datasInvalidas}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
