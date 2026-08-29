import { useState, type FormEvent } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

interface LoginFormProps {
  initialEmail?: string
  onSubmit: (email: string, senha: string) => void
  onForgotClick: (email: string) => void
  error?: string | null
}

export function LoginForm({ initialEmail = '', onSubmit, onForgotClick, error }: LoginFormProps) {
  const [email, setEmail] = useState(initialEmail)
  const [senha, setSenha] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit(email, senha)
  }

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="flex w-90 flex-col gap-5.5 rounded-2xl border bg-card px-9 py-10 text-card-foreground shadow-[0_0_0_1px_var(--border)]"
      >
        <div>
          <div className="mb-4.5 flex size-10 items-center justify-center rounded-full bg-accent">
            <span className="text-lg font-semibold text-accent-foreground">E</span>
          </div>
          <h1 className="mb-1.5 text-[22px] font-medium tracking-tight text-foreground">Gestão de Entregas</h1>
          <p className="text-sm text-muted-foreground">Entre para acompanhar os eixos e planos.</p>
        </div>
        <div className="flex flex-col gap-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">E-mail</Label>
            <Input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-senha">Senha</Label>
            <Input id="login-senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
          </div>
        </div>
        {error && <div className="-mt-1.5 text-xs text-destructive">{error}</div>}
        <Button type="submit" variant="outline" className="mt-0.5 h-10.5 border-primary text-primary hover:bg-accent hover:text-primary">
          Entrar
        </Button>
        <button type="button" onClick={() => onForgotClick(email)} className="text-center text-[13px] text-muted-foreground hover:text-foreground">
          Esqueceu sua senha?
        </button>
      </form>
    </div>
  )
}
