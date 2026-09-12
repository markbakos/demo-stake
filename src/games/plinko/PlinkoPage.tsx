import { BarChart3, ChevronDown, Settings } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { PlinkoBoard } from './PlinkoBoard'
import { ROW_OPTIONS, binPayouts, type Risk, type RowCount } from './plinkoConfig'
import { useNaturalPlinko } from './useNaturalPlinko'

type Mode = 'manual' | 'auto'

export function PlinkoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<Mode>('manual')
  const [betAmount, setBetAmount] = useState(1)
  const [risk, setRisk] = useState<Risk>('medium')
  const [rows, setRows] = useState<RowCount>(16)
  const [recentBins, setRecentBins] = useState<number[]>([])

  const handleLanding = useCallback((bin: number) => {
    setRecentBins((current) => [bin, ...current].slice(0, 4))
  }, [])

  const dropNaturalBall = useNaturalPlinko(canvasRef, rows, handleLanding)
  const payouts = binPayouts[rows][risk]

  function handleBetAmount(event: ChangeEvent<HTMLInputElement>) {
    const nextAmount = event.currentTarget.valueAsNumber
    setBetAmount(Number.isFinite(nextAmount) ? Math.max(0, nextAmount) : 0)
  }

  return (
    <main id="main-content" className="px-3 py-5 sm:px-5 lg:py-8">
      <h1 className="sr-only">Plinko</h1>

      <div className="mx-auto max-w-6xl overflow-hidden rounded bg-[#0f192a] shadow-xl shadow-black/25 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)]">
        <PlinkoBoard
          ref={canvasRef}
          payouts={payouts}
          recentBins={recentBins}
          risk={risk}
          rows={rows}
        />

        <aside className="flex flex-col gap-5 bg-[#213743] p-3 sm:p-4 lg:row-start-1 lg:min-h-[640px]">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-[#0f212e] p-1" aria-label="Bet mode">
            {(['manual', 'auto'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold capitalize text-white transition-colors hover:bg-[#557086] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701] ${
                  mode === value ? 'bg-[#557086] shadow-sm' : ''
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="bet-amount" className="mb-1 block text-sm font-semibold text-[#b1bad3]">
              Bet Amount
            </label>
            <div className="flex overflow-hidden rounded border-2 border-[#2f4553] bg-[#0f212e] focus-within:border-[#557086]">
              <span aria-hidden="true" className="grid place-items-center pl-3 text-slate-500">
                $
              </span>
              <input
                id="bet-amount"
                name="betAmount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                autoComplete="off"
                value={betAmount}
                onChange={handleBetAmount}
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-white focus:outline-none"
              />
              <button
                type="button"
                aria-label="Halve bet amount"
                onClick={() => setBetAmount((amount) => Number((amount / 2).toFixed(2)))}
                className="bg-[#2f4553] px-4 font-bold text-white transition-colors hover:bg-[#3b5565] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#00e701]"
              >
                1/2
              </button>
              <button
                type="button"
                aria-label="Double bet amount"
                onClick={() => setBetAmount((amount) => Number((amount * 2).toFixed(2)))}
                className="border-l-2 border-[#213743] bg-[#2f4553] px-4 text-sm font-bold text-white transition-colors hover:bg-[#3b5565] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#00e701]"
              >
                2×
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="risk" className="text-sm font-semibold text-[#b1bad3]">Risk</label>
            <div className="relative mt-1">
              <select
                id="risk"
                name="risk"
                value={risk}
                onChange={(event) => setRisk(event.currentTarget.value as Risk)}
                className="block w-full appearance-none rounded border-2 border-[#2f4553] bg-[#0f212e] px-3 py-2.5 pr-10 text-sm font-medium text-white shadow-inner shadow-black/20 transition-colors hover:border-[#557086] focus-visible:border-[#557086] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#7f8da3]" />
            </div>
          </div>

          <div>
            <label htmlFor="rows" className="text-sm font-semibold text-[#b1bad3]">Rows</label>
            <div className="relative mt-1">
              <select
                id="rows"
                name="rows"
                value={rows}
                onChange={(event) => setRows(Number(event.currentTarget.value) as RowCount)}
                className="block w-full appearance-none rounded border-2 border-[#2f4553] bg-[#0f212e] px-3 py-2.5 pr-10 text-sm font-medium text-white shadow-inner shadow-black/20 transition-colors hover:border-[#557086] focus-visible:border-[#557086] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]"
              >
                {ROW_OPTIONS.map((rowCount) => (
                  <option key={rowCount} value={rowCount}>
                    {rowCount}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#7f8da3]" />
            </div>
          </div>

          {mode === 'auto' ? (
            <label className="text-sm font-semibold text-[#b1bad3]">
              Number of Bets
              <input
                name="autoBets"
                type="number"
                min="0"
                inputMode="numeric"
                autoComplete="off"
                defaultValue="0"
                className="mt-1 block w-full rounded border-2 border-[#2f4553] bg-[#0f212e] px-3 py-2.5 text-sm text-white focus-visible:border-[#557086] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]"
              />
            </label>
          ) : null}

          <button
            type="button"
            disabled={mode === 'auto'}
            onClick={dropNaturalBall}
            className="rounded bg-[#00e701] py-3 font-semibold text-[#0f212e] transition-colors hover:bg-[#1fff20] active:bg-[#00c901] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:bg-[#557086] disabled:text-[#b1bad3]"
          >
            {mode === 'manual' ? 'Drop Ball' : 'Auto Betting In M4'}
          </button>

          <div className="mt-auto flex items-center gap-3 border-t border-[#2f4553] pt-3">
            <button type="button" disabled aria-label="Game settings available later" className="rounded-full p-2 text-slate-300 opacity-60">
              <Settings aria-hidden="true" className="size-6" />
            </button>
            <button type="button" disabled aria-label="Live statistics available later" className="rounded-full p-2 text-slate-300 opacity-60">
              <BarChart3 aria-hidden="true" className="size-6" />
            </button>
          </div>
        </aside>
      </div>

    </main>
  )
}
