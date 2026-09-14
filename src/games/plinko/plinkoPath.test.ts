import { describe, expect, it } from 'vitest'
import { createPathForTarget, createRandomPath, getTargetBin } from './plinkoPath'

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

  it('rejects invalid targets', () => {
    expect(() => createPathForTarget(8, -1)).toThrow(RangeError)
    expect(() => createPathForTarget(8, 9)).toThrow(RangeError)
  })
})
