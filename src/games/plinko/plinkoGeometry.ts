export const BOARD_WIDTH = 760
export const BOARD_HEIGHT = 570

export type Point = Readonly<{ x: number; y: number }>

export type PlinkoGeometry = Readonly<{
  pegs: readonly Point[]
  rows: readonly (readonly Point[])[]
  binCenters: readonly number[]
  pegRadius: number
  horizontalGap: number
  topY: number
  bottomY: number
}>

export function createPlinkoGeometry(rowCount: number): PlinkoGeometry {
  if (!Number.isInteger(rowCount) || rowCount < 8 || rowCount > 16) {
    throw new RangeError('Rows must be an integer from 8 through 16.')
  }

  const horizontalGap = 640 / (rowCount + 1)
  const topY = 72
  const bottomY = 510
  const verticalGap = (bottomY - topY) / (rowCount - 1)
  const pegRadius = Math.max(3.8, 6.6 - (rowCount - 8) * 0.34)
  const rows = Array.from({ length: rowCount }, (_, rowIndex) => {
    const pegCount = rowIndex + 3
    const rowWidth = (pegCount - 1) * horizontalGap
    return Array.from({ length: pegCount }, (_, pegIndex) => ({
      x: (BOARD_WIDTH - rowWidth) / 2 + pegIndex * horizontalGap,
      y: topY + rowIndex * verticalGap,
    }))
  })
  const lastRow = rows.at(-1)!
  const binCenters = lastRow.slice(0, -1).map((peg, index) => (peg.x + lastRow[index + 1].x) / 2)

  return {
    pegs: rows.flat(),
    rows,
    binCenters,
    pegRadius,
    horizontalGap,
    topY,
    bottomY,
  }
}
