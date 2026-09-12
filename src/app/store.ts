import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'

export const CREDIT_AMOUNTS = [100, 500, 1_000, 10_000] as const
export type CreditAmount = (typeof CREDIT_AMOUNTS)[number]

type WalletState = {
  balance: number
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
  },
})

export const { addCredits } = walletSlice.actions
export const walletReducer = walletSlice.reducer

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const selectBalance = (state: RootState) => state.wallet.balance
