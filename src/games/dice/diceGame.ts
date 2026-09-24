export const DICE_MIN_TARGET = 1
export const DICE_MAX_TARGET = 99
export const DICE_DEFAULT_TARGET = 50.5
export const DICE_RTP = 0.99

export type DiceDirection = 'over' | 'under'

export type DiceRound = {
  id: string
  wager: number
  direction: DiceDirection
  target: number
  roll: number
  winChance: number
  multiplier: number
}

export type DiceResult = DiceRound & {
  won: boolean
  payout: number
  profit: number
  settledAt: number
}

export function isDiceTarget(value: number) {
  return Number.isFinite(value) && value >= DICE_MIN_TARGET && value <= DICE_MAX_TARGET
}

export function getDiceWinChance(direction: DiceDirection, target: number) {
  if (!isDiceTarget(target) || (direction !== 'over' && direction !== 'under')) return 0
  return direction === 'over' ? 100 - target : target
}

export function getDiceMultiplier(direction: DiceDirection, target: number) {
  const chance = getDiceWinChance(direction, target)
  return chance ? Number((DICE_RTP / (chance / 100)).toFixed(4)) : 0
}

export function createDiceRound(
  id: string,
  wager: number,
  direction: DiceDirection,
  target: number,
  random: () => number = Math.random,
): DiceRound {
  if (!id || !Number.isFinite(wager) || wager <= 0 || !isDiceTarget(target) ||
    (direction !== 'over' && direction !== 'under')) {
    throw new RangeError('A Dice round needs a valid id, wager, direction, and target.')
  }

  const sample = random()
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new RangeError('Random source must return a number in [0, 1).')
  }

  return {
    id,
    wager,
    direction,
    target,
    roll: sample * 100,
    winChance: getDiceWinChance(direction, target),
    multiplier: getDiceMultiplier(direction, target),
  }
}

export function isDiceWin(round: Pick<DiceRound, 'direction' | 'target' | 'roll'>) {
  return round.direction === 'over' ? round.roll > round.target : round.roll < round.target
}

export function settleDiceRound(round: DiceRound, settledAt = Date.now()): DiceResult {
  const won = isDiceWin(round)
  const payout = won ? Math.round(round.wager * round.multiplier * 100) / 100 : 0
  return {
    ...round,
    won,
    payout,
    profit: Math.round((payout - round.wager) * 100) / 100,
    settledAt,
  }
}
