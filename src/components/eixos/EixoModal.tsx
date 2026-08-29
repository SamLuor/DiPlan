import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { FormField } from '~/components/common/FormField'
import { createEixoFn, eixosQueryOptions, updateEixoFn } from '~/server/api/eixos.functions'
import { usuariosQueryOptions } from '~/server/api/usuarios.functions'
import { useUiStore } from '~/store/useUiStore'

export function EixoModal() {
  const modal = useUiStore((s) => s.eixoModal)
  const closeModal = useUiStore((s) => s.closeModal)
  const queryClient = useQueryClient()
  const { data: eixos = [] } = useQuery(eixosQueryOptions())
  const { data: usuarios = [] } = useQuery(usuariosQueryOptions())

  const editing = modal?.mode === 'edit' ? eixos.find((e) => e.id === modal.eixoId) : null
  const [nome, setNome] = useState(editing?.nome ?? '')
  const [chefiaId, setChefiaId] = useState(editing?.chefiaUserId ?? '')

  const usuariosDoEixo = editing ? usuarios.filter((u) => u.eixoId === editing.id) : []

  const mutation = useMutation({
    mutationFn: (input: { id?: string; nome: string; chefiaUserId: string | null }) =>
      input.id ? updateEixoFn({ data: { id: input.id, nome: input.nome, chefiaUserId: input.chefiaUserId } }) : createEixoFn({ data: { nome: input.nome } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eixos'] })
      closeModal()
    },
  })

  function handleConfirm() {
    const trimmed = nome.trim()
    if (!trimmed) return
    mutation.mutate({ id: modal?.mode === 'edit' ? modal.eixoId : undefined, nome: trimmed, chefiaUserId: chefiaId || null })
  }

  return (
    <Dialog open={!!modal} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle>{modal?.mode === 'edit' ? 'Editar eixo' : 'Novo eixo'}</DialogTitle>
        </DialogHeader>
        <FormField label="Nome do eixo">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex: Financeiro" />
        </FormField>
        {modal?.mode === 'edit' && (
          <FormField label="Chefia responsável">
            {usuariosDoEixo.length > 0 ? (
              <Select value={chefiaId || 'none'} onValueChange={(v) => setChefiaId(v === 'none' ? '' : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem chefia definida</SelectItem>
                  {usuariosDoEixo.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-xs text-muted-foreground">Vincule usuários a este eixo para definir uma chefia.</div>
            )}
          </FormField>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeModal}>
            Cancelar
          </Button>
          <Button type="button" variant="outline" className="border-primary text-primary hover:bg-accent hover:text-primary" onClick={handleConfirm}>
            {modal?.mode === 'edit' ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
