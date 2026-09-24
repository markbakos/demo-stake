import { describe, expect, it } from 'vitest'
import {
  acceptPlinkoBet,
  addCredits,
  APP_STORAGE_KEY,
  cashOutMines,
  cancelAllPlinkoBets,
  chooseBlackjackInsurance,
  createAppStore,
  doubleBlackjack,
  hitBlackjack,
  revealMineTile,
  selectBlackjackSettings,
  selectMinesSettings,
  selectMinesStatistics,
  selectMinesResults,
  selectPlinkoSettings,
  settlePlinkoBet,
  setBlackjackBetAmount,
  setMinesBetAmount,
  setMinesLuck,
  setMinesMineCount,
  setMinesSoundEnabled,
  setPlinkoAutoBetCount,
  setPlinkoBetAmount,
  setPlinkoLuck,
  setPlinkoMode,
  setPlinkoRisk,
  setPlinkoRows,
  setPlinkoSoundEnabled,
  splitBlackjack,
  standBlackjack,
  startBlackjackRound,
  startMinesRound,
  walletReducer,
} from './store'
import type { BlackjackCard } from '../games/blackjack/blackjackGame'

const card = (rank: BlackjackCard['rank'], suit: BlackjackCard['suit'] = 'spades'): BlackjackCard => ({ rank, suit })

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
    expect(store.getState().plinko.results).toMatchObject([{
      id: 'round-1',
      wager: 100,
      multiplier: 2,
      payout: 200,
      profit: 100,
    }])

    expect(store.dispatch(acceptPlinkoBet('round-2', 100, 1, 0.5, rightPath))).toBe(true)
    expect(store.dispatch(settlePlinkoBet('round-2', 1))).toBe(true)
    expect(store.getState().wallet.balance).toBe(10_050)
    expect(store.getState().plinko.results).toHaveLength(2)
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
    expect(JSON.parse(values.get(APP_STORAGE_KEY) ?? 'null')).toEqual({
      version: 3,
      wallet: { balance: 350 },
      plinko: {
        results: [],
        settings: {
          autoBetCount: '0',
          betAmount: '1',
          luck: 'normal',
          mode: 'manual',
          risk: 'medium',
          rows: 16,
          soundEnabled: true,
        },
      },
      blackjack: { settings: { betAmount: '1' } },
      mines: { settings: { betAmount: '1', luck: 'normal', mineCount: 3, soundEnabled: true } },
    })

    values.set(APP_STORAGE_KEY, JSON.stringify({ version: 1, wallet: { balance: -1 } }))
    expect(createAppStore(storage).getState().wallet.balance).toBe(10_000)
  })

  it('migrates existing settings and persists every game control across reloads', () => {
    const values = new Map([[APP_STORAGE_KEY, JSON.stringify({
      version: 2,
      wallet: { balance: 500 },
      plinko: { results: [], settings: { luck: 'kind', soundEnabled: false } },
    })]])
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    const store = createAppStore(storage)

    expect(selectPlinkoSettings(store.getState())).toMatchObject({
      betAmount: '1', mode: 'manual', risk: 'medium', rows: 16,
      autoBetCount: '0', luck: 'kind', soundEnabled: false,
    })

    store.dispatch(setPlinkoBetAmount('8.5'))
    store.dispatch(setPlinkoMode('auto'))
    store.dispatch(setPlinkoRisk('high'))
    store.dispatch(setPlinkoRows(10))
    store.dispatch(setPlinkoAutoBetCount('7'))
    store.dispatch(setPlinkoLuck('favored'))
    store.dispatch(setPlinkoSoundEnabled(true))
    store.dispatch(setBlackjackBetAmount('25'))
    store.dispatch(setMinesBetAmount('3.75'))
    store.dispatch(setMinesLuck('favored'))
    store.dispatch(setMinesMineCount(8))
    store.dispatch(setMinesSoundEnabled(false))

    const reloaded = createAppStore(storage)
    expect(reloaded.getState().wallet.balance).toBe(500)
    expect(selectPlinkoSettings(reloaded.getState())).toMatchObject({
      betAmount: '8.5', mode: 'auto', risk: 'high', rows: 10,
      autoBetCount: '7', luck: 'favored', soundEnabled: true,
    })
    expect(selectBlackjackSettings(reloaded.getState())).toEqual({ betAmount: '25' })
    expect(selectMinesSettings(reloaded.getState())).toEqual({ betAmount: '3.75', luck: 'favored', mineCount: 8, soundEnabled: false })
  })

  it('rejects invalid persisted game settings and uses defaults', () => {
    const values = new Map([[APP_STORAGE_KEY, JSON.stringify({
      version: 3,
      wallet: { balance: 500 },
      plinko: { results: [], settings: {
        autoBetCount: '-1', betAmount: 'Infinity', luck: 'unknown', mode: 'turbo',
        risk: 'custom', rows: 7, soundEnabled: 'false',
      } },
      blackjack: { settings: { betAmount: '0' } },
      mines: { settings: { betAmount: '-2', luck: 'unlucky', mineCount: 25, soundEnabled: 'false' } },
    })]])
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    const store = createAppStore(storage)

    expect(selectPlinkoSettings(store.getState())).toMatchObject({
      autoBetCount: '0', betAmount: '1', luck: 'normal', mode: 'manual',
      risk: 'medium', rows: 16, soundEnabled: true,
    })
    expect(selectBlackjackSettings(store.getState())).toEqual({ betAmount: '1' })
    expect(selectMinesSettings(store.getState())).toEqual({ betAmount: '1', luck: 'normal', mineCount: 3, soundEnabled: true })
  })

  it('refunds orphaned active rounds', () => {
    const store = createAppStore()
    expect(store.dispatch(acceptPlinkoBet('round-1', 100, 0, 2, ['left']))).toBe(true)
    expect(store.dispatch(acceptPlinkoBet('round-2', 200, 1, 2, ['right']))).toBe(true)

    store.dispatch(cancelAllPlinkoBets())

    expect(store.getState().wallet.balance).toBe(10_000)
    expect(store.getState().plinko.activeBets).toEqual({})
  })

  it('runs Blackjack wagers and settles each predetermined round once', () => {
    const store = createAppStore()
    expect(store.dispatch(startBlackjackRound('round-1', 100, [
      card('10'), card('6'), card('7'), card('10'), card('4'), card('2'),
    ]))).toBe(true)
    expect(store.getState().wallet.balance).toBe(9_900)
    expect(store.dispatch(hitBlackjack())).toBe(true)
    expect(store.getState().blackjack.results[0]).toMatchObject({ payout: 200, profit: 100, outcome: 'win' })
    expect(store.getState().wallet.balance).toBe(10_100)
    expect(store.dispatch(standBlackjack())).toBe(false)
  })

  it('deducts additional Blackjack action wagers only when affordable', () => {
    const store = createAppStore()
    expect(store.dispatch(startBlackjackRound('split', 4_000, [
      card('8'), card('6'), card('8'), card('10'), card('A'), card('9'), card('2'),
    ]))).toBe(true)
    expect(store.dispatch(splitBlackjack())).toBe(true)
    expect(store.getState().wallet.balance).toBe(2_000)
    expect(store.dispatch(doubleBlackjack())).toBe(false)
    expect(store.dispatch(standBlackjack())).toBe(true)
    expect(store.dispatch(standBlackjack())).toBe(true)
    expect(store.getState().wallet.balance).toBe(10_000)

    expect(store.dispatch(startBlackjackRound('insured', 8_000, [
      card('10'), card('A'), card('8'), card('K'),
    ]))).toBe(true)
    expect(store.dispatch(chooseBlackjackInsurance(true))).toBe(false)
    expect(store.dispatch(chooseBlackjackInsurance(false))).toBe(true)
    expect(store.getState().wallet.balance).toBe(2_000)
  })

  it('shares the wallet with Mines and settles each layout once', () => {
    const store = createAppStore()
    expect(store.dispatch(startMinesRound('too-expensive', 10_001, 3, [0, 1, 2]))).toBe(false)
    expect(store.dispatch(startMinesRound('cashout', 100, 3, [0, 1, 2]))).toBe(true)
    expect(store.getState().wallet.balance).toBe(9_900)
    expect(store.dispatch(revealMineTile(3))).toMatchObject({ isMine: false, isFinalSafeReveal: false })
    expect(store.dispatch(revealMineTile(3))).toBe(false)
    expect(store.dispatch(cashOutMines())).toBe(true)
    expect(store.dispatch(cashOutMines())).toBe(false)
    expect(store.getState().wallet.balance).toBe(10_013)
    expect(store.getState().mines.results[0]).toMatchObject({ payout: 113, profit: 13, status: 'cashed-out' })

    expect(store.dispatch(startMinesRound('mine', 100, 3, [0, 1, 2]))).toBe(true)
    expect(store.dispatch(revealMineTile(0))).toMatchObject({ isMine: true, isFinalSafeReveal: false })
    expect(store.getState().wallet.balance).toBe(9_913)
    expect(store.getState().mines.results[1]).toMatchObject({ payout: 0, profit: -100, status: 'mine' })
  })

  it('snapshots Mines luck and relocates a saved hit without losing a mine', () => {
    const store = createAppStore()
    store.dispatch(setMinesLuck('favored'))
    expect(store.dispatch(startMinesRound('saved-hit', 100, 3, [0, 1, 2]))).toBe(true)
    expect(store.getState().mines.activeRound?.luck).toBe('favored')

    store.dispatch(setMinesLuck('normal'))
    const outcome = store.dispatch(revealMineTile(0, () => 0))
    const activeRound = store.getState().mines.activeRound
    expect(outcome).toEqual({ isMine: false, isFinalSafeReveal: false })
    expect(activeRound).toMatchObject({ status: 'playing', mineCount: 3, luck: 'favored', revealedTiles: [0] })
    expect(activeRound?.minePositions).toHaveLength(3)
    expect(activeRound?.minePositions).not.toContain(0)
    expect(new Set(activeRound?.minePositions).size).toBe(3)
  })

  it('keeps Mines session statistics cumulative when recent results roll over', () => {
    const store = createAppStore(undefined)
    for (let round = 1; round <= 55; round += 1) {
      expect(store.dispatch(startMinesRound(`round-${round}`, round, 1, [0]))).toBe(true)
      expect(store.dispatch(revealMineTile(0))).toMatchObject({ isMine: true, isFinalSafeReveal: false })
    }

    expect(selectMinesResults(store.getState())).toHaveLength(50)
    expect(selectMinesStatistics(store.getState())).toMatchObject({
      bets: 55,
      losses: 55,
      profit: -1_540,
      wagered: 1_540,
      wins: 0,
      winRate: 0,
    })
  })
})
