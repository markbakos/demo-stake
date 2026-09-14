import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { getTargetBin, type PlinkoDirection } from '../games/plinko/plinkoPath'

export const CREDIT_AMOUNTS = [100, 500, 1_000, 10_000] as const
export type CreditAmount = (typeof CREDIT_AMOUNTS)[number]
export const APP_STORAGE_KEY = 'demo-casino-state'

type AppStorage = Pick<Storage, 'getItem' | 'setItem'>

type WalletState = {
  balance: number
}

type PlinkoBetSnapshot = {
  wager: number
  targetBin: number
  multiplier: number
  path: PlinkoDirection[]
}

const initialState: WalletState = {
  balance: 10_000,
}

function readBalance(storage?: AppStorage) {
  if (!storage) return initialState.balance

  try {
    const saved: unknown = JSON.parse(storage.getItem(APP_STORAGE_KEY) ?? 'null')
    if (
      typeof saved === 'object' &&
      saved !== null &&
      'version' in saved &&
      saved.version === 1 &&
      'wallet' in saved &&
      typeof saved.wallet === 'object' &&
      saved.wallet !== null &&
      'balance' in saved.wallet &&
      typeof saved.wallet.balance === 'number' &&
      Number.isFinite(saved.wallet.balance) &&
      saved.wallet.balance >= 0
    ) return saved.wallet.balance
  } catch {
    // Invalid or unavailable browser storage falls back to demo defaults.
  }

  return initialState.balance
}

function persistBalance(storage: AppStorage | undefined, balance: number) {
  try {
    storage?.setItem(APP_STORAGE_KEY, JSON.stringify({ version: 1, wallet: { balance } }))
  } catch {
    // The demo remains playable when browser storage is unavailable or full.
  }
}

function getBrowserStorage() {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    addCredits(state, action: PayloadAction<number>) {
      if (CREDIT_AMOUNTS.some((amount) => amount === action.payload)) {
        state.balance += action.payload
      }
    },
    betPlaced(state, action: PayloadAction<number>) {
      if (Number.isFinite(action.payload) && action.payload >= 0 && action.payload <= state.balance) {
        state.balance -= action.payload
      }
    },
    payoutCredited(state, action: PayloadAction<number>) {
      if (Number.isFinite(action.payload) && action.payload >= 0) {
        state.balance += action.payload
      }
    },
  },
})

const { betPlaced, payoutCredited } = walletSlice.actions
export const { addCredits } = walletSlice.actions
export const walletReducer = walletSlice.reducer

const plinkoSlice = createSlice({
  name: 'plinko',
  initialState: { activeBets: {} as Record<string, PlinkoBetSnapshot> },
  reducers: {
    betAccepted(state, action: PayloadAction<{ roundId: string; bet: PlinkoBetSnapshot }>) {
      state.activeBets[action.payload.roundId] = action.payload.bet
    },
    betRemoved(state, action: PayloadAction<string>) {
      delete state.activeBets[action.payload]
    },
  },
})

const { betAccepted, betRemoved } = plinkoSlice.actions

export const createAppStore = (storage: AppStorage | undefined = getBrowserStorage()) => {
  const appStore = configureStore({
    reducer: {
      wallet: walletReducer,
      plinko: plinkoSlice.reducer,
    },
    preloadedState: {
      wallet: { balance: readBalance(storage) },
      plinko: { activeBets: {} },
    },
  })

  persistBalance(storage, appStore.getState().wallet.balance)
  appStore.subscribe(() => persistBalance(storage, appStore.getState().wallet.balance))
  return appStore
}
export const store = createAppStore()

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const selectBalance = (state: RootState) => state.wallet.balance
export const selectActiveBetCount = (state: RootState) => Object.keys(state.plinko.activeBets).length

export const acceptPlinkoBet = (
  roundId: string,
  wager: number,
  targetBin: number,
  multiplier: number,
  path: readonly PlinkoDirection[],
) => (
  dispatch: AppDispatch,
  getState: () => RootState,
) => {
  if (
    !roundId ||
    getState().plinko.activeBets[roundId] ||
    !Number.isFinite(wager) ||
    wager < 0 ||
    wager > selectBalance(getState()) ||
    !Number.isInteger(targetBin) ||
    targetBin < 0 ||
    !Number.isFinite(multiplier) ||
    multiplier < 0 ||
    path.length === 0 ||
    targetBin > path.length ||
    getTargetBin(path) !== targetBin
  ) return false

  dispatch(betPlaced(wager))
  dispatch(betAccepted({ roundId, bet: { wager, targetBin, multiplier, path: [...path] } }))
  return true
}

export const settlePlinkoBet = (roundId: string, bin: number) => (dispatch: AppDispatch, getState: () => RootState) => {
  const bet = getState().plinko.activeBets[roundId]
  if (!bet || !Number.isInteger(bin) || bin !== bet.targetBin) return false

  dispatch(betRemoved(roundId))
  dispatch(payoutCredited(bet.wager * bet.multiplier))
  return true
}

export const cancelPlinkoBet = (roundId: string) => (dispatch: AppDispatch, getState: () => RootState) => {
  const bet = getState().plinko.activeBets[roundId]
  if (!bet) return false

  dispatch(betRemoved(roundId))
  dispatch(payoutCredited(bet.wager))
  return true
}
