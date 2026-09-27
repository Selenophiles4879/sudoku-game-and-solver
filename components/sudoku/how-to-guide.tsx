import { SIZES, symbolFor } from '@/lib/sudoku/config'

const SIZE_NOTES: Record<number, { level: string; tip: string }> = {
  4: { level: 'Beginner', tip: 'Four 2×2 boxes. Great for learning — most cells fall out by simple elimination.' },
  6: { level: 'Beginner', tip: 'Boxes are 2 rows × 3 columns, so look along rows and columns differently.' },
  9: { level: 'Classic', tip: 'The standard puzzle. Scan each 3×3 box for the digit it is still missing.' },
  12: { level: 'Advanced', tip: 'Boxes are 3 rows × 4 columns. Uses 1–9 plus A, B, C. Look for rows with few gaps.' },
  16: { level: 'Expert', tip: 'Sixteen 4×4 boxes using 1–9 and A–G. Work one symbol at a time across the grid.' },
  25: { level: 'Marathon', tip: 'Twenty-five 5×5 boxes using 1–9 and A–P. Settle in and tackle one box at a time.' },
}

function symbolRange(n: number) {
  return n <= 9 ? `1–${n}` : `1–9, A–${symbolFor(n)}`
}

export function HowToGuide() {
  return (
    <section aria-labelledby="how-to-heading" className="mt-16 border-t pt-10">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Guide</p>
      <h2 id="how-to-heading" className="mt-1 font-serif text-3xl font-semibold tracking-tight text-balance">
        How to play
      </h2>

      <div className="mt-6 grid gap-8 md:grid-cols-3">
        <div>
          <h3 className="font-medium">The rule</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            Fill every empty cell so that each <strong className="text-foreground">row</strong>, each{' '}
            <strong className="text-foreground">column</strong>, and each outlined{' '}
            <strong className="text-foreground">box</strong> contains every symbol exactly once. The rule is the
            same at every size — only the number of symbols and the box shape change.
          </p>
        </div>

        <div>
          <h3 className="font-medium">Playing</h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-muted-foreground">
            <li>Pick a size and difficulty, then start a new puzzle.</li>
            <li>Select a cell by clicking it or moving with the arrow keys.</li>
            <li>Enter a value with the number pad or your keyboard (1–9, then letters A, B, C…).</li>
            <li>On grids up to 9×9, turn on Notes (or press N) to pencil in candidates.</li>
            <li>Backspace or Delete clears a cell.</li>
            <li>Conflicting entries are highlighted so you can spot mistakes.</li>
          </ul>
        </div>

        <div>
          <h3 className="font-medium">Using the solver</h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-muted-foreground">
            <li>Switch to the Solver tab and choose the grid size.</li>
            <li>Type in the clues from your puzzle, leaving unknown cells empty — or load a sample.</li>
            <li>Press Solve puzzle. It tells you if the clues break the rules or have no solution.</li>
            <li>Larger grids need more clues; a sparse 25×25 may take a few seconds.</li>
          </ul>
        </div>
      </div>

      <h3 className="mt-10 font-medium">Grid sizes at a glance</h3>
      <div className="mt-3 overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Size</th>
              <th scope="col" className="px-4 py-3 font-medium">Box</th>
              <th scope="col" className="px-4 py-3 font-medium">Symbols</th>
              <th scope="col" className="px-4 py-3 font-medium">Level</th>
              <th scope="col" className="px-4 py-3 font-medium">Tip</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {SIZES.map((s) => (
              <tr key={s.n}>
                <th scope="row" className="whitespace-nowrap px-4 py-3 font-serif font-semibold">
                  {s.n}×{s.n}
                </th>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                  {s.boxRows}×{s.boxCols}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{symbolRange(s.n)}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {SIZE_NOTES[s.n].level}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-pretty">{SIZE_NOTES[s.n].tip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-10 font-medium">Solving strategies</h3>
      <ol className="mt-3 grid gap-4 text-sm leading-relaxed text-muted-foreground sm:grid-cols-3">
        <li className="rounded-lg border bg-card p-4">
          <span className="block font-medium text-foreground">1. Scan for singles</span>
          Pick a symbol and check each box: if only one cell in the box can hold it, place it.
        </li>
        <li className="rounded-lg border bg-card p-4">
          <span className="block font-medium text-foreground">2. Eliminate candidates</span>
          List what each cell could be (Notes helps on smaller grids), then remove any symbol already in its row, column or box.
        </li>
        <li className="rounded-lg border bg-card p-4">
          <span className="block font-medium text-foreground">3. Work outward</span>
          Start from the most-filled rows and boxes. On 16×16 and 25×25, finish one region before moving on.
        </li>
      </ol>
    </section>
  )
}
