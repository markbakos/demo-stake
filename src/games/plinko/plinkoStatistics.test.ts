import { describe, expect, it } from 'vitest'
import type { PlinkoResult } from '../../app/store'
import { calculatePlinkoStatistics } from './plinkoStatistics'

function result(id: string, wager: number, multiplier: number): PlinkoResult {
  const payout = wager * multiplier
  return {
    id,
    wager,
    multiplier,
    payout,
    profit: payout - wager,
    targetBin: 0,
    path: ['left'],
    settledAt: 0,
  }
}

describe('Plinko statistics', () => {
  it('derives totals and cumulative profit from settled results', () => {
    expect(calculatePlinkoStatistics([
      result('win', 10, 2),
      result('break-even', 5, 1),
      result('loss', 20, 0.5),
    ])).toEqual({
      bets: 3,
      losses: 1,
      profit: 0,
      profitHistory: [0, 10, 10, 0],
      wagered: 35,
      winRate: 2 / 3,
      wins: 2,
    })
  })
})
