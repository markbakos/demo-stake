import { describe, expect, it } from 'vitest'
import { BOARD_WIDTH, createPlinkoGeometry } from './plinkoGeometry'

describe('createPlinkoGeometry', () => {
  it('builds every supported triangular board and its bins', () => {
    for (let rowCount = 8; rowCount <= 16; rowCount += 1) {
      const geometry = createPlinkoGeometry(rowCount)

      expect(geometry.rows).toHaveLength(rowCount)
      expect(geometry.binCenters).toHaveLength(rowCount + 1)
      geometry.rows.forEach((row, index) => {
        expect(row).toHaveLength(index + 3)
        expect(row.every((peg) => peg.x > 0 && peg.x < BOARD_WIDTH)).toBe(true)
      })
      expect(geometry.binCenters).toEqual([...geometry.binCenters].sort((a, b) => a - b))
    }
  })

  it('rejects unsupported row counts', () => {
    expect(() => createPlinkoGeometry(7)).toThrow(RangeError)
    expect(() => createPlinkoGeometry(16.5)).toThrow(RangeError)
  })
})
