'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Eraser } from 'lucide-react'
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
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}
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
            aria-label={`Enter ${symbolFor(value)}${
              left !== undefined
                ? `, ${Math.max(left, 0)} remaining`
                : ''
            }`}
            className={cn(
              'number-pad-key group relative flex aspect-square flex-col items-center justify-center rounded-lg border bg-card font-serif text-lg font-semibold tabular-nums outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
              n > 9 && 'text-base',
              done &&
                'border-transparent bg-secondary text-muted-foreground',
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

/**
 * Mobile keyboard. By default only the system keyboard is used; the custom
 * key panel is opt-in via `showKeys`.
 *
 * The open state is controlled by PlayView.
 *
 * Important:
 * - Selecting another Sudoku cell does NOT close this keyboard.
 * - Inputting a value does NOT close it.
 * - Erasing does NOT close it.
 * - Scrolling does NOT close it.
 * - Only tapping outside the board/controls closes it.
 */
export function MobileKeyboardInput({
  n,
  onInput,
  onErase,
  disabled,
  open,
  onOpen,
  onClose,
  showKeys = false,
}: {
  n: number
  onInput: (value: number) => void
  onErase: () => void
  disabled?: boolean
  open: boolean
  onOpen: () => void
  onClose: () => void
  /** Render the on-screen NumberPad inside the keyboard. Off by default. */
  showKeys?: boolean
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  // True only while the user has deliberately closed the keyboard.
  const closedByUserRef = useRef(false)

  // Time of the last tap that landed on the board / keyboard / controls.
  const lastInsideTapRef = useRef(0)
  const hideRef = useRef<() => void>(() => {})

  const keepFocus = () => {
    const el = inputRef.current
    if (el && document.activeElement !== el) {
      el.focus({ preventScroll: true })
    }
  }

  useEffect(() => {
    if (!open) return

    const INSIDE =
      '.sudoku-board-scroll, [data-sudoku-keyboard], .mobile-only-input'

    // Tap outside the board / keyboard / controls closes it.
    // Tap inside keeps it open and puts focus straight back on the
    // hidden input (synchronously, so mobile browsers keep the OS keyboard up).
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (!target) return
      if (target.closest(INSIDE)) {
        lastInsideTapRef.current = Date.now()
        keepFocus()
      } else {
        hideRef.current()
      }
    }

    // The click fires after the browser has moved focus to the tapped
    // button, so re-assert focus once more here.
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null
      if (target?.closest(INSIDE)) keepFocus()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('click', onClick, true)
    }
  }, [open])

  const focusKeyboard = () => {
    if (disabled) return

    closedByUserRef.current = false
    onOpen()

    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true })
    })
  }

  const hideKeyboard = () => {
    closedByUserRef.current = true
    setValue('')
    inputRef.current?.blur()
    onClose()
  }

  hideRef.current = hideKeyboard

  const consume = (raw: string) => {
    const key = raw.slice(-1)

    setValue('')

    const parsed = valueForKey(key, n)

    if (parsed !== null) {
      onInput(parsed)
    }
  }

  return (
    <>
      {/* Keyboard trigger */}
      {!open && (
        <div className="mobile-keyboard-controls">
          <button
            type="button"
            onClick={focusKeyboard}
            disabled={disabled}
            className="mobile-keyboard-trigger"
            aria-label="Open keyboard"
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
        </div>
      )}

      {/* Custom keyboard (header + hide button + keys).
          Only rendered when showKeys is true. By default nothing is drawn
          and the system keyboard is the only keyboard on small devices. */}
      {open && !disabled && showKeys && (
        <div
          className="fixed inset-x-0 bottom-0 z-[100] border-t bg-background shadow-[0_-8px_30px_rgba(0,0,0,0.15)]"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
          role="dialog"
          aria-label="Sudoku keyboard"
          data-sudoku-keyboard
          // Stop taps here from stealing focus from the hidden input.
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="mx-auto w-full max-w-3xl p-2 sm:p-3">
            {/* Keyboard header */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Keyboard
              </span>

              <button
                type="button"
                onClick={hideKeyboard}
                className="flex size-9 items-center justify-center rounded-full border bg-card text-muted-foreground outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Hide keyboard"
                title="Hide keyboard"
              >
                <ChevronDown
                  className="size-5"
                  aria-hidden="true"
                />
              </button>
            </div>

            {/* Custom keys */}
            <NumberPad
              n={n}
              onInput={onInput}
              onErase={onErase}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {/* Invisible keyboard bridge.
          It is intentionally kept mounted so selection changes do not
          destroy/recreate the input element. */}
      <span style={{ position: 'relative', display: 'block', width: 0, height: 0 }}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => consume(e.target.value)}
          onBlur={() => {
            // Blur right after a tap on the board/keyboard = focus got stolen,
            // not the user dismissing the OS keyboard. Take it back.
            if (
              open &&
              !closedByUserRef.current &&
              Date.now() - lastInsideTapRef.current < 600
            ) {
              keepFocus()
            }
          }}
          onKeyDown={(e) => {
            if (
              e.key === 'Backspace' ||
              e.key === 'Delete'
            ) {
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
          aria-label={`Keyboard input for ${n} by ${n} Sudoku`}
          className="mobile-keyboard-input"
          style={{
            // Lives next to the board controls (inside a zero-size wrapper), so
            // it is already on screen and the browser has nothing to scroll to
            // when it is focused or typed into. 16px font avoids iOS zoom.
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1,
            height: 1,
            padding: 0,
            border: 0,
            opacity: 0,
            fontSize: 16,
            pointerEvents: 'none',
          }}
        />
      </span>
    </>
  )
}
