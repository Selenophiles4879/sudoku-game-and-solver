'use client'

import { memo, useMemo } from 'react'
import { boxIndex, symbolFor, type SizeConfig } from '@/lib/sudoku/config'
import { cn } from '@/lib/utils'

export type CellKind = 'given' | 'user' | 'solved'

type BoardProps = {
  cfg: SizeConfig
  values: number[]
  kinds: CellKind[]
  notes?: number[]
  selected: number | null
  conflicts: Set<number>
  flagged?: Set<number>
  onSelect: (index: number) => void
  dimmed?: boolean
}

// Smallest a cell is allowed to shrink to before the board switches to a
// horizontally scrollable, pinch-to-pan layout instead of squeezing every
// cell into the screen width. Keeps cells tappable on narrow phones even
// for the bigger grids.
function minCellPx(n: number) {
  if (n <= 4) return 64
  if (n <= 6) return 52
  if (n <= 9) return 36
  if (n <= 12) return 30
  if (n <= 16) return 26
  return 22
}

export function SudokuBoard({ cfg, values, kinds, notes, selected, conflicts, flagged, onSelect, dimmed }: BoardProps) {
  const { n } = cfg
  const selRow = selected !== null ? Math.floor(selected / n) : -1
  const selCol = selected !== null ? selected % n : -1
  const selBox = selected !== null ? boxIndex(selRow, selCol, cfg) : -1
  const selValue = selected !== null ? values[selected] : 0
  const noteCols = Math.ceil(Math.sqrt(n))
  const minPx = minCellPx(n)

  const cells = useMemo(() => Array.from({ length: n * n }, (_, i) => i), [n])

  return (
    <div
      className="sudoku-board-scroll -mx-3 w-[calc(100%+1.5rem)] overflow-x-auto overscroll-x-contain px-3 pb-1 sm:mx-0 sm:w-full sm:overflow-visible sm:px-0"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div
        className={cn(
          'sudoku-board mx-auto aspect-square select-none overflow-hidden rounded-md border-2 border-grid-strong bg-card shadow-[0_1px_0_var(--border),0_12px_32px_-16px_oklch(0.3_0.03_60/0.35)] transition-opacity',
          dimmed && 'opacity-60',
        )}
        style={{
          containerType: 'inline-size',
          // Never shrink below a tappable minimum (minPx per cell); grow to
          // fill available height/width when there's room to spare.
          width: `max(${n * minPx}px, min(100%, calc(100dvh - ${n >= 25 ? 168 : n >= 16 ? 184 : n >= 12 ? 218 : 248}px)))`,
          display: 'grid',
          gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${n}, minmax(0, 1fr))`,
        }}
        role="group"
        aria-label={`${n} by ${n} sudoku board`}
      >
        {cells.map((i) => {
          const r = Math.floor(i / n)
          const c = i % n
          const value = values[i]
          const inPeer = selected !== null && (r === selRow || c === selCol || boxIndex(r, c, cfg) === selBox)
          return (
            <Cell
              key={i}
              index={i}
              row={r}
              col={c}
              cfg={cfg}
              value={value}
              kind={kinds[i]}
              notes={notes?.[i] ?? 0}
              noteCols={noteCols}
              isSelected={selected === i}
              isPeer={inPeer}
              isSameValue={selValue !== 0 && value === selValue && selected !== i}
              isConflict={conflicts.has(i)}
              isFlagged={flagged?.has(i) ?? false}
              onSelect={onSelect}
            />
          )
        })}
      </div>
    </div>
  )
}

type CellProps = {
  index: number
  row: number
  col: number
  cfg: SizeConfig
  value: number
  kind: CellKind
  notes: number
  noteCols: number
  isSelected: boolean
  isPeer: boolean
  isSameValue: boolean
  isConflict: boolean
  isFlagged: boolean
  onSelect: (index: number) => void
}

const Cell = memo(function Cell({
  index,
  row,
  col,
  cfg,
  value,
  kind,
  notes,
  noteCols,
  isSelected,
  isPeer,
  isSameValue,
  isConflict,
  isFlagged,
  onSelect,
}: CellProps) {
  const { n, boxRows, boxCols } = cfg
  const strongRight = (col + 1) % boxCols === 0
  const strongBottom = (row + 1) % boxRows === 0
  const symbol = symbolFor(value)

  const label = `Row ${row + 1}, column ${col + 1}, ${
    value ? `${symbol}${kind === 'given' ? ', given' : ''}` : 'empty'
  }${isConflict ? ', conflict' : ''}`

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isSelected}
      onClick={() => onSelect(index)}
      className={cn(
        'relative flex items-center justify-center leading-none outline-none transition-colors active:bg-cell-selected',
        isSelected
          ? 'bg-cell-selected'
          : isSameValue
            ? 'bg-cell-same'
            : isPeer
              ? 'bg-cell-peer'
              : 'bg-card hover:bg-muted',
        (isConflict || isFlagged) && !isSelected && 'bg-destructive/12',
      )}
      style={{
        borderRight: col === n - 1 ? 'none' : strongRight ? '2px solid var(--grid-strong)' : '1px solid var(--border)',
        borderBottom:
          row === n - 1 ? 'none' : strongBottom ? '2px solid var(--grid-strong)' : '1px solid var(--border)',
        fontSize: `calc(100cqw / ${n} * ${n >= 25 ? 0.58 : n >= 16 ? 0.56 : 0.56})`,
        touchAction: 'manipulation',
      }}
    >
      {value ? (
        <span
          className={cn(
            'tabular-nums',
            kind === 'given' && 'font-serif font-semibold text-foreground',
            kind === 'user' && 'font-sans font-medium text-ink',
            kind === 'solved' && 'font-sans font-medium text-primary',
            (isConflict || isFlagged) && 'text-destructive',
          )}
        >
          {symbol}
        </span>
      ) : notes && n <= 9 ? (
        <span
          aria-hidden="true"
          className="grid size-full p-[6%] text-muted-foreground"
          style={{
            gridTemplateColumns: `repeat(${noteCols}, minmax(0, 1fr))`,
            fontSize: `calc(100cqw / ${n} * 0.22)`,
          }}
        >
          {Array.from({ length: n }, (_, k) => (
            <span key={k} className="flex items-center justify-center tabular-nums">
              {notes & (1 << k) ? symbolFor(k + 1) : ''}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  )
})
