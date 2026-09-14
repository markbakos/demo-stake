import { describe, expect, it } from 'vitest'
import { binPayouts } from './plinkoConfig'
import { createOutcomePath, createPathForTarget, createRandomPath, getTargetBin } from './plinkoPath'

function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

describe('Plinko paths', () => {
  it('creates a valid varied path for every supported target', () => {
    for (let rows = 8; rows <= 16; rows += 1) {
      for (let targetBin = 0; targetBin <= rows; targetBin += 1) {
        const path = createPathForTarget(rows, targetBin, seededRandom(rows * 100 + targetBin))
        expect(path).toHaveLength(rows)
        expect(getTargetBin(path)).toBe(targetBin)
      }
    }
  })

  it('derives normal outcomes from fair row decisions', () => {
    const path = createRandomPath(16, seededRandom(42))
    expect(path).toHaveLength(16)
    expect(getTargetBin(path)).toBe(path.filter((direction) => direction === 'right').length)
  })

  it('keeps normal play as one independent fair decision per row', () => {
    const counts = Array.from({ length: 9 }, () => 0)
    for (let outcome = 0; outcome < 2 ** 8; outcome += 1) {
      const values = Array.from({ length: 8 }, (_, bit) => outcome & (1 << bit) ? 0.75 : 0.25)
      counts[getTargetBin(createOutcomePath(8, 'normal', () => values.shift() ?? 1))] += 1
    }

    expect(counts).toEqual([1, 8, 28, 56, 70, 56, 28, 8, 1])
  })

  it('nudges boosted outcomes exactly one bin away from the center', () => {
    const values = [0.75, 0.75, 0.25, 0.25, 0, 0]
    const path = createOutcomePath(4, 'favored', () => values.shift() ?? 0)

    expect(getTargetBin(path)).toBe(1)
  })

  it('never lowers a multiplier when luck moves a result outward', () => {
    for (const risks of Object.values(binPayouts)) {
      for (const payouts of Object.values(risks)) {
        const center = (payouts.length - 1) / 2
        payouts.forEach((payout, bin) => {
          if (bin < center) expect(payouts[bin - 1] ?? payout).toBeGreaterThanOrEqual(payout)
          if (bin > center) expect(payouts[bin + 1] ?? payout).toBeGreaterThanOrEqual(payout)
        })
      }
    }
  })

  it('rejects invalid targets', () => {
    expect(() => createPathForTarget(8, -1)).toThrow(RangeError)
    expect(() => createPathForTarget(8, 9)).toThrow(RangeError)
  })
})
