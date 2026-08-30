import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, CheckCircle2, LayoutGrid, LogOut, Settings, ShieldCheck, Users } from 'lucide-react'
import { cn } from '~/lib/utils'
import { currentUserQueryOptions, logoutFn } from '~/server/api/auth.functions'
import { entregasQueryOptions } from '~/server/api/entregas.functions'

const railBtn = 'relative flex size-10 items-center justify-center rounded-lg border-none text-white/60 transition-colors'

export function RailNav() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { data: currentUser } = useQuery(currentUserQueryOptions())
  const { data: entregas = [] } = useQuery(entregasQueryOptions())
  const pendentesAprovacao = entregas.filter((e) => e.situacao === 'aguardando aprovação').length

  const logoutMutation = useMutation({
    mutationFn: () => logoutFn(),
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'currentUser'], null)
      navigate({ to: '/login', search: { email: '' } })
    },
  })

  function itemClass(active: boolean) {
    return cn(railBtn, active ? 'bg-white/20 text-white' : 'hover:text-white/80')
  }

  return (
    <nav className="relative flex w-16 flex-none flex-col items-center py-3.5">
      <div className="relative mb-5 flex size-8 items-center justify-center rounded-lg bg-white/18 text-sm font-semibold text-white">GE</div>
      <div className="relative flex flex-col gap-1.5">
        <button type="button" title="Eixos" onClick={() => navigate({ to: '/app/eixos' })} className={itemClass(pathname.startsWith('/app/eixos'))}>
          <LayoutGrid className="size-5" />
        </button>
        {currentUser?.perfil === 'diretoria' && (
          <button type="button" title="Usuários" onClick={() => navigate({ to: '/app/usuarios' })} className={itemClass(pathname.startsWith('/app/usuarios'))}>
            <Users className="size-5" />
          </button>
        )}
        <button type="button" title="Calendário" onClick={() => navigate({ to: '/app/calendario' })} className={itemClass(pathname.startsWith('/app/calendario'))}>
          <Calendar className="size-5" />
        </button>
        {(currentUser?.perfil === 'diretoria' || currentUser?.perfil === 'chefia') && (
          <button
            type="button"
            title="Solicitações de Aprovação"
            onClick={() => navigate({ to: '/app/aprovacoes' })}
            className={itemClass(pathname.startsWith('/app/aprovacoes'))}
          >
            <CheckCircle2 className="size-5" />
            {pendentesAprovacao > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-white">
                {pendentesAprovacao}
              </span>
            )}
          </button>
        )}
        {currentUser?.perfil === 'diretoria' && (
          <button
            type="button"
            title="Perfil e Permissões"
            onClick={() => navigate({ to: '/app/admin/permissoes' })}
            className={itemClass(pathname.startsWith('/app/admin/permissoes'))}
          >
            <ShieldCheck className="size-5" />
          </button>
        )}
      </div>
      <div className="relative mt-auto flex flex-col gap-1.5">
        {currentUser?.perfil === 'diretoria' && (
          <button type="button" title="Configurações" onClick={() => navigate({ to: '/app/usuarios' })} className={itemClass(false)}>
            <Settings className="size-4.5" />
          </button>
        )}
        <button type="button" title="Sair" onClick={() => logoutMutation.mutate()} className={itemClass(false)}>
          <LogOut className="size-4.5" />
        </button>
      </div>
    </nav>
  )
}
