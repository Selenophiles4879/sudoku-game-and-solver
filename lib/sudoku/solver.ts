import { boxIndex, type SizeConfig } from './config'

export type SolveStatus = 'solved' | 'unsolvable' | 'invalid' | 'timeout'

export type SolveResult = {
  status: SolveStatus
  solution: number[] | null
  solutions: number
  nodes: number
  ms: number
  aborted: boolean
}

export type SolveOptions = {
  countLimit?: number
  nodeLimit?: number
  timeLimitMs?: number
}

function popcount(x: number) {
  x = x - ((x >>> 1) & 0x55555555)
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333)
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
}

/**
 * Bitmask backtracking solver with MRV (fewest-candidates-first) and hidden singles.
 * Works for any rectangular-box sudoku up to 25x25 (masks fit in 32-bit ints).
 */
export function solve(
  board: ArrayLike<number>,
  cfg: SizeConfig,
  { countLimit = 1, nodeLimit = 5_000_000, timeLimitMs = 20_000 }: SolveOptions = {},
): SolveResult {
  const start = performance.now()
  const deadline = start + timeLimitMs
  const { n } = cfg
  const total = n * n
  const full = n === 32 ? 0xffffffff : (1 << n) - 1

  const grid = new Int32Array(total)
  const rowOf = new Int32Array(total)
  const colOf = new Int32Array(total)
  const boxOf = new Int32Array(total)
  const rows = new Int32Array(n)
  const cols = new Int32Array(n)
  const boxes = new Int32Array(n)

  const boxCells: number[][] = Array.from({ length: n }, () => [])
  for (let i = 0; i < total; i++) {
    const r = Math.floor(i / n)
    const c = i % n
    rowOf[i] = r
    colOf[i] = c
    boxOf[i] = boxIndex(r, c, cfg)
    boxCells[boxOf[i]].push(i)
  }

  const result = (status: SolveStatus, solution: number[] | null, solutions: number, nodes: number, aborted: boolean): SolveResult => ({
    status,
    solution,
    solutions,
    nodes,
    ms: Math.round(performance.now() - start),
    aborted,
  })

  for (let i = 0; i < total; i++) {
    const v = board[i] | 0
    if (v === 0) continue
    if (v < 0 || v > n) return result('invalid', null, 0, 0, false)
    const bit = 1 << (v - 1)
    if (rows[rowOf[i]] & bit || cols[colOf[i]] & bit || boxes[boxOf[i]] & bit) {
      return result('invalid', null, 0, 0, false)
    }
    grid[i] = v
    rows[rowOf[i]] |= bit
    cols[colOf[i]] |= bit
    boxes[boxOf[i]] |= bit
  }

  let nodes = 0
  let solutions = 0
  let aborted = false
  let firstSolution: number[] | null = null

  const place = (i: number, v: number) => {
    const bit = 1 << (v - 1)
    grid[i] = v
    rows[rowOf[i]] |= bit
    cols[colOf[i]] |= bit
    boxes[boxOf[i]] |= bit
  }
  const unplace = (i: number, v: number) => {
    const bit = ~(1 << (v - 1))
    grid[i] = 0
    rows[rowOf[i]] &= bit
    cols[colOf[i]] &= bit
    boxes[boxOf[i]] &= bit
  }
  const candidates = (i: number) => full & ~(rows[rowOf[i]] | cols[colOf[i]] | boxes[boxOf[i]])

  /** Returns true when the search should stop entirely. */
  const search = (): boolean => {
    nodes++
    if (nodes > nodeLimit || ((nodes & 1023) === 0 && performance.now() > deadline)) {
      aborted = true
      return true
    }

    let best = -1
    let bestMask = 0
    let bestCount = 99
    for (let i = 0; i < total; i++) {
      if (grid[i] !== 0) continue
      const mask = candidates(i)
      if (mask === 0) return false
      const count = popcount(mask)
      if (count < bestCount) {
        best = i
        bestMask = mask
        bestCount = count
        if (count === 1) break
      }
    }

    if (best === -1) {
      solutions++
      if (solutions === 1) firstSolution = Array.from(grid)
      return solutions >= countLimit
    }

    // Hidden single in a box: a value that can only go in one cell of that box.
    if (bestCount > 1) {
      for (let b = 0; b < n && bestCount > 1; b++) {
        const cells = boxCells[b]
        let once = 0
        let twice = 0
        for (const i of cells) {
          if (grid[i] !== 0) continue
          const m = candidates(i)
          twice |= once & m
          once |= m
        }
        const missing = full & ~boxes[b]
        if ((once & missing) !== missing) return false
        const hidden = once & ~twice & missing
        if (hidden) {
          const bit = hidden & -hidden
          for (const i of cells) {
            if (grid[i] === 0 && candidates(i) & bit) {
              best = i
              bestMask = bit
              bestCount = 1
              break
            }
          }
        }
      }
    }

    let mask = bestMask
    while (mask) {
      const bit = mask & -mask
      mask ^= bit
      const v = 31 - Math.clz32(bit) + 1
      place(best, v)
      if (search()) return true
      unplace(best, v)
    }
    return false
  }

  search()

  if (firstSolution) return result('solved', firstSolution, solutions, nodes, aborted)
  if (aborted) return result('timeout', null, 0, nodes, true)
  return result('unsolvable', null, 0, nodes, false)
}
