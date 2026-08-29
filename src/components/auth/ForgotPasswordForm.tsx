import { useState, type FormEvent } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

interface ForgotPasswordFormProps {
  initialEmail: string
  sent: boolean
  onSubmit: (email: string) => void
  onBackToLogin: () => void
}

export function ForgotPasswordForm({ initialEmail, sent, onSubmit, onBackToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState(initialEmail)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    onSubmit(email)
  }

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="flex w-90 flex-col gap-5.5 rounded-2xl border bg-card px-9 py-10 text-card-foreground shadow-[0_0_0_1px_var(--border)]"
      >
        <div>
          <h1 className="mb-1.5 text-[22px] font-medium tracking-tight text-foreground">Recuperar senha</h1>
          <p className="text-sm text-muted-foreground">Informe seu e-mail para receber um link de redefinição.</p>
        </div>
        {sent ? (
          <div className="rounded-lg bg-accent p-3.5 text-sm leading-relaxed text-accent-foreground">
            Se <strong>{email}</strong> estiver cadastrado, enviamos um link de definição de senha. Verifique sua caixa de entrada.
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email">E-mail</Label>
              <Input id="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" />
            </div>
            <Button type="submit" variant="outline" className="h-10.5 border-primary text-primary hover:bg-accent hover:text-primary">
              Enviar link
            </Button>
          </>
        )}
        <button type="button" onClick={onBackToLogin} className="text-center text-[13px] text-muted-foreground hover:text-foreground">
          Voltar para o login
        </button>
      </form>
    </div>
  )
}
