import type { Ref } from 'react'
import type { PlinkoResult } from '../../app/store'
import { SessionStatisticsDialog } from '../../shared/SessionStatisticsDialog'
import { calculatePlinkoStatistics } from './plinkoStatistics'

type PlinkoStatisticsDialogProps = {
  ref: Ref<HTMLDialogElement>
  results: readonly PlinkoResult[]
}

export function PlinkoStatisticsDialog({ ref, results }: PlinkoStatisticsDialogProps) {
  return <SessionStatisticsDialog ref={ref} playLabel="Bets" statistics={calculatePlinkoStatistics(results)} />
}
