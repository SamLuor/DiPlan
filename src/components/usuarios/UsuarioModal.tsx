import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { FormField } from '~/components/common/FormField'
import { avatarClassFor, initials } from '~/lib/domain'
import type { Perfil, UserModo } from '~/server/repository/usuario.repository'
import { eixosQueryOptions } from '~/server/api/eixos.functions'
import { createUsuarioFn, updateUsuarioFn, usuariosQueryOptions } from '~/server/api/usuarios.functions'
import { useUiStore } from '~/store/useUiStore'

const MODO_OPTIONS: Array<{ key: UserModo; label: string }> = [
  { key: 'senha', label: 'Senha' },
  { key: 'convite', label: 'Convite por e-mail' },
]

const PERFIL_OPTIONS: Array<{ key: Perfil; label: string }> = [
  { key: 'operacional', label: 'Operacional' },
  { key: 'chefia', label: 'Chefia' },
  { key: 'diretoria', label: 'Diretoria' },
]

export function UsuarioModal() {
  const modal = useUiStore((s) => s.usuarioModal)
  const closeModal = useUiStore((s) => s.closeModal)
  const queryClient = useQueryClient()
  const { data: eixos = [] } = useQuery(eixosQueryOptions())
  const { data: usuarios = [] } = useQuery(usuariosQueryOptions())

  const editing = modal?.mode === 'edit' ? usuarios.find((u) => u.id === modal.usuarioId) : null

  const [nome, setNome] = useState(editing?.nome ?? '')
  const [email, setEmail] = useState(editing?.email ?? '')
  const [modo, setModo] = useState<UserModo>(editing?.modo ?? 'senha')
  const [perfil, setPerfil] = useState<Perfil>(editing?.perfil ?? 'operacional')
  const [eixoId, setEixoId] = useState(editing?.eixoId ?? (modal?.mode === 'create' ? modal.eixoId : null) ?? eixos[0]?.id ?? '')

  const precisaDeEixo = perfil !== 'diretoria'

  const mutation = useMutation({
    mutationFn: (input: { id?: string; nome: string; email: string; modo: UserModo; perfil: Perfil; eixoId: string | null }) =>
      input.id ? updateUsuarioFn({ data: input as typeof input & { id: string } }) : createUsuarioFn({ data: input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      queryClient.invalidateQueries({ queryKey: ['eixos'] })
      toast.success(variables.id ? 'Usuário atualizado.' : 'Usuário criado — e-mail de definição de senha enviado.')
      closeModal()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar usuário.')
    },
  })

  function handleConfirm() {
    const trimmedNome = nome.trim()
    const trimmedEmail = email.trim()
    if (!trimmedNome || !trimmedEmail) return
    if (precisaDeEixo && !eixoId) return
    mutation.mutate({
      id: modal?.mode === 'edit' ? modal.usuarioId : undefined,
      nome: trimmedNome,
      email: trimmedEmail,
      modo,
      perfil,
      eixoId: precisaDeEixo ? eixoId : null,
    })
  }

  return (
    <Dialog open={!!modal} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-110">
        <DialogHeader>
          <DialogTitle>{modal?.mode === 'edit' ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3">
          <div className={`flex size-11 items-center justify-center rounded-full text-[15px] font-semibold ${avatarClassFor(nome || 'novo')}`}>{initials(nome) || '—'}</div>
          <div className="text-xs text-muted-foreground">Avatar gerado automaticamente a partir das iniciais.</div>
        </div>
        <FormField label="Nome completo">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex: Diego Alves" />
        </FormField>
        <FormField label="E-mail (login)">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" />
        </FormField>
        <div>
          <FormField label="Acesso">
            <ToggleGroup type="single" variant="outline" spacing={8} value={modo} onValueChange={(v) => v && setModo(v as UserModo)}>
              {MODO_OPTIONS.map((opt) => (
                <ToggleGroupItem key={opt.key} value={opt.key} className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </FormField>
          {!editing && (
            <div className="mt-2 text-xs text-muted-foreground">Enviaremos um e-mail para {email || 'o endereço informado'} com um link para definir a senha.</div>
          )}
        </div>
        <div>
          <FormField label="Perfil">
            <ToggleGroup type="single" variant="outline" spacing={8} value={perfil} onValueChange={(v) => v && setPerfil(v as Perfil)}>
              {PERFIL_OPTIONS.map((opt) => (
                <ToggleGroupItem key={opt.key} value={opt.key} className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </FormField>
          {perfil === 'chefia' && (
            <div className="mt-1.5 text-[11px] text-muted-foreground">Vira chefia do eixo selecionado abaixo (só pode ser chefia de um).</div>
          )}
          {perfil === 'diretoria' && <div className="mt-1.5 text-[11px] text-muted-foreground">Diretoria tem acesso a tudo — não precisa estar vinculada a um eixo.</div>}
        </div>
        {precisaDeEixo && (
          <FormField label="Eixo">
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
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeModal}>
            Cancelar
          </Button>
          <Button type="button" variant="outline" className="border-primary text-primary hover:bg-accent hover:text-primary" onClick={handleConfirm}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
