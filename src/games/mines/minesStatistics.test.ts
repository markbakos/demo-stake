import { describe, expect, it } from 'vitest'
import { calculateMinesStatistics } from './minesStatistics'

describe('Mines statistics', () => {
  it('counts cleared and cashed-out rounds as wins and tracks cumulative profit', () => {
    expect(calculateMinesStatistics([
      { status: 'cashed-out', profit: 2, wager: 10 },
      { status: 'mine', profit: -5, wager: 5 },
      { status: 'cleared', profit: 3, wager: 2 },
    ])).toEqual({
      bets: 3,
      losses: 1,
      profit: 0,
      profitHistory: [0, 2, -3, 0],
      wagered: 17,
      winRate: 2 / 3,
      wins: 2,
    })
  })

  it('returns empty session statistics before the first round', () => {
    expect(calculateMinesStatistics([])).toEqual({
      bets: 0,
      losses: 0,
      profit: 0,
      profitHistory: [0],
      wagered: 0,
      winRate: 0,
      wins: 0,
    })
  })
})
