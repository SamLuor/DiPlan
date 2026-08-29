import type { ReactNode } from 'react'
import { Label } from '~/components/ui/label'

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
