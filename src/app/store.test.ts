import { describe, expect, it } from 'vitest'
import {
  acceptPlinkoBet,
  addCredits,
  APP_STORAGE_KEY,
  createAppStore,
  settlePlinkoBet,
  walletReducer,
} from './store'

describe('walletReducer', () => {
  it('adds only an allowed credit amount', () => {
    const credited = walletReducer(undefined, addCredits(500))
    const unchanged = walletReducer(credited, addCredits(42))

    expect(credited.balance).toBe(10_500)
    expect(unchanged.balance).toBe(10_500)
  })

  it('rejects insufficient funds and settles a snapshotted bet once', () => {
    const store = createAppStore()
    const leftPath = ['left'] as const
    const rightPath = ['right'] as const

    expect(store.dispatch(acceptPlinkoBet('too-expensive', 10_001, 0, 2, leftPath))).toBe(false)
    expect(store.dispatch(acceptPlinkoBet('round-1', 100, 0, 2, leftPath))).toBe(true)
    expect(store.dispatch(settlePlinkoBet('round-1', 0))).toBe(true)
    expect(store.dispatch(settlePlinkoBet('round-1', 0))).toBe(false)

    expect(store.getState().wallet.balance).toBe(10_100)

    expect(store.dispatch(acceptPlinkoBet('round-2', 100, 1, 0.5, rightPath))).toBe(true)
    expect(store.dispatch(settlePlinkoBet('round-2', 1))).toBe(true)
    expect(store.getState().wallet.balance).toBe(10_050)
  })

  it('loads and persists a validated wallet balance', () => {
    const values = new Map([[APP_STORAGE_KEY, JSON.stringify({ version: 1, wallet: { balance: 250 } })]])
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    const store = createAppStore(storage)

    expect(store.getState().wallet.balance).toBe(250)
    store.dispatch(addCredits(100))
    expect(JSON.parse(values.get(APP_STORAGE_KEY) ?? 'null')).toEqual({ version: 1, wallet: { balance: 350 } })

    values.set(APP_STORAGE_KEY, JSON.stringify({ version: 1, wallet: { balance: -1 } }))
    expect(createAppStore(storage).getState().wallet.balance).toBe(10_000)
  })
})
