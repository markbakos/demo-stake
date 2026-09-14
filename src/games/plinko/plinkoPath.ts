export type PlinkoDirection = 'left' | 'right'
export type Luck = 'normal' | 'favored' | 'kind'

export type RandomSource = () => number

export function createRandomPath(rows: number, random: RandomSource = Math.random): PlinkoDirection[] {
  return Array.from({ length: rows }, () => random() < 0.5 ? 'left' : 'right')
}

const luckBoostChance: Record<Luck, number> = {
  normal: 0,
  favored: 0.08,
  kind: 0.16,
}

export function createOutcomePath(rows: number, luck: Luck, random: RandomSource = Math.random) {
  const path = createRandomPath(rows, random)
  const boostChance = luckBoostChance[luck]
  if (boostChance === 0 || random() >= boostChance) return path

  const targetBin = getTargetBin(path)
  const outwardDirection = targetBin === rows / 2
    ? (random() < 0.5 ? 'left' : 'right')
    : (targetBin < rows / 2 ? 'left' : 'right')
  const replaceDirection = outwardDirection === 'left' ? 'right' : 'left'
  const candidates = path.flatMap((direction, index) => direction === replaceDirection ? [index] : [])
  if (candidates.length === 0) return path

  path[candidates[Math.floor(random() * candidates.length)]] = outwardDirection
  return path
}

export function createPathForTarget(rows: number, targetBin: number, random: RandomSource = Math.random): PlinkoDirection[] {
  if (!Number.isInteger(rows) || rows < 1 || !Number.isInteger(targetBin) || targetBin < 0 || targetBin > rows) {
    throw new RangeError('Target bin must be an integer from 0 through the row count.')
  }

  const path: PlinkoDirection[] = [
    ...Array.from({ length: targetBin }, () => 'right' as const),
    ...Array.from({ length: rows - targetBin }, () => 'left' as const),
  ]

  for (let index = path.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[path[index], path[swapIndex]] = [path[swapIndex], path[index]]
  }

  return path
}

export function getTargetBin(path: readonly PlinkoDirection[]) {
  return path.reduce((total, direction) => total + Number(direction === 'right'), 0)
}
