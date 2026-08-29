import { useQuery } from '@tanstack/react-query'
import { UsuarioCard } from './UsuarioCard'
import { Button } from '~/components/ui/button'
import { usuariosQueryOptions } from '~/server/api/usuarios.functions'
import { useUiStore } from '~/store/useUiStore'

export function UsuariosList() {
  const { data: usuarios = [] } = useQuery(usuariosQueryOptions())
  const openUsuarioModal = useUiStore((s) => s.openUsuarioModal)

  return (
    <main className="flex flex-1 flex-col overflow-hidden rounded-3xl bg-gray-50">
      <div className="flex items-center justify-between gap-4 px-8 pt-6.5">
        <h2 className="text-[25px] font-medium tracking-tight text-foreground">Usuários</h2>
        <Button variant="dashed" className="border-primary text-primary hover:bg-accent hover:text-primary" onClick={() => openUsuarioModal({ mode: 'create', eixoId: null })}>
          + Novo usuário
        </Button>
      </div>
      <div className="flex-1 overflow-auto px-8 pt-5.5 pb-7">
        {usuarios.length > 0 ? (
          <div className="flex flex-col gap-3.5">
            {usuarios.map((u) => (
              <UsuarioCard key={u.id} usuario={u} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-xl bg-card p-6">
            <div className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</div>
            <Button variant="outline" className="border-primary text-primary hover:bg-accent hover:text-primary" onClick={() => openUsuarioModal({ mode: 'create', eixoId: null })}>
              + Novo usuário
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
