import { describe, expect, it } from 'vitest'
import { addMinesResultToStatistics, createEmptyMinesStatistics } from './minesStatistics'

describe('Mines statistics', () => {
  it('accumulates each settled outcome without losing totals', () => {
    const first = addMinesResultToStatistics(createEmptyMinesStatistics(), {
      status: 'cashed-out', profit: 2, wager: 10,
    })
    const second = addMinesResultToStatistics(first, { status: 'mine', profit: -5, wager: 5 })
    const statistics = addMinesResultToStatistics(second, { status: 'cleared', profit: 3, wager: 2 })

    expect(statistics).toEqual({
      bets: 3, losses: 1, profit: 0, profitHistory: [0, 2, -3, 0],
      wagered: 17, winRate: 2 / 3, wins: 2,
    })
  })

  it('keeps chart history bounded while preserving cumulative totals', () => {
    let statistics = createEmptyMinesStatistics()
    for (let round = 1; round <= 60; round += 1) {
      statistics = addMinesResultToStatistics(statistics, { status: 'mine', profit: -round, wager: round })
    }

    expect(statistics).toMatchObject({ bets: 60, losses: 60, profit: -1830, wagered: 1830, wins: 0, winRate: 0 })
    expect(statistics.profitHistory).toHaveLength(51)
    expect(statistics.profitHistory[0]).toBe(-55)
    expect(statistics.profitHistory.at(-1)).toBe(-1830)
  })
})
