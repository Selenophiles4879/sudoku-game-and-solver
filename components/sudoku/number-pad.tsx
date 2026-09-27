'use client'

import { useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { symbolFor, valueForKey } from '@/lib/sudoku/config'
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
      className="sudoku-number-pad grid gap-1.5"
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
              'number-pad-key group relative flex aspect-square flex-col items-center justify-center rounded-lg border bg-card font-serif text-lg font-semibold tabular-nums outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
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
        className="number-pad-key flex aspect-square items-center justify-center rounded-lg border border-dashed bg-card text-muted-foreground outline-none transition-colors hover:border-destructive hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <Eraser className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}


/** Mobile bridge that opens the device's native keyboard on demand. */
export function MobileKeyboardInput({
  n,
  onInput,
  onErase,
  disabled,
}: {
  n: number
  onInput: (value: number) => void
  onErase: () => void
  disabled?: boolean
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const focusKeyboard = () => {
    if (!disabled) inputRef.current?.focus({ preventScroll: true })
  }

  const consume = (raw: string) => {
    const key = raw.slice(-1)
    setValue('')
    const parsed = valueForKey(key, n)
    if (parsed !== null) onInput(parsed)
  }

  return (
    <div className="mobile-keyboard-controls">
      <button
        type="button"
        onClick={focusKeyboard}
        disabled={disabled}
        className="mobile-keyboard-trigger"
        aria-label="Open device keyboard"
      >
        <span aria-hidden="true">⌨</span>
        Keyboard
      </button>
      <button
        type="button"
        onClick={onErase}
        disabled={disabled}
        className="mobile-keyboard-erase"
        aria-label="Erase selected cell"
      >
        <Eraser className="size-4" aria-hidden="true" />
        Erase
      </button>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => consume(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault()
            setValue('')
            onErase()
          }
        }}
        inputMode={n <= 9 ? 'numeric' : 'text'}
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        maxLength={1}
        disabled={disabled}
        aria-label={`Device keyboard input for ${n} by ${n} Sudoku`}
        className="mobile-keyboard-input"
      />
    </div>
  )
}
