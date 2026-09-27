'use client'

import { useCallback, useEffect, useEffectEvent, useMemo, useReducer, useRef, useState } from 'react'
import { CheckCircle2, Eye, Lightbulb, Loader2, PencilLine, RotateCcw, ShieldCheck, Sparkles, Trophy, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CancelledError, useSudokuWorker } from '@/hooks/use-sudoku-worker'
import { useBoardKeyboard } from '@/hooks/use-board-keyboard'
import { DIFFICULTIES, SIZES, findConflicts, getSizeConfig, type Difficulty } from '@/lib/sudoku/config'
import { gameReducer, initialGameState } from '@/lib/sudoku/game-reducer'
import { cn } from '@/lib/utils'
import { NumberPad } from './number-pad'
import { Segmented } from './segmented'
import { StatusLine, type StatusMessage } from './status-line'
import { SudokuBoard, type CellKind } from './sudoku-board'

function formatTime(total: number) {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function PlayView() {
  const worker = useSudokuWorker()
  const [state, dispatch] = useReducer(gameReducer, 9, initialGameState)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [message, setMessage] = useState<StatusMessage | null>(null)
  const [busy, setBusy] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const celebrationPlayed = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Unlock the Web Audio context from a real user interaction. This is important
  // because browsers do not allow a new audio context to start automatically.
  const unlockAudio = useCallback(() => {
    if (typeof window === 'undefined') return

    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) return

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass()
      }

      const context = audioContextRef.current
      if (context.state === 'suspended') {
        void context.resume()
      }
    } catch {
      // Audio is optional; the celebration must still work without it.
    }
  }, [])

  const playCelebrationSound = useCallback(async () => {
    if (typeof window === 'undefined') return

    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) return

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass()
      }

      const context = audioContextRef.current

      if (context.state !== 'running') {
        await context.resume()
      }

      if (context.state !== 'running') return

      const now = context.currentTime + 0.03

      // Bright four-note victory chime.
      const notes = [
        { frequency: 523.25, start: 0, length: 0.24 },
        { frequency: 659.25, start: 0.14, length: 0.24 },
        { frequency: 783.99, start: 0.28, length: 0.28 },
        { frequency: 1046.5, start: 0.44, length: 0.55 },
      ]

      for (const note of notes) {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        const startAt = now + note.start
        const endAt = startAt + note.length

        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(note.frequency, startAt)

        gain.gain.setValueAtTime(0.0001, startAt)
        gain.gain.exponentialRampToValueAtTime(0.22, startAt + 0.025)
        gain.gain.exponentialRampToValueAtTime(0.0001, endAt)

        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.start(startAt)
        oscillator.stop(endAt + 0.03)
      }
    } catch {
      // Do not prevent the congratulations animation if audio is unavailable.
    }
  }, [])

  const newGame = useCallback(
    async (size: number, diff: Difficulty) => {
      dispatch({ type: 'loading', size })
      setMessage(null)
      celebrationPlayed.current = false
      setShowCelebration(false)
      try {
        const { puzzle, solution } = await worker.generate(size, diff)
        dispatch({ type: 'load', size, puzzle, solution })
      } catch (err) {
        if (err instanceof CancelledError) return
        setMessage({ tone: 'error', text: 'Could not generate a puzzle. Please try again.' })
      }
    },
    [worker],
  )

  // Re-runs when the tab becomes visible again; only generate if no puzzle is loaded yet.
  const ensurePuzzle = useEffectEvent(() => {
    if (!state.solution) newGame(state.size, difficulty)
  })
  useEffect(() => {
    ensurePuzzle()
  }, [])

  useEffect(() => {
    if (state.status !== 'playing') return
    const id = setInterval(() => dispatch({ type: 'tick' }), 1000)
    return () => clearInterval(id)
  }, [state.status])

  useEffect(() => {
    if (state.status !== 'won') return

    setMessage({
      tone: 'success',
      text: `Solved in ${formatTime(state.elapsed)}${state.hints ? ` with ${state.hints} hint${state.hints > 1 ? 's' : ''}` : ''}. Beautiful.`,
    })

    if (celebrationPlayed.current) return

    celebrationPlayed.current = true
    setShowCelebration(true)

    // Give React one paint to mount the celebration, then play the chime.
    // The AudioContext was already unlocked by the user's board/number-pad interaction.
    const soundTimer = window.setTimeout(() => {
      void playCelebrationSound()
    }, 30)

    const hideTimer = window.setTimeout(() => {
      setShowCelebration(false)
    }, 4500)

    return () => {
      window.clearTimeout(soundTimer)
      window.clearTimeout(hideTimer)
    }
  }, [state.status, state.elapsed, state.hints, playCelebrationSound])

  useEffect(() => {
    if (state.status === 'playing') {
      celebrationPlayed.current = false
      setShowCelebration(false)
    }
  }, [state.status])

  const n = state.size
  const cfg = useMemo(() => getSizeConfig(n), [n])

  const conflicts = useMemo(() => findConflicts(state.values, cfg), [state.values, cfg])
  const flagged = useMemo(() => new Set(state.flagged), [state.flagged])
  const kinds = useMemo<CellKind[]>(
    () =>
      state.givens.map((g, i) =>
        g ? 'given' : state.status === 'revealed' && state.solution?.[i] ? 'solved' : 'user',
      ),
    [state.givens, state.status, state.solution],
  )
  const remaining = useMemo(() => {
    const counts = new Array<number>(n + 1).fill(n)
    for (const v of state.values) if (v) counts[v]--
    return counts
  }, [state.values, n])

  const filled = state.values.filter(Boolean).length
  const progress = Math.round((filled / (n * n)) * 100)
  const playing = state.status === 'playing'

  const select = useCallback((index: number) => dispatch({ type: 'select', index }), [])
  const input = useCallback((value: number) => dispatch({ type: 'input', value }), [])
  const erase = useCallback(() => dispatch({ type: 'erase' }), [])

  useBoardKeyboard({
    n,
    selected: state.selected,
    enabled: state.status !== 'loading',
    onSelect: select,
    onInput: input,
    onErase: erase,
    onToggleNotes: () => dispatch({ type: 'toggleNotes' }),
    onUndo: () => dispatch({ type: 'undo' }),
  })

  const hint = async () => {
    const empties = state.values.flatMap((v, i) => (v ? [] : [i]))
    if (empties.length === 0) return
    const target =
      state.selected !== null && !state.values[state.selected]
        ? state.selected
        : empties[Math.floor(Math.random() * empties.length)]
    setBusy(true)
    try {
      const res = await worker.solve(n, state.values, 6000)
      if (res.status === 'solved' && res.solution) {
        dispatch({ type: 'hint', index: target, value: res.solution[target] })
        setMessage(null)
      } else if (res.status === 'timeout') {
        setMessage({ tone: 'error', text: 'The hint search took too long. Try again after a few more moves.' })
      } else {
        setMessage({
          tone: 'error',
          text: 'Your current entries lead to a dead end. Use Check to find the problem, or undo.',
        })
      }
    } catch (err) {
      if (!(err instanceof CancelledError)) setMessage({ tone: 'error', text: 'Hint failed. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  const check = async () => {
    if (conflicts.size) {
      setMessage({ tone: 'error', text: `There ${conflicts.size === 1 ? 'is' : 'are'} ${conflicts.size} conflicting cells highlighted in red.` })
      return
    }
    setBusy(true)
    try {
      const res = await worker.solve(n, state.values, 6000)
      if (res.status === 'solved') {
        setMessage({ tone: 'success', text: 'Everything checks out so far. Keep going.' })
      } else if (state.solution) {
        const wrong = state.values.flatMap((v, i) =>
          v && !state.givens[i] && v !== state.solution![i] ? [i] : [],
        )
        dispatch({ type: 'flag', indices: wrong })
        setMessage({
          tone: 'error',
          text: `Dead end ahead: ${wrong.length} entr${wrong.length === 1 ? 'y' : 'ies'} can't be part of a solution.`,
        })
      }
    } catch (err) {
      if (!(err instanceof CancelledError)) setMessage({ tone: 'error', text: 'Check failed. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10"
      onPointerDownCapture={unlockAudio}
      onKeyDownCapture={unlockAudio}
    >
      {showCelebration && (
        <div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-foreground/10 p-4 backdrop-blur-[2px]"
          role="status"
          aria-live="assertive"
          aria-label="Congratulations, Sudoku solved"
        >
          <div className="sudoku-celebration-card relative w-full max-w-sm rounded-3xl border bg-card px-6 py-8 text-center shadow-2xl sm:px-10">
            <div className="sudoku-celebration-sparkles absolute inset-0 overflow-hidden rounded-3xl" aria-hidden="true">
              {Array.from({ length: 18 }, (_, i) => (
                <span key={i} style={{ '--i': i } as React.CSSProperties} />
              ))}
            </div>
            <div className="relative mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Trophy className="size-10 sudoku-trophy-pop" aria-hidden="true" />
            </div>
            <p className="relative text-xs font-semibold uppercase tracking-[0.22em] text-primary">Puzzle complete</p>
            <h2 className="relative mt-2 font-serif text-4xl font-semibold tracking-tight">Congratulations!</h2>
            <p className="relative mt-2 text-sm text-muted-foreground">
              You solved the {n}×{n} Sudoku in {formatTime(state.elapsed)}.
            </p>
            <div className="relative mt-5 flex items-center justify-center gap-2 text-sm font-medium text-foreground">
              <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
              Nicely done!
            </div>
          </div>
        </div>
      )}
      <section aria-label="Game board" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <span className="font-serif text-xl font-semibold">
              {n}×{n}
            </span>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
              {difficulty}
            </span>
          </div>
          <div className="flex items-center gap-4 tabular-nums text-muted-foreground">
            <span aria-label="Progress">{progress}%</span>
            <span aria-label="Elapsed time" className="font-medium text-foreground">
              {formatTime(state.elapsed)}
            </span>
          </div>
        </div>
        <div className="relative">
          <SudokuBoard
            cfg={cfg}
            values={state.values}
            kinds={kinds}
            notes={state.notes}
            selected={state.selected}
            conflicts={conflicts}
            flagged={flagged}
            onSelect={select}
            dimmed={state.status === 'loading'}
          />
          {state.status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium shadow-sm">
                <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
                Generating {n}×{n} puzzle…
              </div>
            </div>
          )}
        </div>
        <StatusLine message={message} />
      </section>

      <aside className="flex flex-col gap-5" aria-label="Game controls">
        <Segmented
          label="Grid size"
          options={SIZES.map((s) => ({ value: s.n, label: `${s.n}×${s.n}` }))}
          value={state.size}
          onChange={(size) => newGame(size, difficulty)}
          className="[&_[role=radiogroup]]:grid [&_[role=radiogroup]]:grid-cols-3"
        />
        <Segmented
          label="Difficulty"
          options={DIFFICULTIES.map((d) => ({ value: d, label: d[0].toUpperCase() + d.slice(1) }))}
          value={difficulty}
          onChange={(d) => {
            setDifficulty(d)
            newGame(state.size, d)
          }}
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Input</span>
            <button
              type="button"
              aria-pressed={state.notesMode}
              disabled={n > 9 || !playing}
              onClick={() => dispatch({ type: 'toggleNotes' })}
              title={n > 9 ? 'Notes are available up to 9×9' : 'Toggle notes (N)'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                state.notesMode ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground',
              )}
            >
              <PencilLine className="size-3.5" aria-hidden="true" />
              Notes {state.notesMode ? 'on' : 'off'}
            </button>
          </div>
          <NumberPad n={n} remaining={remaining} onInput={input} onErase={erase} disabled={!playing} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => dispatch({ type: 'undo' })} disabled={!playing || !state.history.length}>
            <Undo2 aria-hidden="true" /> Undo
          </Button>
          <Button variant="outline" onClick={hint} disabled={!playing || busy}>
            <Lightbulb aria-hidden="true" /> Hint
          </Button>
          <Button variant="outline" onClick={check} disabled={!playing || busy}>
            <ShieldCheck aria-hidden="true" /> Check
          </Button>
          <Button variant="outline" onClick={() => dispatch({ type: 'reveal' })} disabled={!playing}>
            <Eye aria-hidden="true" /> Reveal
          </Button>
          <Button variant="ghost" onClick={() => dispatch({ type: 'reset' })} disabled={state.status === 'loading'}>
            <RotateCcw aria-hidden="true" /> Restart
          </Button>
          <Button onClick={() => newGame(state.size, difficulty)} disabled={state.status === 'loading'}>
            <Sparkles aria-hidden="true" /> New game
          </Button>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Use arrow keys to move, type {n > 9 ? '1–9 and letters' : 'numbers'} to fill, Backspace to erase
          {n <= 9 ? ', N for notes' : ''} and Ctrl/⌘+Z to undo.
          {n > 9 && ' Values above 9 are shown as letters (A = 10, B = 11…).'}
        </p>
      </aside>
    </div>
  )
}
