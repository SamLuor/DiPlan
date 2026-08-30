import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { eixosQueryOptions } from '~/server/api/eixos.functions'
import { updateUsuarioPerfilFn, usuariosQueryOptions } from '~/server/api/usuarios.functions'
import type { Perfil } from '~/server/repository/usuario.repository'

const PERFIL_OPTIONS: Array<{ key: Perfil; label: string }> = [
  { key: 'diretoria', label: 'Diretoria' },
  { key: 'chefia', label: 'Chefia' },
  { key: 'operacional', label: 'Operacional' },
]

const MATRIZ = [
  ['Ver todas as entregas da Unidade', 'Sim', 'Não', 'Não'],
  ['Ver entregas da própria equipe', 'Sim', 'Sim', 'Só quando participa'],
  ['Ver só as próprias entregas', 'Sim', 'Sim', 'Sim'],
  ['Criar plano', 'Sim', 'Sim', 'Não'],
  ['Editar plano', 'Sim', 'Sim', 'Não'],
  ['Excluir plano', 'Sim', 'Sim', 'Não'],
  ['Criar entrega', 'Sim', 'Sim', 'Não *'],
  ['Editar descritivo da própria entrega', 'Sim', 'Sim', 'Sim, se responsável *'],
  ['Alterar prazo oficial', 'Sim', 'Sim', 'Não'],
  ['Excluir entrega', 'Sim', 'Sim', 'Não'],
  ['Iniciar / registrar andamento / anexar', 'Sim', 'Sim', 'Sim, se responsável'],
  ['Reabrir entrega concluída', 'Sim', 'Sim', 'Não'],
]

export const Route = createFileRoute('/app/admin/permissoes')({
  beforeLoad: ({ context }) => {
    if (context.user?.perfil !== 'diretoria') throw redirect({ to: '/app/eixos' })
  },
  component: PermissoesPage,
})

function PermissoesPage() {
  const queryClient = useQueryClient()
  const { data: usuarios = [] } = useQuery(usuariosQueryOptions())
  const { data: eixos = [] } = useQuery(eixosQueryOptions())

  const mutation = useMutation({
    mutationFn: (input: { id: string; perfil: Perfil }) => updateUsuarioPerfilFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      toast.success('Perfil atualizado.')
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao atualizar perfil.'),
  })

  return (
    <main className="flex flex-1 flex-col overflow-auto rounded-3xl bg-gray-50 px-8 py-6.5">
      <h2 className="text-[25px] font-medium tracking-tight text-foreground">Perfil e Permissões</h2>
      <p className="mt-1 text-sm text-muted-foreground">Restrito à Diretoria. Ver `domain-info/rbac-spec.md` para o detalhamento completo.</p>

      <div className="mt-6 overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_var(--secondary)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Usuário</th>
              <th className="px-4 py-3 font-medium">Eixo</th>
              <th className="px-4 py-3 font-medium">Perfil</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b last:border-none">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-foreground">{u.nome}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{eixos.find((e) => e.id === u.eixoId)?.nome ?? '—'}</td>
                <td className="px-4 py-2.5">
                  <Select value={u.perfil} onValueChange={(v) => mutation.mutate({ id: u.id, perfil: v as Perfil })}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERFIL_OPTIONS.map((p) => (
                        <SelectItem key={p.key} value={p.key}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-8 text-sm font-semibold text-foreground">Matriz de permissões (referência)</h3>
      <div className="mt-3 overflow-x-auto rounded-2xl bg-card shadow-[0_0_0_1px_var(--secondary)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Ação</th>
              <th className="px-4 py-3 font-medium">Diretoria</th>
              <th className="px-4 py-3 font-medium">Chefia</th>
              <th className="px-4 py-3 font-medium">Operacional</th>
            </tr>
          </thead>
          <tbody>
            {MATRIZ.map((row) => (
              <tr key={row[0]} className="border-b last:border-none">
                {row.map((cell, i) => (
                  <td key={i} className={i === 0 ? 'px-4 py-2 text-foreground' : 'px-4 py-2 text-muted-foreground'}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11.5px] text-muted-foreground">
        * Casos com decisão registrada em `rbac-spec.md`: Operacional não cria entrega (sem fluxo de aprovação implementado ainda) e pode editar o descritivo só das entregas das quais é responsável.
      </p>
    </main>
  )
}
