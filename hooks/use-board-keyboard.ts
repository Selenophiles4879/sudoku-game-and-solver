'use client'

import { useEffect, useEffectEvent } from 'react'
import { valueForKey } from '@/lib/sudoku/config'

type Handlers = {
  n: number
  selected: number | null
  enabled: boolean
  onSelect: (index: number) => void
  onInput: (value: number) => void
  onErase: () => void
  onToggleNotes?: () => void
  onUndo?: () => void
}

export function useBoardKeyboard(handlers: Handlers) {
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    const { n, selected, enabled, onSelect, onInput, onErase, onToggleNotes, onUndo } = handlers
    if (!enabled) return
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      if (onUndo) {
        e.preventDefault()
        onUndo()
      }
      return
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return

    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }
    if (e.key in moves) {
      e.preventDefault()
      const [dr, dc] = moves[e.key]
      const cur = selected ?? 0
      const r = (Math.floor(cur / n) + dr + n) % n
      const c = ((cur % n) + dc + n) % n
      onSelect(selected === null ? 0 : r * n + c)
      return
    }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      e.preventDefault()
      onErase()
      return
    }
    // "N" toggles notes only when N is not a valid symbol for this size.
    if (onToggleNotes && e.key.toLowerCase() === 'n' && valueForKey('n', n) === null) {
      onToggleNotes()
      return
    }
    const value = valueForKey(e.key, n)
    if (value !== null) {
      e.preventDefault()
      onInput(value)
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
