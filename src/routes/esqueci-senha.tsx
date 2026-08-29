import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { ForgotPasswordForm } from '~/components/auth/ForgotPasswordForm'
import { requestPasswordSetupFn } from '~/server/api/auth.functions'

export const Route = createFileRoute('/esqueci-senha')({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === 'string' ? search.email : '',
  }),
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const { email } = Route.useSearch()
  const navigate = useNavigate()

  const requestMutation = useMutation({
    mutationFn: (input: { email: string }) => requestPasswordSetupFn({ data: input }),
  })

  return (
    <ForgotPasswordForm
      initialEmail={email}
      sent={requestMutation.isSuccess}
      onSubmit={(sentEmail) => requestMutation.mutate({ email: sentEmail })}
      onBackToLogin={() => navigate({ to: '/login', search: { email: '' } })}
    />
  )
}
