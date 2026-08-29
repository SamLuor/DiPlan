import { Avatar as AvatarRoot, AvatarFallback } from '~/components/ui/avatar'
import { avatarClassFor, initials } from '~/lib/domain'
import { cn } from '~/lib/utils'

export function Avatar({ name, size = 44, className }: { name: string; size?: number; className?: string }) {
  return (
    <AvatarRoot style={{ width: size, height: size }} className={cn('shrink-0', className)}>
      <AvatarFallback className={cn('font-semibold', avatarClassFor(name || '?'))} style={{ fontSize: size * 0.34 }}>
        {initials(name) || '—'}
      </AvatarFallback>
    </AvatarRoot>
  )
}
