import { describe, expect, it } from 'vitest'
import { acceptPlinkoBet, addCredits, createAppStore, settlePlinkoBet, walletReducer } from './store'

describe('walletReducer', () => {
  it('adds only an allowed credit amount', () => {
    const credited = walletReducer(undefined, addCredits(500))
    const unchanged = walletReducer(credited, addCredits(42))

    expect(credited.balance).toBe(10_500)
    expect(unchanged.balance).toBe(10_500)
  })

  it('rejects insufficient funds and settles a snapshotted bet once', () => {
    const store = createAppStore()
    const payouts = [2, 0.5]

    expect(store.dispatch(acceptPlinkoBet('too-expensive', 10_001, payouts))).toBe(false)
    expect(store.dispatch(acceptPlinkoBet('round-1', 100, payouts))).toBe(true)
    payouts[0] = 99
    expect(store.dispatch(settlePlinkoBet('round-1', 0))).toBe(true)
    expect(store.dispatch(settlePlinkoBet('round-1', 0))).toBe(false)

    expect(store.getState().wallet.balance).toBe(10_100)

    expect(store.dispatch(acceptPlinkoBet('round-2', 100, [2, 0.5]))).toBe(true)
    expect(store.dispatch(settlePlinkoBet('round-2', 1))).toBe(true)
    expect(store.getState().wallet.balance).toBe(10_050)
  })
})
