import { CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusMessage = { tone: 'info' | 'success' | 'error'; text: string }

export function StatusLine({ message }: { message: StatusMessage | null }) {
  const Icon = message?.tone === 'success' ? CheckCircle2 : message?.tone === 'error' ? TriangleAlert : Info
  return (
    <div role="status" aria-live="polite" className="min-h-10">
      {message && (
        <p
          className={cn(
            'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
            message.tone === 'success' && 'border-primary/30 bg-primary/8 text-foreground',
            message.tone === 'error' && 'border-destructive/30 bg-destructive/8 text-destructive',
            message.tone === 'info' && 'bg-card text-muted-foreground',
          )}
        >
          <Icon
            className={cn('mt-0.5 size-4 shrink-0', message.tone === 'success' && 'text-primary')}
            aria-hidden="true"
          />
          {message.text}
        </p>
      )}
    </div>
  )
}
