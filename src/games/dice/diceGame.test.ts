import { describe, expect, it } from 'vitest'
import { createDiceRound, getDiceMultiplier, getDiceWinChance, isDiceTarget, isDiceWin, settleDiceRound } from './diceGame'
import { calculateDiceStatistics } from './diceStatistics'

describe('Dice odds and rounds', () => {
  it('derives the Stake-style odds from the threshold and direction', () => {
    expect(getDiceWinChance('over', 50.5)).toBe(49.5)
    expect(getDiceMultiplier('over', 50.5)).toBe(2)
    expect(getDiceWinChance('under', 35)).toBe(35)
    expect(getDiceMultiplier('under', 35)).toBe(2.8286)
    expect(getDiceMultiplier('under', 1)).toBe(99)
    expect(isDiceTarget(1)).toBe(true)
    expect(isDiceTarget(99)).toBe(true)
    expect(isDiceTarget(0.99)).toBe(false)
    expect(isDiceTarget(99.01)).toBe(false)
  })

  it('snapshots a random roll and treats an exact threshold as a loss', () => {
    const overTie = createDiceRound('over-tie', 10, 'over', 50.5, () => 0.505)
    const underTie = createDiceRound('under-tie', 10, 'under', 50.5, () => 0.505)

    expect(overTie.roll).toBe(50.5)
    expect(isDiceWin(overTie)).toBe(false)
    expect(isDiceWin(underTie)).toBe(false)
    expect(settleDiceRound(overTie, 123)).toMatchObject({ won: false, payout: 0, profit: -10, settledAt: 123 })
  })

  it('pays rounded demo credits for a win in either direction', () => {
    const over = createDiceRound('over', 10, 'over', 50.5, () => 0.8)
    const under = createDiceRound('under', 10, 'under', 35, () => 0.2)

    expect(settleDiceRound(over, 1)).toMatchObject({ won: true, payout: 20, profit: 10 })
    expect(settleDiceRound(under, 1)).toMatchObject({ won: true, payout: 28.29, profit: 18.29 })
  })

  it('rejects invalid rounds and random sources', () => {
    expect(() => createDiceRound('', 1, 'over', 50.5)).toThrow(RangeError)
    expect(() => createDiceRound('bad-wager', 0, 'over', 50.5)).toThrow(RangeError)
    expect(() => createDiceRound('bad-target', 1, 'under', 100)).toThrow(RangeError)
    expect(() => createDiceRound('bad-random', 1, 'under', 50, () => 1)).toThrow(RangeError)
  })
})

describe('Dice statistics', () => {
  it('calculates wins, losses, wagering, and a bounded profit history', () => {
    const results = Array.from({ length: 60 }, (_, index) => ({
      wager: 2,
      won: index % 2 === 0,
      profit: index % 2 === 0 ? 1 : -2,
    }))
    const statistics = calculateDiceStatistics(results)

    expect(statistics).toMatchObject({ bets: 60, wins: 30, losses: 30, wagered: 120, profit: -30, winRate: 0.5 })
    expect(statistics.profitHistory).toHaveLength(51)
    expect(statistics.profitHistory.at(-1)).toBe(-30)
  })
})
