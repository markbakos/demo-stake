import type { MinesResult } from './minesGame'
import type { SessionStatistics } from '../../shared/sessionStatistics'

type MinesStatisticsResult = Pick<MinesResult, 'profit' | 'status' | 'wager'>

const MAX_PROFIT_HISTORY_POINTS = 51

export function createEmptyMinesStatistics(): SessionStatistics {
  return {
    bets: 0,
    losses: 0,
    profit: 0,
    profitHistory: [0],
    wagered: 0,
    winRate: 0,
    wins: 0,
  }
}

export function addMinesResultToStatistics(
  statistics: SessionStatistics,
  result: MinesStatisticsResult,
): SessionStatistics {
  const isWin = result.status === 'cashed-out' || result.status === 'cleared'
  const bets = statistics.bets + 1
  const wins = statistics.wins + Number(isWin)
  const profit = statistics.profit + result.profit

  return {
    bets,
    losses: statistics.losses + Number(!isWin),
    profit,
    profitHistory: [...statistics.profitHistory, profit].slice(-MAX_PROFIT_HISTORY_POINTS),
    wagered: statistics.wagered + result.wager,
    winRate: wins / bets,
    wins,
  }
}
