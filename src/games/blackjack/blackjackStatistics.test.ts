import { describe, expect, it } from 'vitest'
import { calculateBlackjackStatistics } from './blackjackStatistics'

describe('Blackjack statistics', () => {
  it('counts rounds, pushes, split and insurance wagers, and cumulative profit', () => {
    expect(calculateBlackjackStatistics([
      { outcome: 'win', profit: 15, insuranceWager: 0, hands: [{ wager: 10 }] },
      { outcome: 'push', profit: 0, insuranceWager: 5, hands: [{ wager: 10 }, { wager: 10 }] },
      { outcome: 'loss', profit: -20, insuranceWager: 0, hands: [{ wager: 20 }] },
    ])).toEqual({
      bets: 3,
      losses: 1,
      profit: -5,
      profitHistory: [0, 15, 15, -5],
      wagered: 55,
      winRate: 1 / 3,
      wins: 1,
      pushes: 1,
    })
  })

  it('returns empty session statistics before the first round', () => {
    expect(calculateBlackjackStatistics([])).toEqual({
      bets: 0,
      losses: 0,
      profit: 0,
      profitHistory: [0],
      wagered: 0,
      winRate: 0,
      wins: 0,
      pushes: 0,
    })
  })
})
