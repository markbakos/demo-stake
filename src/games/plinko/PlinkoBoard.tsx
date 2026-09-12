import type { CSSProperties, Ref } from 'react'
import { getBinColor, type Risk, type RowCount } from './plinkoConfig'
import { BOARD_HEIGHT, BOARD_WIDTH } from './plinkoGeometry'

type PlinkoBoardProps = {
  ref: Ref<HTMLCanvasElement>
  payouts: readonly number[]
  recentBins: readonly number[]
  risk: Risk
  rows: RowCount
}

function formatMultiplier(multiplier: number) {
  return multiplier >= 100 ? String(multiplier) : `${multiplier}×`
}

export function PlinkoBoard({ ref, payouts, recentBins, risk, rows }: PlinkoBoardProps) {
  return (
    <section className="relative flex min-w-0 flex-col bg-[#0f192a] px-3 pb-4 sm:px-5 lg:col-start-2 lg:row-start-1" aria-label="Plinko board">
      <div className="relative mx-auto w-full max-w-[760px]">
        <canvas
          ref={ref}
          width={BOARD_WIDTH}
          height={BOARD_HEIGHT}
          className="block aspect-[760/570] h-auto w-full"
          aria-label={`${rows}-row ${risk}-risk Plinko calibration board`}
        />

        {recentBins.length > 0 ? (
          <div className="absolute right-[2%] top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-sm text-[clamp(0.45rem,1.5vw,0.75rem)] font-bold text-slate-950 shadow-lg" aria-label="Recent calibration results">
            {recentBins.map((bin, index) => (
              <span
                key={`${bin}-${index}`}
                className="grid aspect-square w-[clamp(1.75rem,5vw,3rem)] place-items-center"
                style={{ backgroundColor: getBinColor(bin, payouts.length) }}
              >
                {formatMultiplier(payouts[bin])}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mx-auto flex w-[84%] gap-[1%]" aria-label={`${payouts.length} multiplier bins`}>
        {payouts.map((payout, index) => {
          const color = getBinColor(index, payouts.length)
          return (
            <div
              key={`${rows}-${risk}-${index}`}
              className="grid min-w-0 flex-1 place-items-center rounded-[2px] py-1 text-[clamp(0.42rem,1.1vw,0.75rem)] font-extrabold leading-none text-slate-950 lg:rounded"
              style={{ backgroundColor: color, boxShadow: `0 3px 0 color-mix(in srgb, ${color} 62%, black)` } as CSSProperties}
            >
              {formatMultiplier(payout)}
            </div>
          )
        })}
      </div>
    </section>
  )
}
