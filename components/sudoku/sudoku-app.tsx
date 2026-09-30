'use client'

import { Activity, useEffect, useState } from 'react'
import { Maximize, Minimize } from 'lucide-react'
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
  const [canFullscreen, setCanFullscreen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Checked after mount so server and client markup match.
  useEffect(() => {
    setCanFullscreen(document.fullscreenEnabled === true)
    const sync = () => setIsFullscreen(document.fullscreenElement !== null)
    sync()
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  // Must be called from a tap/click — browsers block fullscreen otherwise.
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      // Fullscreen refused by the browser; nothing to do.
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-3 py-4 sm:px-6 sm:py-6 lg:py-10">
      <header className="mb-5 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Daily puzzle desk</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">Sudoku</h1>
          <p className="mt-2 hidden max-w-md text-sm leading-relaxed text-muted-foreground text-pretty sm:block">
            Six grid sizes from a gentle 4×4 to a sprawling 25×25. Play a fresh puzzle, or hand one to the solver.
          </p>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
        <div
          role="tablist"
          aria-label="Mode"
          className="grid flex-1 grid-cols-2 gap-1 rounded-full border bg-card p-1 sm:flex sm:w-auto sm:flex-none"
        >
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="tab"
              id={`tab-${m.value}`}
              aria-selected={mode === m.value}
              aria-controls={`panel-${m.value}`}
              onClick={() => setMode(m.value)}
              style={{ touchAction: 'manipulation' }}
              className={cn(
                'min-h-11 rounded-full px-5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] sm:min-h-0',
                mode === m.value ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        {canFullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
            title={isFullscreen ? 'Exit full screen' : 'Full screen'}
            style={{ touchAction: 'manipulation' }}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
          >
            {isFullscreen ? (
              <Minimize className="size-4" aria-hidden="true" />
            ) : (
              <Maximize className="size-4" aria-hidden="true" />
            )}
          </button>
        )}
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
