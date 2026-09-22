export const BLACKJACK_SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const
export const BLACKJACK_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const

export type BlackjackSuit = (typeof BLACKJACK_SUITS)[number]
export type BlackjackRank = (typeof BLACKJACK_RANKS)[number]
export type BlackjackCard = { rank: BlackjackRank; suit: BlackjackSuit }
export type BlackjackHandStatus = 'playing' | 'stood' | 'bust'
export type BlackjackOutcome = 'win' | 'loss' | 'push'

export type BlackjackHand = {
  cards: BlackjackCard[]
  wager: number
  status: BlackjackHandStatus
}

export type BlackjackRound = {
  id: string
  originalWager: number
  dealerCards: BlackjackCard[]
  hands: BlackjackHand[]
  activeHand: number
  shoe: BlackjackCard[]
  phase: 'insurance' | 'player' | 'settled'
  insuranceWager: number
  wasSplit: boolean
}

export type BlackjackHandResult = BlackjackHand & {
  outcome: BlackjackOutcome
  payout: number
  isBlackjack: boolean
}

export type BlackjackResult = {
  id: string
  dealerCards: BlackjackCard[]
  dealerTotal: number
  hands: BlackjackHandResult[]
  insuranceWager: number
  insurancePayout: number
  payout: number
  profit: number
  outcome: BlackjackOutcome
  settledAt: number
}

export function createBlackjackShoe(random: () => number = Math.random): BlackjackCard[] {
  const cards: BlackjackCard[] = []
  for (let deck = 0; deck < 8; deck += 1) {
    for (const suit of BLACKJACK_SUITS) {
      for (const rank of BLACKJACK_RANKS) cards.push({ rank, suit })
    }
  }

  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]]
  }
  return cards
}

export function getCardValue(card: BlackjackCard) {
  if (card.rank === 'A') return 11
  if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 10
  return Number(card.rank)
}

export function getHandValue(cards: readonly BlackjackCard[]) {
  let total = 0
  let aces = 0
  for (const card of cards) {
    total += getCardValue(card)
    if (card.rank === 'A') aces += 1
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces -= 1
  }
  return { total, isSoft: aces > 0 }
}

export function isNaturalBlackjack(cards: readonly BlackjackCard[]) {
  return cards.length === 2 && getHandValue(cards).total === 21
}

function takeCard(shoe: BlackjackCard[]) {
  const [card, ...remaining] = shoe
  if (!card) throw new RangeError('The predetermined card sequence is exhausted.')
  return { card, remaining }
}

function settleInitialRound(round: BlackjackRound): BlackjackRound {
  const dealerBlackjack = isNaturalBlackjack(round.dealerCards)
  const playerBlackjack = isNaturalBlackjack(round.hands[0].cards)
  if (dealerBlackjack || playerBlackjack) return { ...round, phase: 'settled' }
  return { ...round, phase: 'player' }
}

export function createBlackjackRound(id: string, wager: number, sequence = createBlackjackShoe()): BlackjackRound {
  if (!id || !Number.isFinite(wager) || wager <= 0 || sequence.length < 4) {
    throw new RangeError('A round needs an id, a positive wager, and at least 4 cards.')
  }

  const cards = sequence.map((card) => ({ ...card }))
  const playerCards = [cards[0], cards[2]]
  const dealerCards = [cards[1], cards[3]]
  const round: BlackjackRound = {
    id,
    originalWager: wager,
    dealerCards,
    hands: [{ cards: playerCards, wager, status: 'playing' }],
    activeHand: 0,
    shoe: cards.slice(4),
    phase: dealerCards[0].rank === 'A' ? 'insurance' : 'player',
    insuranceWager: 0,
    wasSplit: false,
  }
  return round.phase === 'insurance' ? round : settleInitialRound(round)
}

function finishPlayers(round: BlackjackRound): BlackjackRound {
  const nextHand = round.hands.findIndex((hand, index) => index > round.activeHand && hand.status === 'playing')
  if (nextHand >= 0) return { ...round, activeHand: nextHand }

  if (round.hands.every((hand) => hand.status === 'bust')) return { ...round, phase: 'settled' }

  let shoe = round.shoe
  const dealerCards = [...round.dealerCards]
  while (getHandValue(dealerCards).total < 17) {
    const drawn = takeCard(shoe)
    dealerCards.push(drawn.card)
    shoe = drawn.remaining
  }
  return { ...round, dealerCards, shoe, phase: 'settled' }
}

export function answerInsurance(round: BlackjackRound, takeInsurance: boolean): BlackjackRound {
  if (round.phase !== 'insurance') return round
  const answered = {
    ...round,
    insuranceWager: takeInsurance ? round.originalWager / 2 : 0,
  }
  return settleInitialRound(answered)
}

export function hitBlackjackHand(round: BlackjackRound): BlackjackRound {
  if (round.phase !== 'player') return round
  const drawn = takeCard(round.shoe)
  const hands = round.hands.map((hand, index) => {
    if (index !== round.activeHand) return hand
    const cards = [...hand.cards, drawn.card]
    const total = getHandValue(cards).total
    return { ...hand, cards, status: total > 21 ? 'bust' as const : total === 21 ? 'stood' as const : hand.status }
  })
  const updated = { ...round, hands, shoe: drawn.remaining }
  return hands[round.activeHand].status === 'playing' ? updated : finishPlayers(updated)
}

export function standBlackjackHand(round: BlackjackRound): BlackjackRound {
  if (round.phase !== 'player') return round
  const hands = round.hands.map((hand, index) => index === round.activeHand ? { ...hand, status: 'stood' as const } : hand)
  return finishPlayers({ ...round, hands })
}

export function canDoubleBlackjack(round: BlackjackRound) {
  return round.phase === 'player' && round.hands[round.activeHand]?.cards.length === 2
}

export function doubleBlackjackHand(round: BlackjackRound): BlackjackRound {
  if (!canDoubleBlackjack(round)) return round
  const drawn = takeCard(round.shoe)
  const hands = round.hands.map((hand, index) => {
    if (index !== round.activeHand) return hand
    const cards = [...hand.cards, drawn.card]
    return { ...hand, cards, wager: hand.wager * 2, status: getHandValue(cards).total > 21 ? 'bust' as const : 'stood' as const }
  })
  return finishPlayers({ ...round, hands, shoe: drawn.remaining })
}

export function canSplitBlackjack(round: BlackjackRound) {
  const hand = round.hands[round.activeHand]
  return round.phase === 'player' && !round.wasSplit && hand?.cards.length === 2 &&
    getCardValue(hand.cards[0]) === getCardValue(hand.cards[1])
}

export function splitBlackjackHand(round: BlackjackRound): BlackjackRound {
  if (!canSplitBlackjack(round)) return round
  const [first, second] = round.hands[round.activeHand].cards
  const firstDraw = takeCard(round.shoe)
  const secondDraw = takeCard(firstDraw.remaining)
  const isSplitAces = first.rank === 'A'
  const status = isSplitAces ? 'stood' as const : 'playing' as const
  const hands: BlackjackHand[] = [
    { cards: [first, firstDraw.card], wager: round.originalWager, status },
    { cards: [second, secondDraw.card], wager: round.originalWager, status },
  ]
  const updated = { ...round, hands, activeHand: 0, shoe: secondDraw.remaining, wasSplit: true }
  return isSplitAces ? finishPlayers(updated) : updated
}

export function settleBlackjackRound(round: BlackjackRound, settledAt = Date.now()): BlackjackResult {
  if (round.phase !== 'settled') throw new Error('Cannot settle an unfinished Blackjack round.')
  const dealerTotal = getHandValue(round.dealerCards).total
  const dealerBlackjack = isNaturalBlackjack(round.dealerCards)
  const hands = round.hands.map<BlackjackHandResult>((hand) => {
    const total = getHandValue(hand.cards).total
    const isBlackjack = !round.wasSplit && isNaturalBlackjack(hand.cards)
    let outcome: BlackjackOutcome = 'loss'
    let payout = 0

    if (total <= 21) {
      if (dealerBlackjack) {
        if (isBlackjack) {
          outcome = 'push'
          payout = hand.wager
        }
      } else if (isBlackjack) {
        outcome = 'win'
        payout = hand.wager * 2.5
      } else if (dealerTotal > 21 || total > dealerTotal) {
        outcome = 'win'
        payout = hand.wager * 2
      } else if (total === dealerTotal) {
        outcome = 'push'
        payout = hand.wager
      }
    }

    return { ...hand, outcome, payout, isBlackjack }
  })
  const insurancePayout = dealerBlackjack ? round.insuranceWager * 3 : 0
  const payout = hands.reduce((sum, hand) => sum + hand.payout, insurancePayout)
  const totalWager = hands.reduce((sum, hand) => sum + hand.wager, round.insuranceWager)
  const profit = payout - totalWager
  return {
    id: round.id,
    dealerCards: round.dealerCards.map((card) => ({ ...card })),
    dealerTotal,
    hands: hands.map((hand) => ({ ...hand, cards: hand.cards.map((card) => ({ ...card })) })),
    insuranceWager: round.insuranceWager,
    insurancePayout,
    payout,
    profit,
    outcome: profit > 0 ? 'win' : profit < 0 ? 'loss' : 'push',
    settledAt,
  }
}
