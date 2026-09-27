'use client'

import { Eraser } from 'lucide-react'
import { symbolFor } from '@/lib/sudoku/config'
import { cn } from '@/lib/utils'

export function NumberPad({
  n,
  remaining,
  onInput,
  onErase,
  disabled,
}: {
  n: number
  remaining?: number[]
  onInput: (value: number) => void
  onErase: () => void
  disabled?: boolean
}) {
  const cols = n <= 6 ? n + 1 : n <= 9 ? 5 : n <= 16 ? 6 : 7
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      aria-label="Number pad"
    >
      {Array.from({ length: n }, (_, k) => {
        const value = k + 1
        const left = remaining?.[value]
        const done = left !== undefined && left <= 0
        return (
          <button
            key={value}
            type="button"
            disabled={disabled}
            onClick={() => onInput(value)}
            aria-label={`Enter ${symbolFor(value)}${left !== undefined ? `, ${Math.max(left, 0)} remaining` : ''}`}
            className={cn(
              'group relative flex aspect-square flex-col items-center justify-center rounded-lg border bg-card font-serif text-lg font-semibold tabular-nums outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
              n > 9 && 'text-base',
              done && 'border-transparent bg-secondary text-muted-foreground',
            )}
          >
            {symbolFor(value)}
            {left !== undefined && (
              <span className="font-sans text-[0.6rem] font-normal leading-none text-muted-foreground">
                {Math.max(left, 0)}
              </span>
            )}
          </button>
        )
      })}
      <button
        type="button"
        disabled={disabled}
        onClick={onErase}
        aria-label="Erase cell"
        className="flex aspect-square items-center justify-center rounded-lg border border-dashed bg-card text-muted-foreground outline-none transition-colors hover:border-destructive hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <Eraser className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
