import { describe, expect, it } from 'vitest'
import {
  cashOutMinesRound,
  createMinePositions,
  createMinesRound,
  getMinesMultiplier,
  revealMinesTile,
  settleMinesRound,
} from './minesGame'

describe('Mines game', () => {
  it('creates a unique predetermined layout', () => {
    const positions = createMinePositions(24, () => 0.5)
    expect(positions).toHaveLength(24)
    expect(new Set(positions).size).toBe(24)
    expect(positions.every((position) => position >= 0 && position < 25)).toBe(true)
  })

  it('matches the 99% Stake-style multiplier curve', () => {
    expect(getMinesMultiplier(3, 0)).toBe(1)
    expect(getMinesMultiplier(3, 1)).toBe(1.13)
    expect(getMinesMultiplier(3, 3)).toBe(1.48)
    expect(getMinesMultiplier(3, 22)).toBe(2277)
    expect(getMinesMultiplier(24, 1)).toBe(24.75)
  })

  it('reveals each tile once and settles a mine loss', () => {
    const round = createMinesRound('loss', 100, 3, [0, 1, 2])
    const safe = revealMinesTile(round, 3)
    expect(revealMinesTile(safe, 3)).toBe(safe)

    const result = settleMinesRound(revealMinesTile(safe, 1), 1)
    expect(result).toMatchObject({ status: 'mine', multiplier: 0, payout: 0, profit: -100 })
  })

  it('cash outs and automatically clears the last safe tile', () => {
    const round = createMinesRound('cashout', 100, 3, [0, 1, 2])
    const cashedOut = cashOutMinesRound(revealMinesTile(round, 3))
    expect(settleMinesRound(cashedOut, 1)).toMatchObject({ status: 'cashed-out', multiplier: 1.13, payout: 113 })

    const cleared = revealMinesTile(createMinesRound(
      'cleared',
      10,
      24,
      Array.from({ length: 24 }, (_, index) => index),
    ), 24)
    expect(settleMinesRound(cleared, 1)).toMatchObject({ status: 'cleared', multiplier: 24.75, payout: 247.5 })
  })
})
