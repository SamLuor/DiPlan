import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LoginForm } from '~/components/auth/LoginForm'
import { currentUserQueryOptions, loginFn } from '~/server/api/auth.functions'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === 'string' ? search.email : '',
  }),
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQueryOptions())
    if (user) throw redirect({ to: '/app/eixos' })
  },
  component: LoginPage,
})

function LoginPage() {
  const { email } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const loginMutation = useMutation({
    mutationFn: (input: { email: string; senha: string }) => loginFn({ data: input }),
    onSuccess: (user) => {
      queryClient.setQueryData(['auth', 'currentUser'], user)
      navigate({ to: '/app/eixos' })
    },
  })

  return (
    <LoginForm
      initialEmail={email}
      onSubmit={(loginEmail, senha) => loginMutation.mutate({ email: loginEmail, senha })}
      error={loginMutation.isError ? 'E-mail ou senha inválidos.' : null}
      onForgotClick={(loginEmail) => navigate({ to: '/esqueci-senha', search: { email: loginEmail } })}
    />
  )
}
