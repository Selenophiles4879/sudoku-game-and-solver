export type SizeConfig = {
  n: number
  boxRows: number
  boxCols: number
}

export type Difficulty = 'easy' | 'medium' | 'hard'

export const SIZES: SizeConfig[] = [
  { n: 4, boxRows: 2, boxCols: 2 },
  { n: 6, boxRows: 2, boxCols: 3 },
  { n: 9, boxRows: 3, boxCols: 3 },
  { n: 12, boxRows: 3, boxCols: 4 },
  { n: 16, boxRows: 4, boxCols: 4 },
  { n: 25, boxRows: 5, boxCols: 5 },
]

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export function getSizeConfig(n: number): SizeConfig {
  const cfg = SIZES.find((s) => s.n === n)
  if (!cfg) throw new Error(`Unsupported size ${n}`)
  return cfg
}

export function boxIndex(r: number, c: number, cfg: SizeConfig) {
  return Math.floor(r / cfg.boxRows) * (cfg.n / cfg.boxCols) + Math.floor(c / cfg.boxCols)
}

/** Values are 1..n. 1-9 are digits, 10+ map to letters A, B, C... */
export function symbolFor(value: number) {
  if (value <= 0) return ''
  if (value <= 9) return String(value)
  return String.fromCharCode(55 + value)
}

export function valueForKey(key: string, n: number): number | null {
  if (key.length !== 1) return null
  let value: number | null = null
  if (key >= '1' && key <= '9') value = Number(key)
  else {
    const upper = key.toUpperCase()
    if (upper >= 'A' && upper <= 'Z') value = upper.charCodeAt(0) - 55
  }
  if (value === null || value < 1 || value > n) return null
  return value
}

export function findConflicts(values: ArrayLike<number>, cfg: SizeConfig): Set<number> {
  const { n } = cfg
  const conflicts = new Set<number>()
  const units: number[][] = []
  for (let i = 0; i < n; i++) {
    const row: number[] = []
    const col: number[] = []
    for (let j = 0; j < n; j++) {
      row.push(i * n + j)
      col.push(j * n + i)
    }
    units.push(row, col)
  }
  const boxes: number[][] = Array.from({ length: n }, () => [])
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) boxes[boxIndex(r, c, cfg)].push(r * n + c)
  }
  units.push(...boxes)

  for (const unit of units) {
    const seen = new Map<number, number[]>()
    for (const idx of unit) {
      const v = values[idx]
      if (!v) continue
      const list = seen.get(v)
      if (list) list.push(idx)
      else seen.set(v, [idx])
    }
    for (const list of seen.values()) {
      if (list.length > 1) list.forEach((i) => conflicts.add(i))
    }
  }
  return conflicts
}

export function isSolved(values: ArrayLike<number>, cfg: SizeConfig) {
  for (let i = 0; i < values.length; i++) if (!values[i]) return false
  return findConflicts(values, cfg).size === 0
}
