export const MINES_TILE_COUNT = 25

export type MinesStatus = 'playing' | 'mine' | 'cashed-out' | 'cleared'

export type MinesRound = {
  id: string
  wager: number
  mineCount: number
  minePositions: number[]
  revealedTiles: number[]
  status: MinesStatus
}

export type MinesResult = MinesRound & {
  multiplier: number
  payout: number
  profit: number
  settledAt: number
}

function isTileIndex(value: number) {
  return Number.isInteger(value) && value >= 0 && value < MINES_TILE_COUNT
}

export function createMinePositions(mineCount: number, random: () => number = Math.random) {
  if (!Number.isInteger(mineCount) || mineCount < 1 || mineCount >= MINES_TILE_COUNT) {
    throw new RangeError('Mine count must be an integer from 1 through 24.')
  }

  const positions = Array.from({ length: MINES_TILE_COUNT }, (_, index) => index)
  for (let index = positions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[positions[index], positions[swapIndex]] = [positions[swapIndex], positions[index]]
  }
  return positions.slice(0, mineCount).sort((a, b) => a - b)
}

export function createMinesRound(
  id: string,
  wager: number,
  mineCount: number,
  minePositions = createMinePositions(mineCount),
): MinesRound {
  const uniqueMines = new Set(minePositions)
  if (
    !id ||
    !Number.isFinite(wager) ||
    wager <= 0 ||
    !Number.isInteger(mineCount) ||
    mineCount < 1 ||
    mineCount >= MINES_TILE_COUNT ||
    uniqueMines.size !== mineCount ||
    !minePositions.every(isTileIndex)
  ) {
    throw new RangeError('A Mines round needs a valid id, wager, mine count, and mine layout.')
  }

  return {
    id,
    wager,
    mineCount,
    minePositions: [...minePositions].sort((a, b) => a - b),
    revealedTiles: [],
    status: 'playing',
  }
}

function combinations(total: number, selected: number) {
  const smaller = Math.min(selected, total - selected)
  let result = 1
  for (let index = 1; index <= smaller; index += 1) {
    result = result * (total - smaller + index) / index
  }
  return result
}

export function getMinesMultiplier(mineCount: number, safeReveals: number) {
  if (
    !Number.isInteger(mineCount) || mineCount < 1 || mineCount >= MINES_TILE_COUNT ||
    !Number.isInteger(safeReveals) || safeReveals < 0 || safeReveals > MINES_TILE_COUNT - mineCount
  ) return 0
  if (safeReveals === 0) return 1

  const fairMultiplier = combinations(MINES_TILE_COUNT, safeReveals) /
    combinations(MINES_TILE_COUNT - mineCount, safeReveals)
  return Math.round(fairMultiplier * 99) / 100
}

export function getSafeRevealCount(round: MinesRound) {
  return round.revealedTiles.filter((tile) => !round.minePositions.includes(tile)).length
}

export function revealMinesTile(round: MinesRound, tile: number): MinesRound {
  if (round.status !== 'playing' || !isTileIndex(tile) || round.revealedTiles.includes(tile)) return round

  const revealedTiles = [...round.revealedTiles, tile]
  if (round.minePositions.includes(tile)) return { ...round, revealedTiles, status: 'mine' }

  const safeReveals = revealedTiles.length
  const status = safeReveals === MINES_TILE_COUNT - round.mineCount ? 'cleared' : 'playing'
  return { ...round, revealedTiles, status }
}

export function cashOutMinesRound(round: MinesRound): MinesRound {
  if (round.status !== 'playing' || getSafeRevealCount(round) === 0) return round
  return { ...round, status: 'cashed-out' }
}

export function settleMinesRound(round: MinesRound, settledAt = Date.now()): MinesResult {
  if (round.status === 'playing') throw new Error('Cannot settle an unfinished Mines round.')
  const multiplier = round.status === 'mine' ? 0 : getMinesMultiplier(round.mineCount, getSafeRevealCount(round))
  const payout = Math.round(round.wager * multiplier * 100) / 100
  return {
    ...round,
    minePositions: [...round.minePositions],
    revealedTiles: [...round.revealedTiles],
    multiplier,
    payout,
    profit: Math.round((payout - round.wager) * 100) / 100,
    settledAt,
  }
}
