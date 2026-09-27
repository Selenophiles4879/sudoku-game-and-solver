'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { Difficulty } from '@/lib/sudoku/config'
import type { GeneratedPuzzle } from '@/lib/sudoku/generator'
import type { SolveResult } from '@/lib/sudoku/solver'
import type { WorkerRequest, WorkerResponse } from '@/lib/sudoku/worker-types'

export class CancelledError extends Error {
  constructor() {
    super('cancelled')
  }
}

type Pending = { resolve: (value: unknown) => void; reject: (err: Error) => void }
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never

export function useSudokuWorker() {
  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef(new Map<number, Pending>())
  const idRef = useRef(0)

  const rejectAll = useCallback(() => {
    for (const p of pendingRef.current.values()) p.reject(new CancelledError())
    pendingRef.current.clear()
  }, [])

  const getWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current
    const worker = new Worker(new URL('../lib/sudoku/sudoku.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const res = event.data
      const pending = pendingRef.current.get(res.id)
      if (!pending) return
      pendingRef.current.delete(res.id)
      if (res.ok) pending.resolve(res.result)
      else pending.reject(new Error(res.error))
    }
    workerRef.current = worker
    return worker
  }, [])

  const terminate = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    rejectAll()
  }, [rejectAll])

  useEffect(() => terminate, [terminate])

  const run = useCallback(
    <T,>(req: DistributiveOmit<WorkerRequest, 'id'>) =>
      new Promise<T>((resolve, reject) => {
        const id = ++idRef.current
        pendingRef.current.set(id, { resolve: resolve as (v: unknown) => void, reject })
        getWorker().postMessage({ ...req, id })
      }),
    [getWorker],
  )

  return useMemo(
    () => ({
      generate: (size: number, difficulty: Difficulty) =>
        run<GeneratedPuzzle>({ type: 'generate', size, difficulty }),
      solve: (size: number, board: number[], timeLimitMs?: number) =>
        run<SolveResult>({ type: 'solve', size, board, timeLimitMs }),
      cancel: terminate,
    }),
    [run, terminate],
  )
}
