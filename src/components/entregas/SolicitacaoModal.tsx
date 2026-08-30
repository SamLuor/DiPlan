import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '~/components/ui/command'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Textarea } from '~/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { Badge } from '~/components/ui/badge'
import { FormField } from '~/components/common/FormField'
import { PrioritySelector } from '~/components/common/PrioritySelector'
import { SOLICITACAO_TIPOS, solicitacaoTipoLabel } from '~/lib/domain'
import type { Prioridade, SolicitacaoTipo } from '~/server/repository/entrega.repository'
import { addSolicitacaoFn } from '~/server/api/entregas.functions'
import { eixosQueryOptions } from '~/server/api/eixos.functions'
import { planosQueryOptions } from '~/server/api/planos.functions'
import { entregasQueryOptions } from '~/server/api/entregas.functions'
import { usuariosQueryOptions } from '~/server/api/usuarios.functions'
import { useUiStore } from '~/store/useUiStore'

export function SolicitacaoModal() {
  const open = useUiStore((s) => s.solicitacaoModalOpen)
  const closeModal = useUiStore((s) => s.closeModal)
  const detailEntregaId = useUiStore((s) => s.detailEntregaId)
  const queryClient = useQueryClient()
  const { data: entregas = [] } = useQuery(entregasQueryOptions())
  const { data: planos = [] } = useQuery(planosQueryOptions())
  const { data: eixos = [] } = useQuery(eixosQueryOptions())
  const { data: usuarios = [] } = useQuery(usuariosQueryOptions())

  const [tipo, setTipo] = useState<SolicitacaoTipo>('revisao')
  const [descricao, setDescricao] = useState('')
  const [responsavelIds, setResponsavelIds] = useState<string[]>([])
  const [prazo, setPrazo] = useState('')
  const [prioridade, setPrioridade] = useState<Prioridade>('normal')
  const [responsavelPickerOpen, setResponsavelPickerOpen] = useState(false)

  const entrega = entregas.find((e) => e.id === detailEntregaId)
  const plano = entrega ? planos.find((p) => p.id === entrega.planoId) : null
  const eixo = plano ? eixos.find((e) => e.id === plano.eixoId) : null
  const usuariosDoEixo = eixo ? usuarios.filter((u) => u.eixoId === eixo.id) : []
  const selecionados = usuarios.filter((u) => responsavelIds.includes(u.id))

  const mutation = useMutation({
    mutationFn: (input: { entregaId: string; tipo: SolicitacaoTipo; descricao: string; responsavelIds: string[]; prazo: string | null; prioridade: Prioridade }) =>
      addSolicitacaoFn({ data: input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entrega', variables.entregaId] })
      setTipo('revisao')
      setDescricao('')
      setResponsavelIds([])
      setPrazo('')
      setPrioridade('normal')
      setResponsavelPickerOpen(false)
      closeModal()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao criar solicitação.'),
  })

  function toggleResponsavel(id: string) {
    setResponsavelIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  function handleConfirm() {
    if (!entrega) return
    mutation.mutate({ entregaId: entrega.id, tipo, descricao, responsavelIds, prazo: prazo || null, prioridade })
  }

  return (
    <Dialog open={open && !!detailEntregaId} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-115">
        <DialogHeader>
          <DialogTitle>Nova solicitação</DialogTitle>
        </DialogHeader>
        <FormField label="Tipo de solicitação">
          <ToggleGroup type="single" variant="outline" spacing={8} value={tipo} onValueChange={(v) => v && setTipo(v as SolicitacaoTipo)} className="flex gap-1 flex-wrap">
            {SOLICITACAO_TIPOS.map((key) => (
              <ToggleGroupItem key={key} value={key} className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground text-xs! p-1.5 px-2 h-auto!">
                {solicitacaoTipoLabel(key)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FormField>
        <FormField label="Descrição do que deve ser feito">
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva a solicitação..." className="min-h-17.5" />
        </FormField>
        <FormField label="Responsáveis">
          <Popover open={responsavelPickerOpen} onOpenChange={setResponsavelPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={responsavelPickerOpen}
                className="w-full justify-between font-normal text-muted-foreground"
              >
                {selecionados.length > 0 ? `${selecionados.length} selecionado(s)` : 'Buscar pessoa...'}
                <ChevronDown className="size-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
              <Command>
                <CommandInput placeholder="Buscar pessoa..." />
                <CommandList className="max-h-40">
                  <CommandEmpty>Nenhuma pessoa encontrada</CommandEmpty>
                  <CommandGroup>
                    {usuariosDoEixo.map((u) => {
                      const checked = responsavelIds.includes(u.id)
                      return (
                        <CommandItem
                          key={u.id}
                          value={u.nome}
                          onSelect={() => toggleResponsavel(u.id)}
                          className="justify-between data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                        >
                          {u.nome}
                          {checked && <Check className="size-3.5 text-primary" />}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selecionados.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selecionados.map((u) => (
                <Badge key={u.id} className="gap-1.5 bg-accent pr-1.5 text-accent-foreground">
                  {u.nome}
                  <button type="button" onMouseDown={() => toggleResponsavel(u.id)} className="text-accent-foreground/70">
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </FormField>
        <FormField label="Prazo para retorno">
          <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </FormField>
        <FormField label="Prioridade">
          <PrioritySelector value={prioridade} onChange={setPrioridade} />
        </FormField>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeModal}>
            Cancelar
          </Button>
          <Button type="button" variant="outline" className="border-primary text-primary hover:bg-accent hover:text-primary" onClick={handleConfirm}>
            Enviar solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
