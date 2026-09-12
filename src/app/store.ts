import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'

export const CREDIT_AMOUNTS = [100, 500, 1_000, 10_000] as const
export type CreditAmount = (typeof CREDIT_AMOUNTS)[number]

type WalletState = {
  balance: number
}

type PlinkoBetSnapshot = {
  wager: number
  payouts: number[]
}

const initialState: WalletState = {
  balance: 10_000,
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

export const createAppStore = () => configureStore({
  reducer: {
    wallet: walletReducer,
    plinko: plinkoSlice.reducer,
  },
})
export const store = createAppStore()

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const selectBalance = (state: RootState) => state.wallet.balance
export const selectActiveBetCount = (state: RootState) => Object.keys(state.plinko.activeBets).length

export const acceptPlinkoBet = (roundId: string, wager: number, payouts: readonly number[]) => (
  dispatch: AppDispatch,
  getState: () => RootState,
) => {
  if (
    !roundId ||
    getState().plinko.activeBets[roundId] ||
    !Number.isFinite(wager) ||
    wager < 0 ||
    wager > selectBalance(getState()) ||
    payouts.length === 0 ||
    payouts.some((payout) => !Number.isFinite(payout) || payout < 0)
  ) return false

  dispatch(betPlaced(wager))
  dispatch(betAccepted({ roundId, bet: { wager, payouts: [...payouts] } }))
  return true
}

export const settlePlinkoBet = (roundId: string, bin: number) => (dispatch: AppDispatch, getState: () => RootState) => {
  const bet = getState().plinko.activeBets[roundId]
  const multiplier = bet?.payouts[bin]
  if (!bet || !Number.isInteger(bin) || !Number.isFinite(multiplier) || multiplier < 0) return false

  dispatch(betRemoved(roundId))
  dispatch(payoutCredited(bet.wager * multiplier))
  return true
}

export const cancelPlinkoBet = (roundId: string) => (dispatch: AppDispatch, getState: () => RootState) => {
  const bet = getState().plinko.activeBets[roundId]
  if (!bet) return false

  dispatch(betRemoved(roundId))
  dispatch(payoutCredited(bet.wager))
  return true
}
