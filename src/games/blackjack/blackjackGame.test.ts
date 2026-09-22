import { describe, expect, it } from 'vitest'
import {
  answerInsurance,
  createBlackjackRound,
  doubleBlackjackHand,
  getHandValue,
  hitBlackjackHand,
  settleBlackjackRound,
  splitBlackjackHand,
  standBlackjackHand,
  type BlackjackCard,
} from './blackjackGame'

const card = (rank: BlackjackCard['rank'], suit: BlackjackCard['suit'] = 'spades'): BlackjackCard => ({ rank, suit })

describe('Blackjack game', () => {
  it('scores aces as 1 or 11 without busting', () => {
    expect(getHandValue([card('A'), card('6')])).toEqual({ total: 17, isSoft: true })
    expect(getHandValue([card('A'), card('6'), card('10')])).toEqual({ total: 17, isSoft: false })
    expect(getHandValue([card('A'), card('A'), card('9')])).toEqual({ total: 21, isSoft: true })
  })

  it('locks the sequence and settles natural blackjack at 3:2', () => {
    const round = createBlackjackRound('natural', 100, [card('A'), card('9'), card('K'), card('8')])
    const result = settleBlackjackRound(round, 1)

    expect(round.phase).toBe('settled')
    expect(result).toMatchObject({ payout: 250, profit: 150, outcome: 'win' })
  })

  it('uses the next predetermined cards for hit and dealer play', () => {
    const round = createBlackjackRound('stand', 100, [
      card('10'), card('6'), card('7'), card('9'), card('2'), card('K'),
    ])
    const hit = hitBlackjackHand(round)
    const settled = standBlackjackHand(hit)
    const result = settleBlackjackRound(settled, 1)

    expect(hit.hands[0].cards.map(({ rank }) => rank)).toEqual(['10', '7', '2'])
    expect(result.dealerCards.map(({ rank }) => rank)).toEqual(['6', '9', 'K'])
    expect(result).toMatchObject({ payout: 200, profit: 100, outcome: 'win' })
  })

  it('supports double, split, and insurance settlement', () => {
    const doubled = doubleBlackjackHand(createBlackjackRound('double', 50, [
      card('5'), card('6'), card('6'), card('10'), card('10'), card('2'),
    ]))
    expect(settleBlackjackRound(doubled, 1)).toMatchObject({ payout: 200, profit: 100 })

    const split = splitBlackjackHand(createBlackjackRound('split', 50, [
      card('8'), card('6'), card('8'), card('10'), card('A'), card('9'), card('2'),
    ]))
    const splitResult = settleBlackjackRound(standBlackjackHand(standBlackjackHand(split)), 1)
    expect(splitResult.hands.map(({ outcome }) => outcome)).toEqual(['win', 'loss'])
    expect(splitResult).toMatchObject({ payout: 100, profit: 0, outcome: 'push' })

    const insured = answerInsurance(createBlackjackRound('insurance', 100, [
      card('10'), card('A'), card('8'), card('K'),
    ]), true)
    expect(settleBlackjackRound(insured, 1)).toMatchObject({ insurancePayout: 150, payout: 150, profit: 0 })
  })
})
