import { BarChart3, ChevronDown, Settings, Volume2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  acceptPlinkoBet,
  cancelAllPlinkoBets,
  cancelPlinkoBet,
  selectActiveBetCount,
  selectBalance,
  selectPlinkoResults,
  settlePlinkoBet,
  type AppDispatch,
} from '../../app/store'
import { PlinkoBoard } from './PlinkoBoard'
import { PlinkoStatisticsDialog } from './PlinkoStatisticsDialog'
import {
  playPlinkoLanding,
  playPlinkoPegHit,
  preparePlinkoAudio,
  setPlinkoSoundEnabled,
} from './plinkoAudio'
import { ROW_OPTIONS, binPayouts, type Risk, type RowCount } from './plinkoConfig'
import { createOutcomePath, createPathForTarget, getTargetBin, type Luck } from './plinkoPath'
import type { Landing } from './plinkoPhysics'
import { useTargetedPlinko } from './useTargetedPlinko'

type Mode = 'manual' | 'auto'

const LUCK_OPTIONS: readonly { value: Luck; label: string; description: string }[] = [
  { value: 'normal', label: 'Normal', description: 'Fair odds' },
  { value: 'favored', label: 'Favored', description: '8% boost' },
  { value: 'kind', label: 'Kind', description: '16% boost' },
]

export function PlinkoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const settingsDialogRef = useRef<HTMLDialogElement>(null)
  const statisticsDialogRef = useRef<HTMLDialogElement>(null)
  const [mode, setMode] = useState<Mode>('manual')
  const [betAmountInput, setBetAmountInput] = useState('1')
  const [risk, setRisk] = useState<Risk>('medium')
  const [rows, setRows] = useState<RowCount>(16)
  const [luck, setLuck] = useState<Luck>('normal')
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)
  const [recentBins, setRecentBins] = useState<number[]>([])
  const [binHit, setBinHit] = useState<{ bin: number; roundId: string }>()
  const balance = useSelector(selectBalance)
  const activeRoundCount = useSelector(selectActiveBetCount)
  const results = useSelector(selectPlinkoResults)
  const dispatch = useDispatch<AppDispatch>()
  const payouts = binPayouts[rows][risk]
  const parsedBetAmount = Number(betAmountInput)
  const betAmount = betAmountInput !== '' && Number.isFinite(parsedBetAmount) && parsedBetAmount >= 0
    ? parsedBetAmount
    : null
  const betAmountError = betAmountInput === ''
    ? 'Enter a bet amount.'
    : betAmount === null
      ? 'Enter a valid bet amount.'
      : betAmount > balance
        ? 'Bet amount exceeds your balance.'
        : undefined

  useEffect(() => {
    dispatch(cancelAllPlinkoBets())
  }, [dispatch])

  const handleLanding = useCallback(({ isConfirmed, roundId, requestedBin, observedBin }: Landing) => {
    if (!isConfirmed || requestedBin !== observedBin) {
      dispatch(cancelPlinkoBet(roundId))
      return
    }
    if (!dispatch(settlePlinkoBet(roundId, observedBin))) return
    playPlinkoLanding(payouts[observedBin])
    setBinHit({ bin: observedBin, roundId })
    setRecentBins((current) => [observedBin, ...current].slice(0, 4))
  }, [dispatch, payouts])

  const dropBall = useTargetedPlinko(canvasRef, rows, handleLanding, playPlinkoPegHit)
  const isBetUnaffordable = betAmount !== null && betAmount > balance

  useEffect(() => {
    if (!import.meta.env.DEV) return

    const developerWindow = window as Window & { dropPlinko?: (targetBin: number) => boolean }
    developerWindow.dropPlinko = (targetBin) => {
      if (betAmount === null) return false
      if (!Number.isInteger(targetBin) || targetBin < 0 || targetBin > rows) {
        throw new RangeError(`Target bin must be an integer from 0 through ${rows}.`)
      }

      preparePlinkoAudio()
      const roundId = crypto.randomUUID()
      const path = createPathForTarget(rows, targetBin)
      if (!dispatch(acceptPlinkoBet(roundId, betAmount, targetBin, payouts[targetBin], path))) return false
      if (dropBall({ roundId, targetBin, path })) return true

      dispatch(cancelPlinkoBet(roundId))
      return false
    }

    return () => {
      delete developerWindow.dropPlinko
    }
  }, [betAmount, dispatch, dropBall, payouts, rows])

  function handleBetAmount(event: ChangeEvent<HTMLInputElement>) {
    setBetAmountInput(event.currentTarget.value)
  }

  function adjustBetAmount(multiplier: number) {
    if (betAmount === null) return
    setBetAmountInput(String(Number((betAmount * multiplier).toFixed(2))))
  }

  function handleBet() {
    if (betAmount === null) return
    preparePlinkoAudio()
    const roundId = crypto.randomUUID()
    const path = createOutcomePath(rows, luck)
    const targetBin = getTargetBin(path)
    if (!dispatch(acceptPlinkoBet(roundId, betAmount, targetBin, payouts[targetBin], path))) return

    if (!dropBall({ roundId, targetBin, path })) dispatch(cancelPlinkoBet(roundId))
  }

  return (
    <main id="main-content" className="px-3 py-5 sm:px-5 lg:py-8">
      <h1 className="sr-only">Plinko</h1>

      <div className="mx-auto max-w-6xl overflow-hidden rounded bg-[#0f192a] shadow-xl shadow-black/25 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)]">
        <PlinkoBoard
          ref={canvasRef}
          binHit={binHit}
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
                placeholder="0.00"
                value={betAmountInput}
                onChange={handleBetAmount}
                aria-invalid={Boolean(betAmountError)}
                aria-describedby={betAmountError ? 'bet-amount-error' : undefined}
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-white focus:outline-none"
              />
              <button
                type="button"
                aria-label="Halve bet amount"
                disabled={betAmount === null}
                onClick={() => adjustBetAmount(0.5)}
                className="bg-[#2f4553] px-4 font-bold text-white transition-colors hover:bg-[#3b5565] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#00e701] disabled:cursor-not-allowed disabled:opacity-50"
              >
                1/2
              </button>
              <button
                type="button"
                aria-label="Double bet amount"
                disabled={betAmount === null}
                onClick={() => adjustBetAmount(2)}
                className="border-l-2 border-[#213743] bg-[#2f4553] px-4 text-sm font-bold text-white transition-colors hover:bg-[#3b5565] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#00e701] disabled:cursor-not-allowed disabled:opacity-50"
              >
                2×
              </button>
            </div>
            {betAmountError ? (
              <p id="bet-amount-error" className="mt-1 text-xs text-red-400">{betAmountError}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="risk" className="text-sm font-semibold text-[#b1bad3]">Risk</label>
            <div className="relative mt-1">
              <select
                id="risk"
                name="risk"
                value={risk}
                disabled={activeRoundCount > 0}
                onChange={(event) => setRisk(event.currentTarget.value as Risk)}
                className="block w-full appearance-none rounded border-2 border-[#2f4553] bg-[#0f212e] px-3 py-2.5 pr-10 text-sm font-medium text-white shadow-inner shadow-black/20 transition-colors hover:border-[#557086] focus-visible:border-[#557086] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701] disabled:cursor-not-allowed disabled:opacity-50"
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
                disabled={activeRoundCount > 0}
                onChange={(event) => setRows(Number(event.currentTarget.value) as RowCount)}
                className="block w-full appearance-none rounded border-2 border-[#2f4553] bg-[#0f212e] px-3 py-2.5 pr-10 text-sm font-medium text-white shadow-inner shadow-black/20 transition-colors hover:border-[#557086] focus-visible:border-[#557086] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701] disabled:cursor-not-allowed disabled:opacity-50"
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
            disabled={mode === 'auto' || betAmount === null || isBetUnaffordable}
            onClick={handleBet}
            className="rounded bg-[#1475e1] py-3 font-semibold text-white transition-colors hover:bg-[#1164c1] active:bg-[#0f56a5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:bg-[#557086] disabled:text-[#b1bad3]"
          >
            {mode === 'manual' ? 'Bet' : 'Auto Betting In M4'}
          </button>

          <div className="mt-auto flex items-center gap-3 border-t border-[#2f4553] pt-3">
            <button
              type="button"
              aria-label="Game settings"
              onClick={() => settingsDialogRef.current?.showModal()}
              className="rounded-full p-2 text-slate-300 transition-colors hover:bg-[#2f4553] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]"
            >
              <Settings aria-hidden="true" className="size-6" />
            </button>
            <button
              type="button"
              aria-label="Open live statistics"
              onClick={() => statisticsDialogRef.current?.showModal()}
              className="rounded-full p-2 text-slate-300 transition-colors hover:bg-[#2f4553] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]"
            >
              <BarChart3 aria-hidden="true" className="size-6" />
            </button>
          </div>
        </aside>
      </div>

      <dialog
        ref={settingsDialogRef}
        aria-labelledby="settings-title"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100%-2rem))] overscroll-contain rounded-lg border border-[#2f4553] bg-[#213743] p-0 text-white shadow-2xl backdrop:bg-black/70"
      >
        <form method="dialog" className="p-5">
          <div className="flex items-start justify-between gap-4">
            <h2 id="settings-title" className="text-xl font-bold">Game Settings</h2>
            <button
              type="submit"
              aria-label="Close settings"
              className="shrink-0 rounded p-2 text-[#b1bad3] transition-colors hover:bg-[#2f4553] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-[#b1bad3]">Luck</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {LUCK_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex min-w-0 cursor-pointer items-start gap-2 rounded border p-3 transition-colors ${
                    luck === option.value
                      ? 'border-[#00e701] bg-[#0f212e]'
                      : 'border-[#2f4553] bg-[#172b36] hover:border-[#557086]'
                  }`}
                >
                  <input
                    type="radio"
                    name="luck"
                    value={option.value}
                    checked={luck === option.value}
                    onChange={() => setLuck(option.value)}
                    className="mt-1 accent-[#00e701]"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{option.label}</span>
                    <span className="mt-0.5 block text-xs text-[#b1bad3]">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5 border-t border-[#2f4553] pt-5">
            <legend className="sr-only">Sound</legend>
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded bg-[#172b36] p-3 hover:bg-[#1a303c] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#00e701]">
              <span className="flex min-w-0 items-center gap-3">
                <Volume2 aria-hidden="true" className="size-5 shrink-0 text-[#b1bad3]" />
                <span>
                  <span className="block text-sm font-semibold">Sound</span>
                  <span className="block text-xs text-[#b1bad3]">Peg & landing effects</span>
                </span>
              </span>
              <input
                type="checkbox"
                name="sound"
                checked={isSoundEnabled}
                onChange={(event) => {
                  const enabled = event.currentTarget.checked
                  setIsSoundEnabled(enabled)
                  setPlinkoSoundEnabled(enabled)
                }}
                className="size-5 shrink-0 accent-[#00e701]"
              />
            </label>
          </fieldset>
        </form>
      </dialog>

      <PlinkoStatisticsDialog ref={statisticsDialogRef} results={results} />

    </main>
  )
}
