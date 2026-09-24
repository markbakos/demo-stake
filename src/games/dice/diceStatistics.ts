import type { SessionStatistics } from '../../shared/sessionStatistics'
import type { DiceResult } from './diceGame'

export function createEmptyDiceStatistics(): SessionStatistics {
  return { bets: 0, losses: 0, profit: 0, profitHistory: [0], wagered: 0, winRate: 0, wins: 0 }
}

export function addDiceResultToStatistics(
  statistics: SessionStatistics,
  result: Pick<DiceResult, 'wager' | 'won' | 'profit'>,
): SessionStatistics {
  const bets = statistics.bets + 1
  const wins = statistics.wins + Number(result.won)
  const profit = statistics.profit + result.profit
  return {
    bets,
    losses: statistics.losses + Number(!result.won),
    profit,
    profitHistory: [...statistics.profitHistory, profit].slice(-51),
    wagered: statistics.wagered + result.wager,
    winRate: wins / bets,
    wins,
  }
}

export function calculateDiceStatistics(results: readonly Pick<DiceResult, 'wager' | 'won' | 'profit'>[]): SessionStatistics {
  return results.reduce(addDiceResultToStatistics, createEmptyDiceStatistics())
}
