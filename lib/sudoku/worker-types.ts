import type { Difficulty } from './config'
import type { GeneratedPuzzle } from './generator'
import type { SolveResult } from './solver'

export type WorkerRequest =
  | { id: number; type: 'generate'; size: number; difficulty: Difficulty }
  | { id: number; type: 'solve'; size: number; board: number[]; timeLimitMs?: number }

export type WorkerResponse =
  | { id: number; ok: true; result: GeneratedPuzzle | SolveResult }
  | { id: number; ok: false; error: string }
