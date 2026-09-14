import { Engine } from 'matter-js'
import { describe, expect, it } from 'vitest'
import type { RowCount } from './plinkoConfig'
import { BOARD_HEIGHT } from './plinkoGeometry'
import { createPathForTarget } from './plinkoPath'
import { createPlinkoPhysics, type Landing } from './plinkoPhysics'

function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function simulate(rows: RowCount, targets: readonly number[], seed: number) {
  const landings: Landing[] = []
  const board = createPlinkoPhysics(rows, (landing) => landings.push(landing))
  const random = seededRandom(seed)
  targets.forEach((targetBin, index) => {
    expect(board.dropBall({
      roundId: `${seed}-${index}`,
      targetBin,
      path: createPathForTarget(rows, targetBin, random),
    })).toBe(true)
  })

  for (let step = 0; step < 900 && landings.length < targets.length; step += 1) {
    Engine.update(board.engine, 1000 / 60)
  }
  board.destroy()
  return landings
}

describe('targeted Plinko physics', () => {
  it('reports an unfinished round when the engine is destroyed', () => {
    const landings: Landing[] = []
    const board = createPlinkoPhysics(8, (landing) => landings.push(landing))
    board.dropBall({ roundId: 'unmounted', targetBin: 0, path: createPathForTarget(8, 0) })

    board.destroy()

    expect(landings).toMatchObject([{ roundId: 'unmounted', isConfirmed: false }])
  })

  it('physically lands in every requested bin for every row count', () => {
    for (let rows = 8; rows <= 16; rows += 1) {
      const targets = Array.from({ length: rows + 1 }, (_, target) => target)
      const landings = simulate(rows as RowCount, targets, rows)
      expect(landings, `rows=${rows}`).toHaveLength(targets.length)
      expect(landings.every((landing) => landing.isConfirmed && landing.observedBin === landing.requestedBin), JSON.stringify(landings)).toBe(true)
      expect(landings.every((landing) => landing.position.y <= BOARD_HEIGHT), JSON.stringify(landings)).toBe(true)
    }
  })

  it('completes 10,000 seeded randomized physical drops without a mismatch', { timeout: 120_000 }, () => {
    const totalDrops = 10_000
    const batchSize = 64
    let completedDrops = 0

    for (let rows = 8; rows <= 16; rows += 1) {
      const rowDropCount = Math.floor(totalDrops / 9) + Number(rows - 8 < totalDrops % 9)
      const seed = 10_000 + rows
      const random = seededRandom(seed)
      const landings: Landing[] = []
      const board = createPlinkoPhysics(rows as RowCount, (landing) => landings.push(landing))

      for (let offset = 0; offset < rowDropCount; offset += batchSize) {
        const count = Math.min(batchSize, rowDropCount - offset)
        const expectedLandingCount = landings.length + count
        for (let index = 0; index < count; index += 1) {
          const targetBin = Math.floor(random() * (rows + 1))
          const path = createPathForTarget(rows, targetBin, random)
          board.dropBall({ roundId: `${seed}-${offset + index}`, targetBin, path })
        }
        for (let step = 0; step < 900 && landings.length < expectedLandingCount; step += 1) {
          Engine.update(board.engine, 1000 / 60)
        }
      }

      const failures = landings.filter((landing) => (
        !landing.isConfirmed ||
        landing.observedBin !== landing.requestedBin ||
        landing.position.y > BOARD_HEIGHT
      ))
      board.destroy()
      expect(landings.length, `seed=${seed} rows=${rows}`).toBe(rowDropCount)
      expect(failures, `seed=${seed} rows=${rows} failures=${JSON.stringify(failures.slice(0, 5))}`).toHaveLength(0)
      completedDrops += landings.length
    }

    expect(completedDrops).toBe(totalDrops)
  })
})
