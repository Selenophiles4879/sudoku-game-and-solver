'use client'

import { cn } from '@/lib/utils'

type Option<T extends string | number> = { value: T; label: string }

export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled,
  className,
}: {
  label: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-lg bg-secondary p-1">
        {options.map((opt) => {
          const active = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex-1 rounded-md px-2.5 py-1.5 text-sm font-medium tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                active
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
