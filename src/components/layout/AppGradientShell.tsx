import type { ReactNode } from 'react'
import { RailNav } from './RailNav'

export function AppGradientShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-screen w-full gap-3 bg-[linear-gradient(160deg,#0d7a4d_0%,#0A6941_45%,#085636_100%)] p-3 pt-1 pr-1 pb-1 pl-1">
      <div className="pointer-events-none absolute inset-0 opacity-50 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_1px,transparent_1px,transparent_10px)]" />
      <div className="pointer-events-none absolute -top-15 -left-15 h-55 w-55 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_70%)]" />
      <RailNav />
      {children}
    </div>
  )
}
