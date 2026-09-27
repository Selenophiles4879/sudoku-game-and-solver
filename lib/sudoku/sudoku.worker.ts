/// <reference lib="webworker" />
import { getSizeConfig } from './config'
import { generatePuzzle } from './generator'
import { solve } from './solver'
import type { WorkerRequest, WorkerResponse } from './worker-types'

const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const req = event.data
  let response: WorkerResponse
  try {
    if (req.type === 'generate') {
      const cfg = getSizeConfig(req.size)
      response = { id: req.id, ok: true, result: generatePuzzle(cfg, req.difficulty) }
    } else {
      const cfg = getSizeConfig(req.size)
      response = {
        id: req.id,
        ok: true,
        result: solve(req.board, cfg, { timeLimitMs: req.timeLimitMs ?? 20_000 }),
      }
    }
  } catch (err) {
    response = { id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) }
  }
  ctx.postMessage(response)
}
