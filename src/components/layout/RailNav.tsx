import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, LayoutGrid, LogOut, Settings, Users } from 'lucide-react'
import { cn } from '~/lib/utils'
import { logoutFn } from '~/server/api/auth.functions'

const railBtn = 'flex size-10 items-center justify-center rounded-lg border-none text-white/60 transition-colors'

export function RailNav() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

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
        <button type="button" title="Usuários" onClick={() => navigate({ to: '/app/usuarios' })} className={itemClass(pathname.startsWith('/app/usuarios'))}>
          <Users className="size-5" />
        </button>
        <button type="button" title="Calendário" onClick={() => navigate({ to: '/app/calendario' })} className={itemClass(pathname.startsWith('/app/calendario'))}>
          <Calendar className="size-5" />
        </button>
      </div>
      <div className="relative mt-auto flex flex-col gap-1.5">
        <button type="button" title="Configurações" onClick={() => navigate({ to: '/app/usuarios' })} className={itemClass(false)}>
          <Settings className="size-4.5" />
        </button>
        <button type="button" title="Sair" onClick={() => logoutMutation.mutate()} className={itemClass(false)}>
          <LogOut className="size-4.5" />
        </button>
      </div>
    </nav>
  )
}
