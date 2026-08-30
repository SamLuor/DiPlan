import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { cn } from '~/lib/utils'
import { eixosQueryOptions } from '~/server/api/eixos.functions'
import { currentUserQueryOptions } from '~/server/api/auth.functions'
import { useUiStore } from '~/store/useUiStore'
import { useAbility } from '~/hooks/useAbility'

export function EixosSidebar() {
  const navigate = useNavigate()
  const { data: eixos = [] } = useQuery(eixosQueryOptions())
  const { data: currentUser } = useQuery(currentUserQueryOptions())
  const openEixoModal = useUiStore((s) => s.openEixoModal)
  const { eixoId: selectedEixoId } = useParams({ strict: false })
  const ability = useAbility()
  const podeAdministrar = ability.can('administrar', 'Eixo')

  return (
    <aside className="relative flex w-53 flex-none flex-col overflow-hidden overflow-y-auto border-l border-white/10 bg-[linear-gradient(90deg,#FFFFFF15_0%,transparent_100%)] py-5 px-3 animate-[slideFadeIn_0.32s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className="px-2 pb-3.5">
        <div className="text-[15px] font-semibold text-white">Gestão de Entregas</div>
        <div className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-white/60">{currentUser?.email || 'usuário'}</div>
      </div>
      <div className="mb-1.5 px-2 text-[11px] tracking-widest text-white/50 uppercase">Eixos</div>
      <div className="flex flex-col gap-0.5">
        {eixos.map((eixo) => {
          const isSelected = eixo.id === selectedEixoId
          return (
            <div key={eixo.id} className={cn('flex items-center rounded-lg', isSelected && 'bg-white/20')}>
              <button
                type="button"
                onClick={() => navigate({ to: '/app/eixos/$eixoId', params: { eixoId: eixo.id } })}
                className={cn(
                  'flex-1 truncate rounded-lg py-2.25 pr-1 pl-3 text-left text-sm text-white/85',
                  isSelected && 'font-medium text-white',
                )}
              >
                {eixo.nome}
              </button>
              {podeAdministrar && (
                <button
                  type="button"
                  title="Editar eixo"
                  onClick={(e) => {
                    e.stopPropagation()
                    openEixoModal({ mode: 'edit', eixoId: eixo.id })
                  }}
                  className={cn('mr-1 flex size-7 flex-none items-center justify-center rounded-md text-white/40', isSelected && 'text-white/80')}
                >
                  <Pencil className="size-3" />
                </button>
              )}
            </div>
          )
        })}
        {podeAdministrar && (
          <button
            type="button"
            onClick={() => openEixoModal({ mode: 'create' })}
            className="mt-1.5 flex items-center gap-2 rounded-lg border border-dashed border-white/30 px-3 py-2.25 text-sm text-white/75"
          >
            <Plus className="size-3.5" />
            Novo eixo
          </button>
        )}
      </div>
    </aside>
  )
}
