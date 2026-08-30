import { createFileRoute, redirect } from '@tanstack/react-router'
import { UsuariosList } from '~/components/usuarios/UsuariosList'

export const Route = createFileRoute('/app/usuarios')({
  beforeLoad: ({ context }) => {
    if (context.user?.perfil !== 'diretoria') throw redirect({ to: '/app/eixos' })
  },
  component: UsuariosList,
})
