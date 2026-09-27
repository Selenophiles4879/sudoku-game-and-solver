import { boxIndex, getSizeConfig, isSolved } from './config'

export type GameStatus = 'loading' | 'playing' | 'won' | 'revealed'

type Snapshot = { values: number[]; notes: number[] }

export type GameState = {
  size: number
  values: number[]
  givens: boolean[]
  notes: number[]
  solution: number[] | null
  selected: number | null
  notesMode: boolean
  history: Snapshot[]
  status: GameStatus
  elapsed: number
  hints: number
  flagged: number[]
}

export type GameAction =
  | { type: 'loading'; size: number }
  | { type: 'load'; size: number; puzzle: number[]; solution: number[] }
  | { type: 'select'; index: number }
  | { type: 'input'; value: number }
  | { type: 'erase' }
  | { type: 'toggleNotes' }
  | { type: 'undo' }
  | { type: 'hint'; index: number; value: number }
  | { type: 'reset' }
  | { type: 'reveal' }
  | { type: 'flag'; indices: number[] }
  | { type: 'tick' }

const empty = (size: number) => new Array<number>(size * size).fill(0)

export function initialGameState(size = 9): GameState {
  return {
    size,
    values: empty(size),
    givens: new Array<boolean>(size * size).fill(false),
    notes: empty(size),
    solution: null,
    selected: null,
    notesMode: false,
    history: [],
    status: 'loading',
    elapsed: 0,
    hints: 0,
    flagged: [],
  }
}

const MAX_HISTORY = 200

function withHistory(state: GameState): Snapshot[] {
  const next = [...state.history, { values: state.values, notes: state.notes }]
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
}

function clearPeerNotes(notes: number[], index: number, value: number, size: number) {
  const cfg = getSizeConfig(size)
  const r = Math.floor(index / size)
  const c = index % size
  const b = boxIndex(r, c, cfg)
  const mask = ~(1 << (value - 1))
  for (let i = 0; i < notes.length; i++) {
    if (!notes[i]) continue
    const ri = Math.floor(i / size)
    const ci = i % size
    if (ri === r || ci === c || boxIndex(ri, ci, cfg) === b) notes[i] &= mask
  }
}

function setValue(state: GameState, index: number, value: number): GameState {
  const values = state.values.slice()
  const notes = state.notes.slice()
  values[index] = value
  notes[index] = 0
  if (value) clearPeerNotes(notes, index, value, state.size)
  const won = isSolved(values, getSizeConfig(state.size))
  return {
    ...state,
    values,
    notes,
    history: withHistory(state),
    flagged: [],
    status: won ? 'won' : state.status,
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'loading':
      return { ...initialGameState(action.size), notesMode: state.notesMode }
    case 'load':
      return {
        ...initialGameState(action.size),
        notesMode: state.notesMode && action.size <= 9,
        values: action.puzzle.slice(),
        givens: action.puzzle.map((v) => v !== 0),
        solution: action.solution,
        status: 'playing',
      }
    case 'select':
      return { ...state, selected: action.index }
    case 'toggleNotes':
      if (state.size > 9) return state
      return { ...state, notesMode: !state.notesMode }
    case 'tick':
      return state.status === 'playing' ? { ...state, elapsed: state.elapsed + 1 } : state
    case 'flag':
      return { ...state, flagged: action.indices }
    case 'input': {
      const i = state.selected
      if (state.status !== 'playing' || i === null || state.givens[i]) return state
      if (state.notesMode && state.size <= 9) {
        if (state.values[i]) return state
        const notes = state.notes.slice()
        notes[i] ^= 1 << (action.value - 1)
        return { ...state, notes, history: withHistory(state) }
      }
      return setValue(state, i, state.values[i] === action.value ? 0 : action.value)
    }
    case 'erase': {
      const i = state.selected
      if (state.status !== 'playing' || i === null || state.givens[i]) return state
      if (!state.values[i] && !state.notes[i]) return state
      const values = state.values.slice()
      const notes = state.notes.slice()
      values[i] = 0
      notes[i] = 0
      return { ...state, values, notes, history: withHistory(state), flagged: [] }
    }
    case 'hint': {
      if (state.status !== 'playing') return state
      const next = setValue({ ...state, selected: action.index }, action.index, action.value)
      return { ...next, hints: state.hints + 1 }
    }
    case 'undo': {
      if (state.status !== 'playing' || state.history.length === 0) return state
      const prev = state.history[state.history.length - 1]
      return { ...state, ...prev, history: state.history.slice(0, -1), flagged: [] }
    }
    case 'reset':
      if (state.status === 'loading') return state
      return {
        ...state,
        values: state.values.map((v, i) => (state.givens[i] ? v : 0)),
        notes: empty(state.size),
        history: [],
        flagged: [],
        status: 'playing',
        elapsed: 0,
        hints: 0,
      }
    case 'reveal':
      if (!state.solution || state.status !== 'playing') return state
      return { ...state, values: state.solution.slice(), notes: empty(state.size), status: 'revealed', flagged: [] }
  }
}
