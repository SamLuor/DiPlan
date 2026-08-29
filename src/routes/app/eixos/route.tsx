import { createFileRoute, Outlet } from '@tanstack/react-router'
import { EixosSidebar } from '~/components/eixos/EixosSidebar'

export const Route = createFileRoute('/app/eixos')({
  component: EixosLayout,
})

function EixosLayout() {
  return (
    <>
      <EixosSidebar />
      <Outlet />
    </>
  )
}
