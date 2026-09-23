import { BarChart3, Bomb, Dices, Gem, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  cancelMinesRound,
  cashOutMines,
  revealMineTile,
  selectBalance,
  selectMinesResults,
  selectMinesRound,
  startMinesRound,
  type AppDispatch,
} from '../../app/store'
import { usePageMetadata } from '../../app/usePageMetadata'
import { playMinesCashOut, playMinesGem, playMinesMine, prepareMinesAudio, setMinesSoundEnabled } from './minesAudio'
import { getMinesMultiplier, getSafeRevealCount, MINES_TILE_COUNT } from './minesGame'
import { calculateMinesStatistics } from './minesStatistics'
import { SessionStatisticsDialog } from '../../shared/SessionStatisticsDialog'

const creditFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const MINES_METADATA = {
  title: 'Free Mines Demo | Demo Casino',
  description: 'Play a free Stake-style Mines demo on a 5×5 grid with virtual credits, adjustable mine counts, and instant cash out. No account or real money.',
  socialDescription: 'Play Mines free on a 5×5 grid with virtual credits and no account required.',
  image: '/mines-demo-preview.jpg',
  imageAlt: 'A dark 5 by 5 Mines game board with green gems and virtual-credit betting controls',
  schema: {
    '@context': 'https://schema.org',
    '@type': ['VideoGame', 'WebApplication'],
    name: 'Demo Casino Mines',
    description: 'A free browser Mines demo played with virtual credits and no account or download.',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any modern web browser',
    gamePlatform: 'Web browser',
    playMode: 'SinglePlayer',
    genre: ['Mines', 'Puzzle game', 'Casino-style demo'],
    isAccessibleForFree: true,
  },
}

type MinesDeveloperWindow = Window & {
  startMinesDemo?: (minePositions: number[]) => boolean
}

export function MinesPage() {
  usePageMetadata(MINES_METADATA)
  const dispatch = useDispatch<AppDispatch>()
  const balance = useSelector(selectBalance)
  const activeRound = useSelector(selectMinesRound)
  const results = useSelector(selectMinesResults)
  const statisticsDialogRef = useRef<HTMLDialogElement>(null)
  const statistics = calculateMinesStatistics(results)
  const dragPointerId = useRef<number | null>(null)
  const lastDraggedTile = useRef<number | null>(null)
  const lastResult = results.at(-1)
  const displayRound = activeRound ?? lastResult
  const [betAmountInput, setBetAmountInput] = useState('1')
  const [mineCount, setMineCount] = useState(3)
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)
  const parsedBetAmount = Number(betAmountInput)
  const betAmount = betAmountInput !== '' && Number.isFinite(parsedBetAmount) && parsedBetAmount > 0
    ? parsedBetAmount
    : null
  const betAmountError = betAmountInput === ''
    ? 'Enter a bet amount.'
    : betAmount === null
      ? 'Enter a positive bet amount.'
      : betAmount > balance
        ? 'Bet amount exceeds your balance.'
        : undefined
  const safeReveals = displayRound ? getSafeRevealCount(displayRound) : 0
  const multiplier = activeRound
    ? getMinesMultiplier(activeRound.mineCount, safeReveals)
    : lastResult?.multiplier ?? 1
  const potentialPayout = activeRound ? Math.round(activeRound.wager * multiplier * 100) / 100 : 0
  const statusMessage = activeRound
    ? safeReveals === 0
      ? 'Pick a tile to begin.'
      : `${safeReveals} ${safeReveals === 1 ? 'gem' : 'gems'} found · ${multiplier.toFixed(2)}×`
    : lastResult
      ? lastResult.status === 'mine'
        ? `Mine hit · ${creditFormatter.format(lastResult.profit)} credits`
        : `${lastResult.status === 'cleared' ? 'Board cleared' : 'Cashed out'} · +${creditFormatter.format(lastResult.profit)} credits`
      : 'Set your bet and choose where to dig.'

  useEffect(() => () => {
    dispatch(cancelMinesRound())
    setMinesSoundEnabled(true)
  }, [dispatch])

  useEffect(() => {
    function stopDragging(event: PointerEvent) {
      if (event.pointerId !== dragPointerId.current) return
      dragPointerId.current = null
      lastDraggedTile.current = null
    }

    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)
    return () => {
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
    }
  }, [])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const developerWindow = window as MinesDeveloperWindow
    developerWindow.startMinesDemo = (minePositions) => {
      if (betAmount === null) return false
      return dispatch(startMinesRound(crypto.randomUUID(), betAmount, minePositions.length, minePositions))
    }
    return () => {
      delete developerWindow.startMinesDemo
    }
  }, [betAmount, dispatch])

  function adjustBetAmount(multiplierValue: number) {
    if (betAmount === null) return
    setBetAmountInput(String(Number((betAmount * multiplierValue).toFixed(2))))
  }

  function handleMineCount(event: ChangeEvent<HTMLSelectElement>) {
    setMineCount(Number(event.currentTarget.value))
  }

  function startRound() {
    if (betAmount === null) return
    if (isSoundEnabled) prepareMinesAudio()
    dispatch(startMinesRound(crypto.randomUUID(), betAmount, mineCount))
  }

  function revealTile(tile: number) {
    if (!activeRound) return
    const isMine = activeRound.minePositions.includes(tile)
    const isFinalSafeReveal = !isMine && activeRound.revealedTiles.length + 1 === MINES_TILE_COUNT - activeRound.mineCount
    if (!dispatch(revealMineTile(tile)) || !isSoundEnabled) return
    if (isMine) playMinesMine()
    else if (isFinalSafeReveal) playMinesCashOut()
    else playMinesGem()
  }

  function cashOut() {
    if (dispatch(cashOutMines()) && isSoundEnabled) playMinesCashOut()
  }

  function handleSoundChange(event: ChangeEvent<HTMLInputElement>) {
    const enabled = event.currentTarget.checked
    setIsSoundEnabled(enabled)
    setMinesSoundEnabled(enabled)
    if (enabled) prepareMinesAudio()
  }

  function revealRandomTile() {
    if (!activeRound) return
    const hiddenTiles = Array.from({ length: MINES_TILE_COUNT }, (_, tile) => tile)
      .filter((tile) => !activeRound.revealedTiles.includes(tile))
    const tile = hiddenTiles[Math.floor(Math.random() * hiddenTiles.length)]
    revealTile(tile)
  }

  function startTileSweep(tile: number, event: ReactPointerEvent<HTMLButtonElement>) {
    if (!activeRound || !event.isPrimary || event.button !== 0) return
    dragPointerId.current = event.pointerId
    lastDraggedTile.current = tile
    revealTile(tile)
  }

  function continueTileSweep(event: ReactPointerEvent<HTMLDivElement>) {
    if (!activeRound || event.pointerId !== dragPointerId.current) return
    const target = document.elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLButtonElement>('button[data-mines-tile]')
    if (!target || !event.currentTarget.contains(target)) return
    const tile = Number(target.dataset.minesTile)
    if (!Number.isInteger(tile) || tile === lastDraggedTile.current) return
    lastDraggedTile.current = tile
    revealTile(tile)
  }

  return (
    <main id="main-content" className="px-2 py-3 sm:px-5 sm:py-6 lg:py-8">
      <h1 className="sr-only">Mines</h1>
      <div className="mx-auto max-w-6xl overflow-hidden rounded bg-[#0f192a] shadow-xl shadow-black/25 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)]">
        <section className="relative flex min-h-[430px] flex-col overflow-hidden px-3 py-6 sm:min-h-[600px] sm:px-8 lg:col-start-2 lg:min-h-[640px]" aria-label="Mines board">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50 [background:radial-gradient(circle_at_50%_50%,#183d3d_0%,#0f2833_38%,#0f192a_75%)]" />
          <div className="relative z-10 m-auto w-full max-w-[34rem]">
            <div className="mb-4 flex items-center justify-between gap-3 rounded bg-[#0f212e]/80 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#b1bad3] sm:mb-5">
              <span>Mines <strong className="ml-1 text-white">{displayRound?.mineCount ?? mineCount}</strong></span>
              <span>Gems <strong className="ml-1 text-white">{safeReveals}</strong></span>
              <span>Multiplier <strong className="ml-1 text-[#00e701]">{multiplier.toFixed(2)}×</strong></span>
            </div>

            <div className="grid grid-cols-5 gap-2 select-none sm:gap-3" onPointerMove={continueTileSweep}>
              {Array.from({ length: MINES_TILE_COUNT }, (_, tile) => {
                const isRevealed = Boolean(displayRound?.revealedTiles.includes(tile))
                const isMine = Boolean(displayRound?.minePositions.includes(tile))
                const showMine = Boolean(displayRound && !activeRound && isMine)
                const showGem = isRevealed && !isMine
                const label = showMine ? `Tile ${tile + 1}: mine` : showGem ? `Tile ${tile + 1}: gem` : `Tile ${tile + 1}`
                return (
                  <button
                    key={tile}
                    type="button"
                    aria-label={label}
                    aria-disabled={isRevealed}
                    data-mines-tile={tile}
                    disabled={!activeRound}
                    style={{ touchAction: activeRound ? 'none' : undefined }}
                    onPointerDown={(event) => startTileSweep(tile, event)}
                    onClick={() => revealTile(tile)}
                    className={`min-h-12 aspect-square rounded-lg border-b-4 p-1 transition-[transform,background-color,border-color,opacity] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:rounded-xl ${
                      showMine
                        ? 'mines-tile-reveal border-[#c02b48] bg-[#ed4163] text-white'
                        : showGem
                          ? 'mines-tile-reveal border-[#00a800] bg-[#00e701] text-[#0f212e]'
                          : activeRound
                            ? 'border-[#172b36] bg-[#2f4553] text-[#b1bad3] hover:bg-[#3b5565] active:border-b-2'
                            : 'border-[#172b36] bg-[#263e4b] text-[#7f8da3] opacity-75'
                    }`}
                  >
                    {showMine ? <Bomb aria-hidden="true" className="mx-auto size-7 sm:size-10" /> : showGem ? <Gem aria-hidden="true" className="mx-auto size-7 sm:size-10" fill="currentColor" /> : null}
                  </button>
                )
              })}
            </div>

            <p aria-live="polite" className="mt-5 min-h-6 text-center text-sm font-semibold text-white">{statusMessage}</p>
          </div>
        </section>

        <aside className="flex flex-col gap-5 bg-[#213743] p-3 sm:p-4 lg:col-start-1 lg:row-start-1 lg:min-h-[640px]">
          <div>
            <label htmlFor="mines-bet-amount" className="mb-1 block text-sm font-semibold text-[#b1bad3]">Bet Amount</label>
            <div className="flex overflow-hidden rounded border-2 border-[#2f4553] bg-[#0f212e] focus-within:border-[#557086]">
              <span aria-hidden="true" className="grid place-items-center pl-3 text-slate-500">$</span>
              <input
                id="mines-bet-amount"
                name="minesBetAmount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00…"
                value={betAmountInput}
                disabled={Boolean(activeRound)}
                onChange={(event) => setBetAmountInput(event.currentTarget.value)}
                aria-invalid={Boolean(betAmountError)}
                aria-describedby={betAmountError ? 'mines-bet-error' : undefined}
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
              />
              <button type="button" aria-label="Halve bet amount" disabled={Boolean(activeRound) || betAmount === null} onClick={() => adjustBetAmount(0.5)} className="bg-[#2f4553] px-4 font-bold text-white transition-colors hover:bg-[#3b5565] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#00e701] disabled:cursor-not-allowed disabled:opacity-50">1/2</button>
              <button type="button" aria-label="Double bet amount" disabled={Boolean(activeRound) || betAmount === null} onClick={() => adjustBetAmount(2)} className="border-l-2 border-[#213743] bg-[#2f4553] px-4 text-sm font-bold text-white transition-colors hover:bg-[#3b5565] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#00e701] disabled:cursor-not-allowed disabled:opacity-50">2×</button>
            </div>
            {betAmountError && !activeRound ? <p id="mines-bet-error" className="mt-1 text-xs text-red-400">{betAmountError}</p> : null}
          </div>

          <div>
            <label htmlFor="mine-count" className="mb-1 block text-sm font-semibold text-[#b1bad3]">Mines</label>
            <select id="mine-count" value={mineCount} disabled={Boolean(activeRound)} onChange={handleMineCount} className="w-full rounded border-2 border-[#2f4553] bg-[#0f212e] px-3 py-2 text-sm text-white focus:border-[#557086] focus:outline-none disabled:cursor-not-allowed disabled:opacity-70">
              {Array.from({ length: 24 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded bg-[#172b36] p-3 hover:bg-[#2f4553] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#00e701]">
            <span className="flex items-center gap-3 text-sm font-semibold">
              {isSoundEnabled ? <Volume2 aria-hidden="true" className="size-5 text-[#b1bad3]" /> : <VolumeX aria-hidden="true" className="size-5 text-[#b1bad3]" />}
              Sound Effects
            </span>
            <input type="checkbox" name="minesSound" checked={isSoundEnabled} onChange={handleSoundChange} className="size-5 shrink-0 accent-[#00e701]" />
          </label>

          {activeRound ? (
            <>
              <button type="button" disabled={safeReveals === 0} onClick={cashOut} className="rounded bg-[#00e701] py-3 font-bold text-[#0f212e] shadow-md shadow-black/20 transition-colors hover:bg-[#1fff20] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:bg-[#557086] disabled:text-[#b1bad3]">
                Cash Out {creditFormatter.format(potentialPayout)}
              </button>
              <button type="button" onClick={revealRandomTile} className="flex items-center justify-center gap-2 rounded bg-[#2f4553] py-3 font-bold text-white transition-colors hover:bg-[#3b5565] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]">
                <Dices aria-hidden="true" className="size-5" /> Pick Random Tile
              </button>
            </>
          ) : (
            <button type="button" disabled={betAmount === null || betAmount > balance} onClick={startRound} className="rounded bg-[#00e701] py-3 font-bold text-[#0f212e] shadow-md shadow-black/20 transition-colors hover:bg-[#1fff20] active:bg-[#00c901] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:bg-[#557086] disabled:text-[#b1bad3]">Bet</button>
          )}

          <div className="mt-auto border-t border-[#2f4553] pt-4 text-xs leading-5 text-[#b1bad3]">
            <button
              type="button"
              aria-label="Open live statistics"
              onClick={() => statisticsDialogRef.current?.showModal()}
              className="mb-4 flex items-center gap-2 rounded p-2 text-sm font-semibold text-[#b1bad3] transition-colors hover:bg-[#2f4553] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]"
            >
              <BarChart3 aria-hidden="true" className="size-5" /> Statistics
            </button>
            <p><strong className="text-white">Demo rules:</strong> Choose 1–24 mines. Each safe tile raises the payout. Cash out before finding a mine.</p>
          </div>
        </aside>
      </div>
      <SessionStatisticsDialog ref={statisticsDialogRef} playLabel="Rounds" statistics={statistics} />
    </main>
  )
}
