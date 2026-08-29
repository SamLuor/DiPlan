import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { AppGradientShell } from '~/components/layout/AppGradientShell'
import { EntregaDetailPanel } from '~/components/entregas/EntregaDetailPanel'
import { EixoModal } from '~/components/eixos/EixoModal'
import { PlanoModal } from '~/components/planos/PlanoModal'
import { UsuarioModal } from '~/components/usuarios/UsuarioModal'
import { EntregaModal } from '~/components/entregas/EntregaModal'
import { SolicitacaoModal } from '~/components/entregas/SolicitacaoModal'
import { currentUserQueryOptions } from '~/server/api/auth.functions'

export const Route = createFileRoute('/app')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQueryOptions())
    if (!user) throw redirect({ to: '/login', search: { email: '' } })
    return { user }
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <>
      <AppGradientShell>
        <Outlet />
      </AppGradientShell>
      <EntregaDetailPanel />
      <EixoModal />
      <PlanoModal />
      <UsuarioModal />
      <EntregaModal />
      <SolicitacaoModal />
    </>
  )
}
