import type { BlackjackHandResult, BlackjackResult } from './blackjackGame'
import type { SessionStatistics } from '../../shared/sessionStatistics'

type BlackjackStatisticsResult = Pick<BlackjackResult, 'insuranceWager' | 'profit' | 'outcome'> & {
  hands: readonly Pick<BlackjackHandResult, 'wager'>[]
}

export function calculateBlackjackStatistics(results: readonly BlackjackStatisticsResult[]): SessionStatistics {
  let profit = 0
  let wagered = 0
  let wins = 0
  let losses = 0
  let pushes = 0
  const profitHistory = [0]

  for (const result of results) {
    profit += result.profit
    wagered += result.insuranceWager + result.hands.reduce((sum, hand) => sum + hand.wager, 0)
    if (result.outcome === 'win') wins += 1
    else if (result.outcome === 'loss') losses += 1
    else pushes += 1
    profitHistory.push(profit)
  }

  return {
    bets: results.length,
    losses,
    profit,
    profitHistory,
    wagered,
    winRate: results.length === 0 ? 0 : wins / results.length,
    wins,
    pushes,
  }
}
