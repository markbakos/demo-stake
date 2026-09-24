import { BarChart3, Dices, Settings, Volume2, VolumeX, X } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  cancelDiceRound,
  selectBalance,
  selectDiceResults,
  selectDiceRound,
  selectDiceSettings,
  selectDiceStatistics,
  setDiceAutoBetCount,
  setDiceBetAmount,
  setDiceDirection,
  setDiceMode,
  setDiceOnLossAdjustment,
  setDiceOnLossPercent,
  setDiceOnWinAdjustment,
  setDiceOnWinPercent,
  setDiceSoundEnabled as setStoredDiceSoundEnabled,
  setDiceStopOnLoss,
  setDiceStopOnProfit,
  setDiceTarget,
  settleDiceBet,
  startDiceRound,
  type AppDispatch,
  type DiceAdjustment,
} from '../../app/store'
import { usePageMetadata } from '../../app/usePageMetadata'
import { SessionStatisticsDialog } from '../../shared/SessionStatisticsDialog'
import { useSpaceShortcut } from '../../shared/useSpaceShortcut'
import { DICE_DEFAULT_TARGET, DICE_MAX_TARGET, DICE_MIN_TARGET, getDiceMultiplier, getDiceWinChance, isDiceTarget, type DiceDirection } from './diceGame'
import { playDiceRoll, prepareDiceAudio, setDiceSoundEnabled } from './diceAudio'

const ROLL_ANIMATION_MS = 560
const AUTO_BET_GAP_MS = 180
const creditFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const betFieldClass = 'min-w-0 rounded border-2 border-[#2f4553] bg-[#0f212e] px-3 py-2 text-sm text-white focus:border-[#557086] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00e701] disabled:cursor-not-allowed disabled:opacity-60'
const smallFieldClass = 'min-w-0 w-full rounded border-2 border-[#2f4553] bg-[#0f212e] px-2 py-2 text-sm text-white tabular-nums focus:border-[#557086] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00e701] disabled:cursor-not-allowed disabled:opacity-60'
const fieldLabelClass = 'mb-1 block text-xs font-semibold text-[#b1bad3]'

const DICE_METADATA = {
  title: 'Free Dice Demo | Demo Casino',
  description: 'Play a free Dice demo with Roll Over and Roll Under bets, adjustable odds, auto betting, and 10,000 virtual credits. No account or real money.',
  socialDescription: 'Play Dice free with configurable odds, automatic rolls, and virtual credits.',
  image: '/dice-demo-preview.svg',
  imageType: 'image/svg+xml',
  imageAlt: 'A dark Dice demo with a 0–100 odds slider, green win range, and virtual-credit controls',
  schema: {
    '@context': 'https://schema.org',
    '@type': ['VideoGame', 'WebApplication'],
    name: 'Demo Casino Dice',
    description: 'A free browser Dice demo played with virtual credits and no account or download.',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any modern web browser',
    gamePlatform: 'Web browser',
    playMode: 'SinglePlayer',
    genre: ['Dice', 'Casino-style demo'],
    isAccessibleForFree: true,
    image: '/dice-demo-preview.svg',
  },
}

function applyAdjustment(current: number, base: number, adjustment: DiceAdjustment, percent: number) {
  if (adjustment === 'reset') return base
  if (adjustment === 'increase') return Number((current * (1 + percent / 100)).toFixed(2))
  if (adjustment === 'decrease') return Number((current * Math.max(0, 1 - percent / 100)).toFixed(2))
  return current
}

function AdjustmentControl({
  label,
  value,
  percent,
  disabled,
  onChange,
  onPercentChange,
}: {
  label: string
  value: DiceAdjustment
  percent: string
  disabled: boolean
  onChange: (value: DiceAdjustment) => void
  onPercentChange: (value: string) => void
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
      <label className="min-w-0">
        <span className={fieldLabelClass}>{label}</span>
        <select
          name={label === 'On Win' ? 'diceOnWinAdjustment' : 'diceOnLossAdjustment'}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.value as DiceAdjustment)}
          className={`w-full ${betFieldClass}`}
        >
          <option value="none">No change</option>
          <option value="reset">Reset to base</option>
          <option value="increase">Increase by</option>
          <option value="decrease">Decrease by</option>
        </select>
      </label>
      <label className="min-w-0">
        <span className={fieldLabelClass}>Percent</span>
        <div className="flex items-center rounded border-2 border-[#2f4553] bg-[#0f212e] pr-2 focus-within:border-[#557086]">
          <input
            name={label === 'On Win' ? 'diceOnWinPercent' : 'diceOnLossPercent'}
            type="number"
            min="0"
            max="1000"
            step="1"
            inputMode="decimal"
            autoComplete="off"
            value={percent}
            disabled={disabled || (value !== 'increase' && value !== 'decrease')}
            onChange={(event) => onPercentChange(event.currentTarget.value)}
            className="min-w-0 w-full bg-transparent px-2 py-2 text-sm text-white focus:outline-none disabled:opacity-50"
            aria-label={`${label} bet adjustment percentage`}
          />
          <span aria-hidden="true" className="text-xs text-[#b1bad3]">%</span>
        </div>
      </label>
    </div>
  )
}

export function DicePage() {
  usePageMetadata(DICE_METADATA)
  const dispatch = useDispatch<AppDispatch>()
  const balance = useSelector(selectBalance)
  const activeRound = useSelector(selectDiceRound)
  const results = useSelector(selectDiceResults)
  const settings = useSelector(selectDiceSettings)
  const statistics = useSelector(selectDiceStatistics)
  const [isAutoRunning, setIsAutoRunning] = useState(false)
  const [liveRoll, setLiveRoll] = useState(0)
  const settingsDialogRef = useRef<HTMLDialogElement>(null)
  const statisticsDialogRef = useRef<HTMLDialogElement>(null)
  const timerRef = useRef<number | undefined>(undefined)
  const timerResolveRef = useRef<(() => void) | undefined>(undefined)
  const stopAutoRef = useRef(false)
  const mountedRef = useRef(true)

  const lastResult = results.at(-1)
  const betParsed = Number(settings.betAmount)
  const betAmount = settings.betAmount.trim() && Number.isFinite(betParsed) && betParsed > 0 ? betParsed : null
  const targetParsed = Number(settings.target)
  const isTargetValid = settings.target.trim() !== '' && isDiceTarget(targetParsed)
  const target = isTargetValid ? targetParsed : DICE_DEFAULT_TARGET
  const winChance = getDiceWinChance(settings.direction, target)
  const multiplier = getDiceMultiplier(settings.direction, target)
  const potentialProfit = betAmount === null ? 0 : Math.round((betAmount * multiplier - betAmount) * 100) / 100
  const betError = settings.betAmount === ''
    ? 'Enter a bet amount.'
    : betAmount === null
      ? 'Enter a positive bet amount.'
      : betAmount > balance
        ? 'Bet amount exceeds your balance.'
        : undefined
  const targetError = isTargetValid ? undefined : 'Enter a target from 1 to 99.'
  const count = settings.autoBetCount.trim() ? Number(settings.autoBetCount) : Number.NaN
  const countError = Number.isInteger(count) && count >= 0 ? undefined : 'Use 0 for unlimited bets or enter a whole number.'
  const stopProfit = Number(settings.stopOnProfit)
  const stopLoss = Number(settings.stopOnLoss)
  const autoStopError = [stopProfit, stopLoss].every((value) => Number.isFinite(value) && value >= 0)
    ? undefined
    : 'Stop limits must be zero or a positive amount.'
  const adjustmentPercentError = [
    [settings.onWinAdjustment, settings.onWinPercent],
    [settings.onLossAdjustment, settings.onLossPercent],
  ].some(([adjustment, value]) => {
    const percent = Number(value)
    return (adjustment === 'increase' || adjustment === 'decrease') &&
      (!value?.trim() || !Number.isFinite(percent) || percent < 0 || percent > 1_000)
  })
  const canPlay = !activeRound && !isAutoRunning && !betError && !targetError &&
    (settings.mode === 'manual' || (!countError && !autoStopError && !adjustmentPercentError))
  const statusMessage = activeRound
    ? 'Rolling…'
    : lastResult
      ? `${lastResult.won ? 'You won' : 'No win'} · ${lastResult.profit >= 0 ? '+' : '−'}${creditFormatter.format(Math.abs(lastResult.profit))} credits`
      : 'Set your odds and place a bet.'
  const shownRoll = activeRound ? liveRoll : lastResult?.roll ?? 0
  const isRolling = Boolean(activeRound)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopAutoRef.current = true
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current)
      timerRef.current = undefined
      timerResolveRef.current?.()
      timerResolveRef.current = undefined
      dispatch(cancelDiceRound())
      setDiceSoundEnabled(true)
    }
  }, [dispatch])

  useEffect(() => {
    setDiceSoundEnabled(settings.soundEnabled)
  }, [settings.soundEnabled])

  useEffect(() => {
    if (!activeRound || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const interval = window.setInterval(() => setLiveRoll(Math.random() * 100), 55)
    return () => window.clearInterval(interval)
  }, [activeRound?.id])

  function wait(milliseconds: number) {
    return new Promise<void>((resolve) => {
      timerResolveRef.current = resolve
      timerRef.current = window.setTimeout(() => {
        timerRef.current = undefined
        timerResolveRef.current = undefined
        resolve()
      }, milliseconds)
    })
  }

  function adjustBetAmount(factor: number) {
    if (betAmount === null) return
    dispatch(setDiceBetAmount(String(Number((betAmount * factor).toFixed(2)))))
  }

  function handleBetAmount(event: ChangeEvent<HTMLInputElement>) {
    dispatch(setDiceBetAmount(event.currentTarget.value))
  }

  function handleDirection(direction: DiceDirection) {
    dispatch(setDiceDirection(direction))
  }

  function handleTarget(event: ChangeEvent<HTMLInputElement>) {
    dispatch(setDiceTarget(event.currentTarget.value))
  }

  function placeBet(wager: number, direction: DiceDirection, rollTarget: number) {
    const roundId = crypto.randomUUID()
    if (!dispatch(startDiceRound(roundId, wager, direction, rollTarget))) return false
    if (settings.soundEnabled) prepareDiceAudio()
    return roundId
  }

  function handleManualBet() {
    if (!canPlay || betAmount === null) return
    const roundId = placeBet(betAmount, settings.direction, target)
    if (!roundId) return
    void wait(ROLL_ANIMATION_MS).then(() => {
      if (!mountedRef.current) return
      const result = dispatch(settleDiceBet(roundId))
      if (result && settings.soundEnabled) playDiceRoll(result.won)
    })
  }

  async function handleAutoBet() {
    if (isAutoRunning) {
      stopAutoRef.current = true
      return
    }
    if (!canPlay || betAmount === null) return

    stopAutoRef.current = false
    setIsAutoRunning(true)
    const baseWager = betAmount
    let nextWager = betAmount
    let sessionProfit = 0
    let completed = 0

    try {
      while (!stopAutoRef.current) {
        const roundId = placeBet(nextWager, settings.direction, target)
        if (!roundId) break
        await wait(ROLL_ANIMATION_MS)
        if (!mountedRef.current) return

        const result = dispatch(settleDiceBet(roundId))
        if (!result) break
        if (settings.soundEnabled) playDiceRoll(result.won)
        completed += 1
        sessionProfit = Math.round((sessionProfit + result.profit) * 100) / 100

        const hitStopProfit = stopProfit > 0 && sessionProfit >= stopProfit
        const hitStopLoss = stopLoss > 0 && sessionProfit <= -stopLoss
        if (stopAutoRef.current || hitStopProfit || hitStopLoss || (count > 0 && completed >= count)) break

        const adjustment = result.won ? settings.onWinAdjustment : settings.onLossAdjustment
        const percent = Number(result.won ? settings.onWinPercent : settings.onLossPercent)
        nextWager = applyAdjustment(nextWager, baseWager, adjustment, percent)
        dispatch(setDiceBetAmount(String(nextWager)))
        await wait(AUTO_BET_GAP_MS)
        if (!mountedRef.current) return
      }
    } finally {
      if (mountedRef.current) setIsAutoRunning(false)
    }
  }

  function handleMode(mode: 'manual' | 'auto') {
    if (!activeRound && !isAutoRunning) dispatch(setDiceMode(mode))
  }

  function handleSoundChange(event: ChangeEvent<HTMLInputElement>) {
    const enabled = event.currentTarget.checked
    dispatch(setStoredDiceSoundEnabled(enabled))
    setDiceSoundEnabled(enabled)
    if (enabled) prepareDiceAudio()
  }

  function handlePlay() {
    if (settings.mode === 'auto') void handleAutoBet()
    else handleManualBet()
  }

  useSpaceShortcut(canPlay, handlePlay)

  const resultPosition = lastResult ? `${lastResult.roll}%` : undefined
  const targetPosition = `${target}%`
  const trackBackground = settings.direction === 'under'
    ? `linear-gradient(to right, #00e701 0%, #00e701 ${targetPosition}, #ed4163 ${targetPosition}, #ed4163 100%)`
    : `linear-gradient(to right, #ed4163 0%, #ed4163 ${targetPosition}, #00e701 ${targetPosition}, #00e701 100%)`

  return (
    <main id="main-content" className="px-2 py-3 sm:px-5 sm:py-6 lg:py-8">
      <h1 className="sr-only">Dice</h1>
      <div className="mx-auto max-w-6xl overflow-hidden rounded bg-[#0f192a] shadow-xl shadow-black/25 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)]">
        <section className="relative flex min-h-[430px] flex-col overflow-hidden px-4 py-6 sm:min-h-[560px] sm:px-8 lg:col-start-2 lg:min-h-[640px]" aria-label="Dice game board">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-45 [background:radial-gradient(circle_at_50%_45%,#174536_0%,#102c34_40%,#0f192a_78%)]" />
          <div className="relative z-10 m-auto w-full max-w-3xl">
            <div className="mb-7 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wider text-[#b1bad3]">
              <span className="flex items-center gap-2"><Dices aria-hidden="true" className="size-4 text-[#00e701]" /> Dice</span>
              <span>RTP <strong className="ml-1 text-white">99.00%</strong></span>
            </div>

            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#b1bad3]">Your Roll</span>
              <p
                aria-live="off"
                aria-label={`Dice roll ${shownRoll.toFixed(2)}`}
                className={`mt-2 font-mono text-6xl font-black tabular-nums tracking-tight text-white sm:text-7xl ${isRolling ? 'dice-roll-number' : ''} ${lastResult && !isRolling ? (lastResult.won ? 'text-[#00e701]' : 'text-[#ed4163]') : ''}`}
              >
                {shownRoll.toFixed(2)}
              </p>
              <p aria-live="polite" className="mt-2 min-h-6 text-sm font-semibold text-white">
                {statusMessage}
              </p>
            </div>

            <div className="mt-12">
              <div className="relative py-3">
                <div className="relative h-3 rounded-full shadow-inner shadow-black/40" style={{ background: trackBackground }}>
                  {resultPosition ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-1/2 z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#0f212e] shadow-md"
                      style={{ left: resultPosition }}
                    />
                  ) : null}
                  <input
                    aria-label="Set the winning target number"
                    name="diceTargetSlider"
                    type="range"
                    min={DICE_MIN_TARGET}
                    max={DICE_MAX_TARGET}
                    step="0.01"
                    value={target}
                    disabled={Boolean(activeRound) || isAutoRunning}
                    onChange={(event) => dispatch(setDiceTarget(event.currentTarget.value))}
                    className="dice-target-slider absolute inset-x-0 top-1/2 z-20 h-8 w-full -translate-y-1/2 cursor-ew-resize disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="mt-1 flex justify-between text-xs font-semibold tabular-nums text-[#b1bad3]">
                <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
              </div>
              <p className="mt-3 text-center text-xs text-[#b1bad3]">
                Green wins {settings.direction === 'under' ? 'below' : 'above'} {target.toFixed(2)} · ties lose
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
              <label className="min-w-0">
                <span className={fieldLabelClass}>Multiplier</span>
                <div className="flex items-center rounded border-2 border-[#2f4553] bg-[#0f212e] px-3 py-2 focus-within:border-[#557086]">
                  <input
                    aria-label="Multiplier"
                    name="diceMultiplier"
                    readOnly
                    value={`${multiplier.toFixed(4)}×`}
                    className="min-w-0 w-full bg-transparent text-sm font-bold tabular-nums text-white focus:outline-none"
                  />
                </div>
              </label>
              <label className="min-w-0">
                <span className={fieldLabelClass}>Roll {settings.direction === 'over' ? 'Over' : 'Under'}</span>
                <input
                  aria-label={`Roll ${settings.direction === 'over' ? 'over' : 'under'} target`}
                  name="diceTarget"
                  type="number"
                  min={DICE_MIN_TARGET}
                  max={DICE_MAX_TARGET}
                  step="0.01"
                  inputMode="decimal"
                  autoComplete="off"
                  value={settings.target}
                  disabled={Boolean(activeRound) || isAutoRunning}
                  onChange={handleTarget}
                  aria-invalid={Boolean(targetError)}
                  aria-describedby={targetError ? 'dice-target-error' : undefined}
                  className={smallFieldClass}
                />
              </label>
              <label className="min-w-0">
                <span className={fieldLabelClass}>Win Chance</span>
                <div className="flex items-center rounded border-2 border-[#2f4553] bg-[#0f212e] px-3 py-2">
                  <input
                    aria-label="Win chance"
                    name="diceWinChance"
                    readOnly
                    value={`${winChance.toFixed(4)}%`}
                    className="min-w-0 w-full bg-transparent text-sm font-bold tabular-nums text-white focus:outline-none"
                  />
                </div>
              </label>
            </div>
            {targetError ? <p id="dice-target-error" className="mt-2 text-xs text-red-400">{targetError}</p> : null}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={settings.direction === 'over'}
                disabled={Boolean(activeRound) || isAutoRunning}
                onClick={() => handleDirection('over')}
                className={`rounded py-2.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60 ${settings.direction === 'over' ? 'bg-[#00e701] text-[#0f212e]' : 'bg-[#2f4553] text-white hover:bg-[#3b5565]'}`}
              >Roll Over</button>
              <button
                type="button"
                aria-pressed={settings.direction === 'under'}
                disabled={Boolean(activeRound) || isAutoRunning}
                onClick={() => handleDirection('under')}
                className={`rounded py-2.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60 ${settings.direction === 'under' ? 'bg-[#00e701] text-[#0f212e]' : 'bg-[#2f4553] text-white hover:bg-[#3b5565]'}`}
              >Roll Under</button>
            </div>

            <section className="mt-9 border-t border-white/10 pt-4" aria-label="Recent dice rolls">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#b1bad3]">Recent Rolls</h2>
                <span className="text-xs tabular-nums text-[#7f8da3]">{results.length} settled</span>
              </div>
              {results.length > 0 ? (
                <ol className="flex min-h-9 flex-wrap gap-2">
                  {[...results.slice(-12)].reverse().map((result) => (
                    <li key={result.id}>
                      <span
                        title={`${result.direction === 'over' ? 'Over' : 'Under'} ${result.target.toFixed(2)} · ${result.won ? 'Won' : 'Lost'} ${creditFormatter.format(result.profit)} credits`}
                        className={`inline-flex min-w-14 justify-center rounded px-2 py-1.5 text-xs font-bold tabular-nums ${result.won ? 'bg-[#00e701]/15 text-[#00e701]' : 'bg-[#ed4163]/15 text-[#ff6680]'}`}
                      >{result.roll.toFixed(2)}</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-xs text-[#7f8da3]">Your settled rolls will appear here.</p>}
            </section>
          </div>
        </section>

        <aside className="flex flex-col gap-4 bg-[#213743] p-3 sm:p-4 lg:col-start-1 lg:row-start-1 lg:min-h-[640px]">
          <div>
            <div className="mb-4 grid grid-cols-2 rounded bg-[#0f212e] p-1" role="group" aria-label="Betting mode">
              {(['manual', 'auto'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={settings.mode === mode}
                  disabled={Boolean(activeRound) || isAutoRunning}
                  onClick={() => handleMode(mode)}
                  className={`rounded py-2 text-sm font-bold capitalize transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701] disabled:opacity-60 ${settings.mode === mode ? 'bg-[#2f4553] text-white' : 'text-[#b1bad3] hover:text-white'}`}
                >{mode}</button>
              ))}
            </div>

            <label htmlFor="dice-bet-amount" className="mb-1 block text-sm font-semibold text-[#b1bad3]">Bet Amount</label>
            <div className="flex overflow-hidden rounded border-2 border-[#2f4553] bg-[#0f212e] focus-within:border-[#557086]">
              <span aria-hidden="true" className="grid place-items-center pl-3 text-slate-500">$</span>
              <input
                id="dice-bet-amount"
                name="diceBetAmount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00…"
                value={settings.betAmount}
                disabled={Boolean(activeRound) || isAutoRunning}
                onChange={handleBetAmount}
                aria-invalid={Boolean(betError)}
                aria-describedby={betError ? 'dice-bet-error' : undefined}
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
              />
              <button type="button" aria-label="Halve bet amount" disabled={Boolean(activeRound) || isAutoRunning || betAmount === null} onClick={() => adjustBetAmount(0.5)} className="bg-[#2f4553] px-3 font-bold text-white transition-colors hover:bg-[#3b5565] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#00e701] disabled:cursor-not-allowed disabled:opacity-50">½</button>
              <button type="button" aria-label="Double bet amount" disabled={Boolean(activeRound) || isAutoRunning || betAmount === null} onClick={() => adjustBetAmount(2)} className="border-l-2 border-[#213743] bg-[#2f4553] px-3 text-sm font-bold text-white transition-colors hover:bg-[#3b5565] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#00e701] disabled:cursor-not-allowed disabled:opacity-50">2×</button>
            </div>
            {betError ? <p id="dice-bet-error" className="mt-1 text-xs text-red-400">{betError}</p> : null}
          </div>

          <div className="flex items-center justify-between rounded bg-[#172b36] px-3 py-2.5 text-sm">
            <span className="text-[#b1bad3]">Profit on Win</span>
            <span className="font-bold tabular-nums text-[#00e701]">{creditFormatter.format(potentialProfit)}</span>
          </div>

          {settings.mode === 'auto' ? (
            <div className="space-y-3 rounded bg-[#172b36] p-3">
              <h2 className="text-sm font-bold text-white">Auto Bet Settings</h2>
              <label className="block">
                <span className={fieldLabelClass}>Number of Bets <span className="font-normal">(0 = unlimited)</span></span>
                <input
                  name="diceAutoBetCount"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  autoComplete="off"
                  value={settings.autoBetCount}
                  disabled={isAutoRunning || Boolean(activeRound)}
                  onChange={(event) => dispatch(setDiceAutoBetCount(event.currentTarget.value))}
                  aria-invalid={Boolean(countError)}
                  aria-describedby={countError ? 'dice-count-error' : undefined}
                  className={smallFieldClass}
                />
                {countError ? <span id="dice-count-error" className="mt-1 block text-xs text-red-400">{countError}</span> : null}
              </label>
              <AdjustmentControl
                label="On Win"
                value={settings.onWinAdjustment}
                percent={settings.onWinPercent}
                disabled={isAutoRunning || Boolean(activeRound)}
                onChange={(value) => dispatch(setDiceOnWinAdjustment(value))}
                onPercentChange={(value) => dispatch(setDiceOnWinPercent(value))}
              />
              <AdjustmentControl
                label="On Loss"
                value={settings.onLossAdjustment}
                percent={settings.onLossPercent}
                disabled={isAutoRunning || Boolean(activeRound)}
                onChange={(value) => dispatch(setDiceOnLossAdjustment(value))}
                onPercentChange={(value) => dispatch(setDiceOnLossPercent(value))}
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="min-w-0">
                  <span className={fieldLabelClass}>Stop on Profit</span>
                  <input name="diceStopOnProfit" type="number" min="0" step="0.01" inputMode="decimal" autoComplete="off" value={settings.stopOnProfit} disabled={isAutoRunning || Boolean(activeRound)} onChange={(event) => dispatch(setDiceStopOnProfit(event.currentTarget.value))} className={smallFieldClass} />
                </label>
                <label className="min-w-0">
                  <span className={fieldLabelClass}>Stop on Loss</span>
                  <input name="diceStopOnLoss" type="number" min="0" step="0.01" inputMode="decimal" autoComplete="off" value={settings.stopOnLoss} disabled={isAutoRunning || Boolean(activeRound)} onChange={(event) => dispatch(setDiceStopOnLoss(event.currentTarget.value))} className={smallFieldClass} />
                </label>
              </div>
              {autoStopError ? <p className="text-xs text-red-400">{autoStopError}</p> : null}
              {adjustmentPercentError ? <p className="text-xs text-red-400">Percent adjustments must be between 0 and 1,000.</p> : null}
            </div>
          ) : null}

          <button
            type="button"
            disabled={!isAutoRunning && !canPlay}
            onClick={handlePlay}
            className="rounded bg-[#00e701] py-3 font-bold text-[#0f212e] shadow-md shadow-black/20 transition-colors hover:bg-[#1fff20] active:bg-[#00c901] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:bg-[#557086] disabled:text-[#b1bad3]"
          >
            {isAutoRunning ? 'Stop Autobet' : activeRound ? 'Rolling…' : settings.mode === 'auto' ? 'Start Autobet' : 'Bet'}
          </button>

          <div className="mt-auto border-t border-[#2f4553] pt-3 text-xs leading-5 text-[#b1bad3]">
            <div className="mb-3 flex items-center gap-2">
              <button type="button" aria-label="Game settings" onClick={() => settingsDialogRef.current?.showModal()} className="rounded p-2 text-[#b1bad3] transition-colors hover:bg-[#2f4553] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]">
                <Settings aria-hidden="true" className="size-5" />
              </button>
              <button type="button" aria-label="Open live statistics" onClick={() => statisticsDialogRef.current?.showModal()} className="flex items-center gap-2 rounded p-2 text-sm font-semibold text-[#b1bad3] transition-colors hover:bg-[#2f4553] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]">
                <BarChart3 aria-hidden="true" className="size-5" /> Statistics
              </button>
            </div>
            <p><strong className="text-white">Demo rules:</strong> Roll Over wins above the target; Roll Under wins below it. Ties lose. Payouts use a 99% return and virtual credits only.</p>
          </div>
        </aside>
      </div>

      <dialog ref={settingsDialogRef} aria-labelledby="dice-settings-title" className="m-auto max-h-[calc(100dvh-1rem)] w-[min(32rem,calc(100%-1rem))] overflow-y-auto overscroll-contain rounded-lg border border-[#2f4553] bg-[#213743] p-0 text-white shadow-2xl backdrop:bg-black/70 sm:max-h-[calc(100dvh-2rem)] sm:w-[min(32rem,calc(100%-2rem))]">
        <form method="dialog" className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="dice-settings-title" className="text-xl font-bold text-balance">Game Settings</h2>
              <p className="mt-1 text-sm text-[#b1bad3]">Tune Dice audio and motion.</p>
            </div>
            <button type="submit" aria-label="Close settings" className="shrink-0 rounded p-2 text-[#b1bad3] transition-colors hover:bg-[#2f4553] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]"><X aria-hidden="true" className="size-5" /></button>
          </div>
          <fieldset className="mt-5 border-t border-[#2f4553] pt-5">
            <legend className="sr-only">Sound</legend>
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded bg-[#172b36] p-3 hover:bg-[#1a303c] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#00e701]">
              <span className="flex min-w-0 items-center gap-3">
                {settings.soundEnabled ? <Volume2 aria-hidden="true" className="size-5 shrink-0 text-[#b1bad3]" /> : <VolumeX aria-hidden="true" className="size-5 shrink-0 text-[#b1bad3]" />}
                <span><span className="block text-sm font-semibold">Sound Effects</span><span className="block text-xs text-[#b1bad3]">Dice roll and result sounds</span></span>
              </span>
              <input type="checkbox" name="diceSound" checked={settings.soundEnabled} onChange={handleSoundChange} className="size-5 shrink-0 accent-[#00e701]" />
            </label>
          </fieldset>
          <p className="mt-4 text-xs leading-5 text-[#b1bad3]">Motion follows your device’s reduced-motion setting.</p>
        </form>
      </dialog>
      <SessionStatisticsDialog ref={statisticsDialogRef} playLabel="Bets" statistics={statistics} />
    </main>
  )
}
