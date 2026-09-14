import { X } from 'lucide-react'
import type { Ref } from 'react'
import type { PlinkoResult } from '../../app/store'
import { calculatePlinkoStatistics } from './plinkoStatistics'

type PlinkoStatisticsDialogProps = {
  ref: Ref<HTMLDialogElement>
  results: readonly PlinkoResult[]
}

const creditFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const percentFormatter = new Intl.NumberFormat(undefined, {
  style: 'percent',
  maximumFractionDigits: 1,
})

function formatCredits(value: number, signed = false) {
  const formatted = creditFormatter.format(Math.abs(value))
  if (!signed || value === 0) return formatted
  return `${value > 0 ? '+' : '−'}${formatted}`
}

export function PlinkoStatisticsDialog({ ref, results }: PlinkoStatisticsDialogProps) {
  const statistics = calculatePlinkoStatistics(results)
  const history = statistics.profitHistory
  const minimum = Math.min(0, ...history)
  const maximum = Math.max(0, ...history)
  const range = maximum - minimum || 1
  const points = history.map((profit, index) => {
    const x = history.length === 1 ? 0 : (index / (history.length - 1)) * 100
    const y = 92 - ((profit - minimum) / range) * 84
    return `${x},${y}`
  }).join(' ')
  const zeroY = 92 - ((0 - minimum) / range) * 84
  const profitTone = statistics.profit > 0 ? 'text-[#00e701]' : statistics.profit < 0 ? 'text-red-400' : 'text-white'

  return (
    <dialog
      ref={ref}
      aria-labelledby="statistics-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100%-2rem))] overscroll-contain rounded-lg border border-[#2f4553] bg-[#213743] p-0 text-white shadow-2xl backdrop:bg-black/70"
    >
      <form method="dialog" className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="statistics-title" className="text-xl font-bold text-balance">Live Statistics</h2>
            <p className="mt-1 text-sm text-[#b1bad3]">Settled bets from this session</p>
          </div>
          <button
            type="submit"
            aria-label="Close statistics"
            className="shrink-0 rounded p-2 text-[#b1bad3] transition-colors hover:bg-[#2f4553] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-live="polite">
          <Stat label="Profit" value={formatCredits(statistics.profit, true)} valueClassName={profitTone} />
          <Stat label="Wagered" value={formatCredits(statistics.wagered)} />
          <Stat label="Bets" value={String(statistics.bets)} />
          <Stat label="Wins" value={String(statistics.wins)} valueClassName="text-[#00e701]" />
          <Stat label="Losses" value={String(statistics.losses)} valueClassName="text-red-400" />
          <Stat label="Win Rate" value={percentFormatter.format(statistics.winRate)} />
        </div>

        <section className="mt-5 rounded bg-[#0f212e] p-4" aria-labelledby="profit-history-title">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="profit-history-title" className="text-sm font-semibold text-[#b1bad3]">Profit History</h3>
            <span className={`text-sm font-bold tabular-nums ${profitTone}`}>{formatCredits(statistics.profit, true)}</span>
          </div>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Cumulative profit history ending at ${formatCredits(statistics.profit, true)} credits`}
            className="mt-3 h-40 w-full overflow-visible"
          >
            <line x1="0" y1={zeroY} x2="100" y2={zeroY} stroke="#2f4553" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <polyline
              points={points}
              fill="none"
              stroke={statistics.profit < 0 ? '#f87171' : '#00e701'}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {statistics.bets === 0 ? (
            <p className="mt-2 text-center text-xs text-[#b1bad3]">Your settled bets will appear here.</p>
          ) : null}
        </section>
      </form>
    </dialog>
  )
}

function Stat({ label, value, valueClassName = 'text-white' }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="min-w-0 rounded bg-[#172b36] p-3">
      <p className="truncate text-xs font-semibold text-[#b1bad3]">{label}</p>
      <p className={`mt-1 truncate text-lg font-bold tabular-nums ${valueClassName}`}>{value}</p>
    </div>
  )
}
