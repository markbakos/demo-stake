import { LockKeyhole, Spade } from 'lucide-react'
import { useEffect, useState, type ChangeEvent } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { usePageMetadata } from '../../app/usePageMetadata'
import {
  cancelBlackjackRound,
  chooseBlackjackInsurance,
  doubleBlackjack,
  hitBlackjack,
  selectBalance,
  selectBlackjackResults,
  selectBlackjackRound,
  splitBlackjack,
  standBlackjack,
  startBlackjackRound,
  type AppDispatch,
} from '../../app/store'
import {
  canDoubleBlackjack,
  canSplitBlackjack,
  getHandValue,
  type BlackjackCard,
  type BlackjackHand,
  type BlackjackHandResult,
  type BlackjackOutcome,
} from './blackjackGame'

const creditFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const SUIT_SYMBOLS = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
} as const

const OUTCOME_LABELS: Record<BlackjackOutcome, string> = {
  win: 'You Win',
  loss: 'Dealer Wins',
  push: 'Push',
}

const BLACKJACK_METADATA = {
  title: 'Free Blackjack Demo | Demo Casino',
  description: 'Play a free Stake-style Blackjack demo with virtual credits. Hit, stand, split, double, and use insurance with no account or real money.',
  socialDescription: 'Play classic Blackjack free with virtual credits, fast card dealing, and no account required.',
  image: '/blackjack-demo-preview.jpg',
  imageAlt: 'A dark Blackjack table with four aces and virtual-credit betting controls',
  schema: {
    '@context': 'https://schema.org',
    '@type': ['VideoGame', 'WebApplication'],
    name: 'Demo Casino Blackjack',
    description: 'A free browser Blackjack demo played with virtual credits and no account or download.',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any modern web browser',
    gamePlatform: 'Web browser',
    playMode: 'SinglePlayer',
    genre: ['Blackjack', 'Card game', 'Casino-style demo'],
    isAccessibleForFree: true,
  },
}

function isHandResult(hand: BlackjackHand | BlackjackHandResult): hand is BlackjackHandResult {
  return 'outcome' in hand
}

function PlayingCard({ card, isHidden = false, dealIndex = 0 }: { card?: BlackjackCard; isHidden?: boolean; dealIndex?: number }) {
  if (isHidden || !card) {
    return (
      <div
        aria-label="Face-down card"
        className="blackjack-card blackjack-card-back"
        style={{ animationDelay: `${dealIndex * 70}ms` }}
      >
        <Spade aria-hidden="true" className="size-7 text-white/70" fill="currentColor" />
      </div>
    )
  }

  const symbol = SUIT_SYMBOLS[card.suit]
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds'
  return (
    <div
      aria-label={`${card.rank} of ${card.suit}`}
      className={`blackjack-card bg-white ${isRed ? 'text-[#e9113c]' : 'text-[#1a2c38]'}`}
      style={{ animationDelay: `${dealIndex * 70}ms` }}
    >
      <span className="absolute left-2 top-1.5 text-sm font-black leading-none sm:text-base">{card.rank}</span>
      <span aria-hidden="true" className="text-3xl sm:text-4xl">{symbol}</span>
      <span aria-hidden="true" className="absolute bottom-1.5 right-2 rotate-180 text-sm font-black leading-none sm:text-base">{card.rank}</span>
    </div>
  )
}

function CardHand({
  hand,
  handIndex,
  isActive,
  outcome,
}: {
  hand: BlackjackHand | BlackjackHandResult
  handIndex: number
  isActive: boolean
  outcome?: BlackjackOutcome
}) {
  const { total, isSoft } = getHandValue(hand.cards)
  return (
    <div className={`relative mx-auto w-fit min-w-32 rounded-xl px-3 py-2 ${isActive ? 'ring-2 ring-[#00e701] ring-offset-4 ring-offset-[#0f192a]' : ''}`}>
      <div className="mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-[#b1bad3]">
        <span>{handIndex === 0 ? 'Your Hand' : `Hand ${handIndex + 1}`}</span>
        <span className="rounded-full bg-[#213743] px-2 py-0.5 tabular-nums text-white">
          {total}{isSoft ? ' soft' : ''}
        </span>
      </div>
      <div className="flex min-h-24 justify-center -space-x-5 sm:min-h-28 sm:-space-x-6">
        {hand.cards.map((card, index) => (
          <PlayingCard key={`${card.rank}-${card.suit}-${index}`} card={card} dealIndex={index + 2} />
        ))}
      </div>
      {outcome ? (
        <p className={`mt-2 text-center text-sm font-bold ${outcome === 'win' ? 'text-[#00e701]' : outcome === 'loss' ? 'text-[#ed4163]' : 'text-[#b1bad3]'}`}>
          {outcome === 'win' ? 'Won' : outcome === 'loss' ? 'Lost' : 'Push'}
        </p>
      ) : null}
    </div>
  )
}

export function BlackjackPage() {
  usePageMetadata(BLACKJACK_METADATA)
  const dispatch = useDispatch<AppDispatch>()
  const balance = useSelector(selectBalance)
  const activeRound = useSelector(selectBlackjackRound)
  const results = useSelector(selectBlackjackResults)
  const lastResult = results.at(-1)
  const [betAmountInput, setBetAmountInput] = useState('1')
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
  const displayDealerCards = activeRound?.dealerCards ?? lastResult?.dealerCards ?? []
  const displayHands = activeRound?.hands ?? lastResult?.hands ?? []
  const isDealerHidden = Boolean(activeRound)
  const statusMessage = activeRound?.phase === 'insurance'
    ? 'Dealer shows an Ace. Take insurance?'
    : activeRound?.phase === 'player'
      ? `Choose an action for hand ${activeRound.activeHand + 1}.`
      : lastResult
        ? `${OUTCOME_LABELS[lastResult.outcome]} · ${lastResult.profit >= 0 ? '+' : ''}${creditFormatter.format(lastResult.profit)} credits`
        : 'Set your bet to deal a hand.'

  useEffect(() => () => {
    dispatch(cancelBlackjackRound())
  }, [dispatch])

  function handleBetAmount(event: ChangeEvent<HTMLInputElement>) {
    setBetAmountInput(event.currentTarget.value)
  }

  function adjustBetAmount(multiplier: number) {
    if (betAmount === null) return
    setBetAmountInput(String(Number((betAmount * multiplier).toFixed(2))))
  }

  function handleBet() {
    if (betAmount === null) return
    dispatch(startBlackjackRound(crypto.randomUUID(), betAmount))
  }

  const canDouble = Boolean(activeRound && canDoubleBlackjack(activeRound) && activeRound.hands[activeRound.activeHand].wager <= balance)
  const canSplit = Boolean(activeRound && canSplitBlackjack(activeRound) && activeRound.originalWager <= balance)

  return (
    <main id="main-content" className="px-2 py-3 sm:px-5 sm:py-6 lg:py-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded bg-[#0f192a] shadow-xl shadow-black/25 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)]">
        <section className="relative flex min-h-[430px] flex-col overflow-hidden px-4 py-6 sm:min-h-[540px] sm:px-8 lg:col-start-2 lg:min-h-[640px]" aria-label="Blackjack table">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50 [background:radial-gradient(circle_at_50%_115%,#1d4d3a_0%,#0f2d2d_35%,#0f192a_70%)]" />
          <div className="relative z-10 flex flex-1 flex-col">
            {displayHands.length > 0 ? (
              <>
                <div className="text-center">
                  <div className="mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-[#b1bad3]">
                    <span>Dealer</span>
                    <span className="rounded-full bg-[#213743] px-2 py-0.5 tabular-nums text-white">
                      {isDealerHidden ? getHandValue(displayDealerCards.slice(0, 1)).total : getHandValue(displayDealerCards).total}
                    </span>
                  </div>
                  <div className="flex min-h-24 justify-center -space-x-5 sm:min-h-28 sm:-space-x-6">
                    {displayDealerCards.map((card, index) => (
                      <PlayingCard
                        key={`${card.rank}-${card.suit}-${index}`}
                        card={card}
                        isHidden={isDealerHidden && index === 1}
                        dealIndex={index * 2 + 1}
                      />
                    ))}
                  </div>
                </div>

                <div className="my-auto flex items-center gap-3 py-5 text-[#b1bad3]">
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]">
                    <Spade aria-hidden="true" className="size-4" fill="currentColor" /> Blackjack Pays 3:2
                  </span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                <div className={`grid items-start justify-center gap-5 ${displayHands.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {displayHands.map((hand, index) => (
                    <CardHand
                      key={index}
                      hand={hand}
                      handIndex={index}
                      isActive={Boolean(activeRound?.phase === 'player' && activeRound.activeHand === index)}
                      outcome={isHandResult(hand) ? hand.outcome : undefined}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="m-auto text-center">
                <div aria-hidden="true" className="mx-auto flex w-fit -space-x-8 opacity-40">
                  {['spades', 'hearts', 'diamonds', 'clubs'].map((suit, index) => (
                    <PlayingCard key={suit} card={{ rank: 'A', suit: suit as BlackjackCard['suit'] }} dealIndex={index} />
                  ))}
                </div>
                <p className="mt-6 text-sm font-semibold text-[#b1bad3]">Race the dealer to 21</p>
              </div>
            )}

            <p aria-live="polite" className="mt-5 min-h-6 text-center text-sm font-semibold text-white">
              {statusMessage}
            </p>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-[#7f8da3]">
              <LockKeyhole aria-hidden="true" className="size-3.5" /> Card order locked before the deal
            </p>
          </div>
        </section>

        <aside className="flex flex-col gap-5 bg-[#213743] p-3 sm:p-4 lg:col-start-1 lg:row-start-1 lg:min-h-[640px]">
          <div>
            <label htmlFor="blackjack-bet-amount" className="mb-1 block text-sm font-semibold text-[#b1bad3]">
              Bet Amount
            </label>
            <div className="flex overflow-hidden rounded border-2 border-[#2f4553] bg-[#0f212e] focus-within:border-[#557086]">
              <span aria-hidden="true" className="grid place-items-center pl-3 text-slate-500">$</span>
              <input
                id="blackjack-bet-amount"
                name="blackjackBetAmount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00…"
                value={betAmountInput}
                disabled={Boolean(activeRound)}
                onChange={handleBetAmount}
                aria-invalid={Boolean(betAmountError)}
                aria-describedby={betAmountError ? 'blackjack-bet-error' : undefined}
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
              />
              <button
                type="button"
                aria-label="Halve bet amount"
                disabled={Boolean(activeRound) || betAmount === null}
                onClick={() => adjustBetAmount(0.5)}
                className="bg-[#2f4553] px-4 font-bold text-white transition-colors hover:bg-[#3b5565] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#00e701] disabled:cursor-not-allowed disabled:opacity-50"
              >
                1/2
              </button>
              <button
                type="button"
                aria-label="Double bet amount"
                disabled={Boolean(activeRound) || betAmount === null}
                onClick={() => adjustBetAmount(2)}
                className="border-l-2 border-[#213743] bg-[#2f4553] px-4 text-sm font-bold text-white transition-colors hover:bg-[#3b5565] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#00e701] disabled:cursor-not-allowed disabled:opacity-50"
              >
                2×
              </button>
            </div>
            {betAmountError && !activeRound ? <p id="blackjack-bet-error" className="mt-1 text-xs text-red-400">{betAmountError}</p> : null}
          </div>

          {activeRound?.phase === 'insurance' ? (
            <div className="rounded bg-[#172b36] p-3">
              <p className="text-sm font-semibold text-white">Insurance</p>
              <p className="mt-1 text-xs leading-5 text-[#b1bad3]">Protect half your bet if the dealer has Blackjack.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={activeRound.originalWager / 2 > balance}
                  onClick={() => dispatch(chooseBlackjackInsurance(true))}
                  className="rounded bg-[#00e701] py-2.5 text-sm font-bold text-[#0f212e] transition-colors hover:bg-[#1fff20] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:bg-[#557086] disabled:text-[#b1bad3]"
                >
                  Insure {creditFormatter.format(activeRound.originalWager / 2)}
                </button>
                <button
                  type="button"
                  onClick={() => dispatch(chooseBlackjackInsurance(false))}
                  className="rounded bg-[#2f4553] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#3b5565] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]"
                >
                  No Insurance
                </button>
              </div>
            </div>
          ) : activeRound?.phase === 'player' ? (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => dispatch(hitBlackjack())} className="blackjack-action">Hit</button>
              <button type="button" onClick={() => dispatch(standBlackjack())} className="blackjack-action">Stand</button>
              <button type="button" disabled={!canSplit} onClick={() => dispatch(splitBlackjack())} className="blackjack-action">Split</button>
              <button type="button" disabled={!canDouble} onClick={() => dispatch(doubleBlackjack())} className="blackjack-action">Double</button>
            </div>
          ) : (
            <button
              type="button"
              disabled={betAmount === null || betAmount > balance}
              onClick={handleBet}
              className="rounded bg-[#00e701] py-3 font-bold text-[#0f212e] shadow-md shadow-black/20 transition-colors hover:bg-[#1fff20] active:bg-[#00c901] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:bg-[#557086] disabled:text-[#b1bad3]"
            >
              Bet
            </button>
          )}

          <div className="mt-auto border-t border-[#2f4553] pt-4 text-xs leading-5 text-[#b1bad3]">
            <p><strong className="text-white">Demo rules:</strong> Dealer stands on 17. Blackjack pays 3:2. Insurance pays 2:1.</p>
            <p className="mt-2">Virtual credits only. No deposits, withdrawals, or cash value.</p>
          </div>
        </aside>
      </div>

      <section className="mx-auto max-w-4xl px-2 py-10 text-[#b1bad3] sm:py-14" aria-labelledby="blackjack-demo-title">
        <h1 id="blackjack-demo-title" className="scroll-mt-20 text-balance text-3xl font-bold text-white sm:text-4xl">
          Play a Free Blackjack Demo
        </h1>
        <p className="mt-4 text-pretty leading-7">
          Practice classic Blackjack instantly with 10,000 virtual demo credits. Hit, stand, split pairs, double down, and use insurance while trying to beat the dealer to 21.
        </p>
        <p className="mt-3 text-pretty leading-7">
          This independent <span translate="no">Stake</span>-style Blackjack demo recreates the fast, compact game feel for entertainment and testing. It is not affiliated with <span translate="no">Stake</span>, and no credit can be deposited, withdrawn, or redeemed.
        </p>

        <h2 className="mt-8 text-balance text-xl font-bold text-white sm:text-2xl">How This Demo Works</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          <li className="rounded bg-[#213743] p-4"><strong className="block text-white">1. Set Your Bet</strong><span className="mt-1 block text-sm leading-6">Choose a positive virtual-credit wager.</span></li>
          <li className="rounded bg-[#213743] p-4"><strong className="block text-white">2. Play Your Hand</strong><span className="mt-1 block text-sm leading-6">Hit, stand, split, or double when available.</span></li>
          <li className="rounded bg-[#213743] p-4"><strong className="block text-white">3. Beat the Dealer</strong><span className="mt-1 block text-sm leading-6">Get closer to 21 without going over.</span></li>
        </ol>
      </section>
    </main>
  )
}
