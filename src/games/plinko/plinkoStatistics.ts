import type { PlinkoResult } from '../../app/store'

export function calculatePlinkoStatistics(results: readonly PlinkoResult[]) {
  let profit = 0
  let wagered = 0
  let wins = 0
  const profitHistory = [0]

  for (const result of results) {
    profit += result.profit
    wagered += result.wager
    if (result.multiplier >= 1) wins += 1
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
