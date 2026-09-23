import type { MinesResult } from './minesGame'
import type { SessionStatistics } from '../../shared/sessionStatistics'

type MinesStatisticsResult = Pick<MinesResult, 'profit' | 'status' | 'wager'>

export function calculateMinesStatistics(results: readonly MinesStatisticsResult[]): SessionStatistics {
  let profit = 0
  let wagered = 0
  let wins = 0
  const profitHistory = [0]

  for (const result of results) {
    profit += result.profit
    wagered += result.wager
    if (result.status === 'cashed-out' || result.status === 'cleared') wins += 1
    profitHistory.push(profit)
  }

  return {
    bets: results.length,
    losses: results.length - wins,
    profit,
    profitHistory,
    wagered,
    winRate: results.length === 0 ? 0 : wins / results.length,
    wins,
  }
}
