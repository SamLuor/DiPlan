import { createFileRoute, redirect } from '@tanstack/react-router'
import { currentUserQueryOptions } from '~/server/api/auth.functions'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQueryOptions())
    if (user) throw redirect({ to: '/app/eixos' })
    throw redirect({ to: '/login', search: { email: '' } })
  },
})
