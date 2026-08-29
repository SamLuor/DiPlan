import { createFileRoute } from '@tanstack/react-router'
import { UsuariosList } from '~/components/usuarios/UsuariosList'

export const Route = createFileRoute('/app/usuarios')({
  component: UsuariosList,
})
