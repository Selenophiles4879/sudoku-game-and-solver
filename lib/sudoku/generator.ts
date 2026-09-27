import type { Difficulty, SizeConfig } from './config'
import { solve } from './solver'

const GIVEN_RATIO: Record<number, Record<Difficulty, number>> = {
  4: { easy: 0.56, medium: 0.44, hard: 0.3 },
  6: { easy: 0.53, medium: 0.44, hard: 0.36 },
  9: { easy: 0.5, medium: 0.4, hard: 0.3 },
  12: { easy: 0.56, medium: 0.48, hard: 0.42 },
  16: { easy: 0.6, medium: 0.52, hard: 0.46 },
  25: { easy: 0.64, medium: 0.57, hard: 0.52 },
}

const UNIQUE_CHECK_NODE_LIMIT: Record<number, number> = {
  4: 10_000,
  6: 20_000,
  9: 50_000,
  12: 4_000,
  16: 2_000,
}

const UNIQUE_BUDGET_MS = 3_500

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const range = (k: number) => Array.from({ length: k }, (_, i) => i)

export function generateSolvedGrid(cfg: SizeConfig): number[] {
  const { n, boxRows: h, boxCols: w } = cfg
  const rows = shuffle(range(n / h)).flatMap((band) => shuffle(range(h)).map((r) => band * h + r))
  const cols = shuffle(range(n / w)).flatMap((stack) => shuffle(range(w)).map((c) => stack * w + c))
  const symbols = shuffle(range(n)).map((x) => x + 1)
  const pattern = (r: number, c: number) => (w * (r % h) + Math.floor(r / h) + c) % n

  const grid = new Array<number>(n * n)
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) grid[r * n + c] = symbols[pattern(rows[r], cols[c])]
  }
  return grid
}

export type GeneratedPuzzle = {
  puzzle: number[]
  solution: number[]
  unique: boolean
}

export function generatePuzzle(cfg: SizeConfig, difficulty: Difficulty): GeneratedPuzzle {
  const { n } = cfg
  const total = n * n
  const solution = generateSolvedGrid(cfg)
  const puzzle = solution.slice()
  const target = Math.round(total * GIVEN_RATIO[n][difficulty])
  const nodeLimit = UNIQUE_CHECK_NODE_LIMIT[n]
  let checkUniqueness = nodeLimit !== undefined
  const started = performance.now()

  let givens = total
  for (const idx of shuffle(range(total))) {
    if (givens <= target) break
    const value = puzzle[idx]
    puzzle[idx] = 0

    if (checkUniqueness && performance.now() - started > UNIQUE_BUDGET_MS) checkUniqueness = false

    if (checkUniqueness) {
      const res = solve(puzzle, cfg, { countLimit: 2, nodeLimit, timeLimitMs: 1_000 })
      if (res.solutions !== 1 || res.aborted) {
        puzzle[idx] = value
        continue
      }
    }
    givens--
  }

  return { puzzle, solution, unique: checkUniqueness }
}
