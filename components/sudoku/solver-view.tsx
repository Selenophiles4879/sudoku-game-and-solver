'use client'

import { useCallback, useMemo, useState } from 'react'
import { Eraser, Loader2, Shuffle, Square, Wand2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CancelledError, useSudokuWorker } from '@/hooks/use-sudoku-worker'
import { useBoardKeyboard } from '@/hooks/use-board-keyboard'
import { SIZES, findConflicts, getSizeConfig } from '@/lib/sudoku/config'
import { MobileKeyboardInput, NumberPad } from './number-pad'
import { Segmented } from './segmented'
import { StatusLine, type StatusMessage } from './status-line'
import { SudokuBoard, type CellKind } from './sudoku-board'

const blank = (n: number) => new Array<number>(n * n).fill(0)

export function SolverView() {
  const worker = useSudokuWorker()
  const [size, setSize] = useState(9)
  const [clues, setClues] = useState<number[]>(() => blank(9))
  const [solution, setSolution] = useState<number[] | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [loadingSample, setLoadingSample] = useState(false)
  const [message, setMessage] = useState<StatusMessage | null>({
    tone: 'info',
    text: 'Enter the clues you know, then press Solve. Any size up to 25×25 works.',
  })

  const cfg = getSizeConfig(size)
  const n = cfg.n
  const values = solution ?? clues
  const conflicts = useMemo(() => findConflicts(clues, cfg), [clues, cfg])
  const kinds = useMemo<CellKind[]>(() => clues.map((v) => (v ? 'given' : 'solved')), [clues])
  const clueCount = clues.filter(Boolean).length
  const busy = running || loadingSample

  const changeSize = (next: number) => {
    worker.cancel()
    setRunning(false)
    setLoadingSample(false)
    setSize(next)
    setClues(blank(next))
    setSolution(null)
    setSelected(null)
    setMessage(null)
  }

  const setCell = useCallback(
    (value: number) => {
      if (selected === null || busy) return
      setSolution(null)
      setClues((prev) => {
        const next = prev.slice()
        next[selected] = prev[selected] === value ? 0 : value
        return next
      })
    },
    [selected, busy],
  )
  const erase = useCallback(() => setCell(0), [setCell])

  useBoardKeyboard({
    n,
    selected,
    enabled: true,
    onSelect: setSelected,
    onInput: setCell,
    onErase: erase,
  })

  const runSolve = async () => {
    if (conflicts.size) {
      setMessage({ tone: 'error', text: 'Fix the conflicting clues highlighted in red before solving.' })
      return
    }
    setRunning(true)
    setMessage({ tone: 'info', text: `Solving ${n}×${n}…` })
    try {
      const res = await worker.solve(n, clues, 30_000)
      if (res.status === 'solved' && res.solution) {
        setSolution(res.solution)
        setMessage({
          tone: 'success',
          text: `Solved in ${res.ms < 1 ? '<1' : res.ms} ms after exploring ${res.nodes.toLocaleString()} positions.`,
        })
      } else if (res.status === 'unsolvable') {
        setMessage({ tone: 'error', text: 'This puzzle has no solution. Double-check your clues.' })
      } else if (res.status === 'invalid') {
        setMessage({ tone: 'error', text: 'Those clues break the rules of sudoku.' })
      } else {
        setMessage({
          tone: 'error',
          text: 'Gave up after 30 seconds. Add a few more clues to narrow the search.',
        })
      }
    } catch (err) {
      if (err instanceof CancelledError) setMessage({ tone: 'info', text: 'Solving cancelled.' })
      else setMessage({ tone: 'error', text: 'Something went wrong while solving.' })
    } finally {
      setRunning(false)
    }
  }

  const loadSample = async () => {
    setLoadingSample(true)
    setSolution(null)
    try {
      const { puzzle } = await worker.generate(n, 'hard')
      setClues(puzzle)
      setMessage({ tone: 'info', text: `Loaded a random ${n}×${n} puzzle with ${puzzle.filter(Boolean).length} clues.` })
    } catch (err) {
      if (!(err instanceof CancelledError)) setMessage({ tone: 'error', text: 'Could not load a sample puzzle.' })
    } finally {
      setLoadingSample(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
      <section aria-label="Solver board" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-serif text-xl font-semibold">
            {n}×{n} solver
          </span>
          <span className="tabular-nums text-muted-foreground">
            {clueCount} clue{clueCount === 1 ? '' : 's'}
          </span>
        </div>
        <div className="relative">
          <SudokuBoard
            cfg={cfg}
            values={values}
            kinds={kinds}
            selected={selected}
            conflicts={conflicts}
            onSelect={setSelected}
            dimmed={busy}
          />
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium shadow-sm">
                <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
                {running ? 'Searching…' : 'Loading puzzle…'}
              </div>
            </div>
          )}
        </div>
        <StatusLine message={message} />
        <div className="mobile-only-input" aria-label="Mobile input controls">
          <div className="mobile-input-heading">
            <span>Enter clues</span>
            {selected !== null && <span>Cell {selected + 1}</span>}
          </div>
          <div className="mobile-input-row">
            <MobileKeyboardInput n={n} onInput={setCell} onErase={erase} disabled={busy} />
          </div>
        </div>
      </section>

      <aside className="flex flex-col gap-5" aria-label="Solver controls">
        <Segmented
          label="Grid size"
          options={SIZES.map((s) => ({ value: s.n, label: `${s.n}×${s.n}` }))}
          value={size}
          onChange={changeSize}
          className="[&_[role=radiogroup]]:grid [&_[role=radiogroup]]:grid-cols-3"
        />

        <div className="mobile-input-panel hidden flex-col gap-2 sm:flex">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Enter clues</span>
          <NumberPad n={n} onInput={setCell} onErase={erase} disabled={busy} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {running ? (
            <Button variant="destructive" className="col-span-2" onClick={() => worker.cancel()}>
              <Square aria-hidden="true" /> Stop solving
            </Button>
          ) : (
            <Button className="col-span-2" onClick={runSolve} disabled={busy || clueCount === 0}>
              <Wand2 aria-hidden="true" /> Solve puzzle
            </Button>
          )}
          <Button variant="outline" onClick={loadSample} disabled={busy}>
            <Shuffle aria-hidden="true" /> Sample
          </Button>
          <Button variant="outline" onClick={() => setSolution(null)} disabled={busy || !solution}>
            <X aria-hidden="true" /> Unsolve
          </Button>
          <Button
            variant="ghost"
            className="col-span-2"
            onClick={() => {
              setClues(blank(n))
              setSolution(null)
              setMessage(null)
            }}
            disabled={busy || clueCount === 0}
          >
            <Eraser aria-hidden="true" /> Clear board
          </Button>
        </div>

        <ul className="grid grid-cols-2 gap-3 text-xs text-muted-foreground" aria-label="Legend">
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="font-serif text-base font-semibold text-foreground">
              7
            </span>
            Your clues
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="text-base font-medium text-primary">
              7
            </span>
            Solver answers
          </li>
        </ul>
      </aside>
    </div>
  )
}
