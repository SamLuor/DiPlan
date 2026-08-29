import { useState, type FormEvent } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

interface ResetPasswordFormProps {
  onSubmit: (senha: string) => void
  error?: string | null
}

export function ResetPasswordForm({ onSubmit, error: submitError }: ResetPasswordFormProps) {
  const [senha, setSenha] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!senha || senha !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    onSubmit(senha)
  }

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="flex w-90 flex-col gap-5.5 rounded-2xl border bg-card px-9 py-10 text-card-foreground shadow-[0_0_0_1px_var(--border)]"
      >
        <div>
          <div className="mb-4.5 flex size-10 items-center justify-center rounded-full bg-accent">
            <Lock className="size-4.5 text-accent-foreground" />
          </div>
          <h1 className="mb-1.5 text-[22px] font-medium tracking-tight text-foreground">Definir sua senha</h1>
          <p className="text-sm text-muted-foreground">Escolha uma senha de pelo menos 6 caracteres.</p>
        </div>
        <div className="flex flex-col gap-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="reset-senha">Nova senha</Label>
            <Input id="reset-senha" type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reset-confirm">Confirmar senha</Label>
            <Input id="reset-confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
          </div>
          {mismatch && <div className="text-xs text-destructive">As senhas não coincidem.</div>}
          {submitError && <div className="text-xs text-destructive">{submitError}</div>}
        </div>
        <Button type="submit" variant="outline" className="h-10.5 border-primary text-primary hover:bg-accent hover:text-primary">
          Salvar senha
        </Button>
      </form>
    </div>
  )
}
