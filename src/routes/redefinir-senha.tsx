import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { queryOptions } from '@tanstack/react-query'
import { ResetPasswordForm } from '~/components/auth/ResetPasswordForm'
import { setPasswordFn, validateSetupTokenFn } from '~/server/api/auth.functions'

const setupTokenQueryOptions = (token: string) =>
  queryOptions({
    queryKey: ['auth', 'setupToken', token],
    queryFn: () => validateSetupTokenFn({ data: { token } }),
  })

export const Route = createFileRoute('/redefinir-senha')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const tokenQuery = useQuery(setupTokenQueryOptions(token))

  const setPasswordMutation = useMutation({
    mutationFn: (senha: string) => setPasswordFn({ data: { token, senha } }),
    onSuccess: () => navigate({ to: '/login', search: { email: '' } }),
  })

  if (!token || (tokenQuery.isSuccess && !tokenQuery.data.valid)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="w-90 rounded-2xl border bg-card px-9 py-10 text-center text-sm text-muted-foreground shadow-[0_0_0_1px_var(--border)]">
          Link inválido ou expirado. Solicite um novo em{' '}
          <a href="/esqueci-senha" className="text-primary">
            Esqueci minha senha
          </a>
          .
        </div>
      </div>
    )
  }

  if (tokenQuery.isPending) return null

  return (
    <ResetPasswordForm
      onSubmit={(senha) => setPasswordMutation.mutate(senha)}
      error={setPasswordMutation.isError ? setPasswordMutation.error.message : null}
    />
  )
}
