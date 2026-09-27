'use client'

import { Activity, useState } from 'react'
import { cn } from '@/lib/utils'
import { PlayView } from './play-view'
import { SolverView } from './solver-view'
import { HowToGuide } from './how-to-guide'

type Mode = 'play' | 'solve'

const MODES: { value: Mode; label: string }[] = [
  { value: 'play', label: 'Play' },
  { value: 'solve', label: 'Solver' },
]

export function SudokuApp() {
  const [mode, setMode] = useState<Mode>('play')

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:py-10">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Daily puzzle desk</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Sudoku</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
            Six grid sizes from a gentle 4×4 to a sprawling 25×25. Play a fresh puzzle, or hand one to the solver.
          </p>
        </div>
        <div role="tablist" aria-label="Mode" className="flex gap-1 self-start rounded-full border bg-card p-1 sm:self-auto">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="tab"
              id={`tab-${m.value}`}
              aria-selected={mode === m.value}
              aria-controls={`panel-${m.value}`}
              onClick={() => setMode(m.value)}
              className={cn(
                'rounded-full px-5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                mode === m.value ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1">
        <Activity mode={mode === 'play' ? 'visible' : 'hidden'}>
          <div role="tabpanel" id="panel-play" aria-labelledby="tab-play">
            <PlayView />
          </div>
        </Activity>
        <Activity mode={mode === 'solve' ? 'visible' : 'hidden'}>
          <div role="tabpanel" id="panel-solve" aria-labelledby="tab-solve">
            <SolverView />
          </div>
        </Activity>
        <HowToGuide />
      </main>

      <footer className="mt-12 border-t pt-4 text-xs text-muted-foreground">
        Puzzles are generated and solved entirely in your browser.
      </footer>
    </div>
  )
}
