import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import {
  answerInsurance as answerBlackjackInsurance,
  canDoubleBlackjack,
  canSplitBlackjack,
  createBlackjackRound,
  doubleBlackjackHand,
  hitBlackjackHand,
  settleBlackjackRound,
  splitBlackjackHand,
  standBlackjackHand,
  type BlackjackCard,
  type BlackjackResult,
  type BlackjackRound,
} from '../games/blackjack/blackjackGame'
import {
  cashOutMinesRound,
  createMinesRound,
  revealMinesTile,
  settleMinesRound,
  type MinesLuck,
  type MinesResult,
  type MinesRound,
} from '../games/mines/minesGame'
import { addMinesResultToStatistics, createEmptyMinesStatistics } from '../games/mines/minesStatistics'
import { ROW_OPTIONS, type Risk, type RowCount } from '../games/plinko/plinkoConfig'
import { getTargetBin, type Luck, type PlinkoDirection } from '../games/plinko/plinkoPath'

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

export type PlinkoMode = 'manual' | 'auto'

type PlinkoSettings = {
  autoBetCount: string
  betAmount: string
  luck: Luck
  mode: PlinkoMode
  risk: Risk
  rows: RowCount
  soundEnabled: boolean
}

type BlackjackSettings = { betAmount: string }
type MinesSettings = { betAmount: string; luck: MinesLuck; mineCount: number; soundEnabled: boolean }

export type PlinkoResult = PlinkoBetSnapshot & {
  id: string
  payout: number
  profit: number
  settledAt: number
}

const MAX_PLINKO_RESULTS = 250
const MAX_BLACKJACK_RESULTS = 50
const MAX_MINES_RESULTS = 50
const defaultPlinkoSettings: PlinkoSettings = {
  autoBetCount: '0',
  betAmount: '1',
  luck: 'normal',
  mode: 'manual',
  risk: 'medium',
  rows: 16,
  soundEnabled: true,
}
const defaultBlackjackSettings: BlackjackSettings = { betAmount: '1' }
const defaultMinesSettings: MinesSettings = { betAmount: '1', luck: 'normal', mineCount: 3, soundEnabled: true }

const initialState: WalletState = {
  balance: 10_000,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isRowCount(value: unknown): value is RowCount {
  return typeof value === 'number' && ROW_OPTIONS.some((rowCount) => rowCount === value)
}

function parseBetAmount(value: unknown, fallback: string, allowZero = false) {
  if (typeof value !== 'string' || value.length > 32) return fallback
  if (value === '') return ''
  if (!value.trim()) return fallback
  const amount = Number(value)
  if (!Number.isFinite(amount) || (allowZero ? amount < 0 : amount <= 0)) return fallback
  return value
}

function parseAutoBetCount(value: unknown) {
  if (typeof value !== 'string' || value.length > 32) return defaultPlinkoSettings.autoBetCount
  if (value === '') return ''
  if (!value.trim()) return defaultPlinkoSettings.autoBetCount
  const count = Number(value)
  return Number.isInteger(count) && count >= 0 ? value : defaultPlinkoSettings.autoBetCount
}

function readSavedState(storage?: AppStorage) {
  const fallback = {
    balance: initialState.balance,
    plinkoResults: [] as PlinkoResult[],
    plinkoSettings: defaultPlinkoSettings,
    blackjackSettings: defaultBlackjackSettings,
    minesSettings: defaultMinesSettings,
  }
  if (!storage) return fallback

  try {
    const saved: unknown = JSON.parse(storage.getItem(APP_STORAGE_KEY) ?? 'null')
    if (!isRecord(saved) || (saved.version !== 1 && saved.version !== 2 && saved.version !== 3)) return fallback

    const balance = isRecord(saved.wallet) &&
      typeof saved.wallet.balance === 'number' &&
      Number.isFinite(saved.wallet.balance) &&
      saved.wallet.balance >= 0
      ? saved.wallet.balance
      : fallback.balance
    if (saved.version === 1 || !isRecord(saved.plinko)) return { ...fallback, balance }

    const savedSettings = isRecord(saved.plinko.settings) ? saved.plinko.settings : {}
    const plinkoSettings: PlinkoSettings = {
      autoBetCount: parseAutoBetCount(savedSettings.autoBetCount),
      betAmount: parseBetAmount(savedSettings.betAmount, defaultPlinkoSettings.betAmount, true),
      luck: savedSettings.luck === 'normal' || savedSettings.luck === 'favored' || savedSettings.luck === 'kind'
        ? savedSettings.luck
        : defaultPlinkoSettings.luck,
      mode: savedSettings.mode === 'manual' || savedSettings.mode === 'auto'
        ? savedSettings.mode
        : defaultPlinkoSettings.mode,
      risk: savedSettings.risk === 'low' || savedSettings.risk === 'medium' || savedSettings.risk === 'high'
        ? savedSettings.risk
        : defaultPlinkoSettings.risk,
      rows: isRowCount(savedSettings.rows)
        ? savedSettings.rows
        : defaultPlinkoSettings.rows,
      soundEnabled: typeof savedSettings.soundEnabled === 'boolean'
        ? savedSettings.soundEnabled
        : defaultPlinkoSettings.soundEnabled,
    }
    const plinkoResults = Array.isArray(saved.plinko.results)
      ? saved.plinko.results.slice(-MAX_PLINKO_RESULTS).flatMap(parsePlinkoResult)
      : []
    const savedBlackjackSettings = saved.version === 3 && isRecord(saved.blackjack) && isRecord(saved.blackjack.settings)
      ? saved.blackjack.settings
      : {}
    const blackjackSettings: BlackjackSettings = {
      betAmount: parseBetAmount(savedBlackjackSettings.betAmount, defaultBlackjackSettings.betAmount),
    }
    const savedMinesSettings = saved.version === 3 && isRecord(saved.mines) && isRecord(saved.mines.settings)
      ? saved.mines.settings
      : {}
    const minesSettings: MinesSettings = {
      betAmount: parseBetAmount(savedMinesSettings.betAmount, defaultMinesSettings.betAmount),
      luck: savedMinesSettings.luck === 'normal' || savedMinesSettings.luck === 'favored' || savedMinesSettings.luck === 'kind'
        ? savedMinesSettings.luck
        : defaultMinesSettings.luck,
      mineCount: typeof savedMinesSettings.mineCount === 'number' &&
        Number.isInteger(savedMinesSettings.mineCount) && savedMinesSettings.mineCount >= 1 && savedMinesSettings.mineCount <= 24
        ? savedMinesSettings.mineCount
        : defaultMinesSettings.mineCount,
      soundEnabled: typeof savedMinesSettings.soundEnabled === 'boolean'
        ? savedMinesSettings.soundEnabled
        : defaultMinesSettings.soundEnabled,
    }
    return { balance, plinkoResults, plinkoSettings, blackjackSettings, minesSettings }
  } catch {
    // Invalid or unavailable browser storage falls back to demo defaults.
  }

  return fallback
}

function parsePlinkoResult(value: unknown): PlinkoResult[] {
  if (!isRecord(value) || !Array.isArray(value.path)) return []
  if (!value.path.every((direction) => direction === 'left' || direction === 'right')) return []
  const path = value.path as PlinkoDirection[]
  if (
    typeof value.id !== 'string' || !value.id ||
    typeof value.wager !== 'number' || !Number.isFinite(value.wager) || value.wager < 0 ||
    typeof value.targetBin !== 'number' || !Number.isInteger(value.targetBin) || value.targetBin < 0 ||
    typeof value.multiplier !== 'number' || !Number.isFinite(value.multiplier) || value.multiplier < 0 ||
    typeof value.payout !== 'number' || !Number.isFinite(value.payout) || value.payout < 0 ||
    typeof value.profit !== 'number' || !Number.isFinite(value.profit) ||
    typeof value.settledAt !== 'number' || !Number.isFinite(value.settledAt) || value.settledAt < 0 ||
    path.length === 0 || value.targetBin > path.length || getTargetBin(path) !== value.targetBin
  ) return []

  return [{
    id: value.id,
    wager: value.wager,
    targetBin: value.targetBin,
    multiplier: value.multiplier,
    path: [...path],
    payout: value.payout,
    profit: value.profit,
    settledAt: value.settledAt,
  }]
}

function persistState(
  storage: AppStorage | undefined,
  state: {
    wallet: WalletState
    plinko: { results: PlinkoResult[]; settings: PlinkoSettings }
    blackjack: { settings: BlackjackSettings }
    mines: { settings: MinesSettings }
  },
) {
  try {
    storage?.setItem(APP_STORAGE_KEY, JSON.stringify({
      version: 3,
      wallet: { balance: state.wallet.balance },
      plinko: {
        results: state.plinko.results,
        settings: state.plinko.settings,
      },
      blackjack: { settings: state.blackjack.settings },
      mines: { settings: state.mines.settings },
    }))
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
  initialState: {
    activeBets: {} as Record<string, PlinkoBetSnapshot>,
    results: [] as PlinkoResult[],
    settings: defaultPlinkoSettings,
  },
  reducers: {
    betAccepted(state, action: PayloadAction<{ roundId: string; bet: PlinkoBetSnapshot }>) {
      state.activeBets[action.payload.roundId] = action.payload.bet
    },
    betRemoved(state, action: PayloadAction<string>) {
      delete state.activeBets[action.payload]
    },
    betSettled(state, action: PayloadAction<PlinkoResult>) {
      delete state.activeBets[action.payload.id]
      state.results.push(action.payload)
      if (state.results.length > MAX_PLINKO_RESULTS) state.results.shift()
    },
    luckChanged(state, action: PayloadAction<Luck>) {
      state.settings.luck = action.payload
    },
    betAmountChanged(state, action: PayloadAction<string>) {
      state.settings.betAmount = action.payload
    },
    modeChanged(state, action: PayloadAction<PlinkoMode>) {
      state.settings.mode = action.payload
    },
    riskChanged(state, action: PayloadAction<Risk>) {
      state.settings.risk = action.payload
    },
    rowsChanged(state, action: PayloadAction<RowCount>) {
      state.settings.rows = action.payload
    },
    autoBetCountChanged(state, action: PayloadAction<string>) {
      state.settings.autoBetCount = action.payload
    },
    soundEnabledChanged(state, action: PayloadAction<boolean>) {
      state.settings.soundEnabled = action.payload
    },
  },
})

const blackjackSlice = createSlice({
  name: 'blackjack',
  initialState: {
    activeRound: undefined as BlackjackRound | undefined,
    results: [] as BlackjackResult[],
    settings: defaultBlackjackSettings,
  },
  reducers: {
    roundStarted(state, action: PayloadAction<BlackjackRound>) {
      state.activeRound = action.payload
    },
    roundUpdated(state, action: PayloadAction<BlackjackRound>) {
      if (state.activeRound?.id === action.payload.id) state.activeRound = action.payload
    },
    roundCancelled(state) {
      state.activeRound = undefined
    },
    roundSettled(state, action: PayloadAction<BlackjackResult>) {
      if (state.activeRound?.id !== action.payload.id) return
      state.activeRound = undefined
      state.results.push(action.payload)
      if (state.results.length > MAX_BLACKJACK_RESULTS) state.results.shift()
    },
    betAmountChanged(state, action: PayloadAction<string>) {
      state.settings.betAmount = action.payload
    },
  },
})

const minesSlice = createSlice({
  name: 'mines',
  initialState: {
    activeRound: undefined as MinesRound | undefined,
    results: [] as MinesResult[],
    statistics: createEmptyMinesStatistics(),
    settings: defaultMinesSettings,
  },
  reducers: {
    roundStarted(state, action: PayloadAction<MinesRound>) {
      state.activeRound = action.payload
    },
    roundUpdated(state, action: PayloadAction<MinesRound>) {
      if (state.activeRound?.id === action.payload.id) state.activeRound = action.payload
    },
    roundCancelled(state) {
      state.activeRound = undefined
    },
    roundSettled(state, action: PayloadAction<MinesResult>) {
      if (state.activeRound?.id !== action.payload.id) return
      state.activeRound = undefined
      state.results.push(action.payload)
      if (state.results.length > MAX_MINES_RESULTS) state.results.shift()
      state.statistics = addMinesResultToStatistics(state.statistics, action.payload)
    },
    betAmountChanged(state, action: PayloadAction<string>) {
      state.settings.betAmount = action.payload
    },
    mineCountChanged(state, action: PayloadAction<number>) {
      state.settings.mineCount = action.payload
    },
    luckChanged(state, action: PayloadAction<MinesLuck>) {
      state.settings.luck = action.payload
    },
    soundEnabledChanged(state, action: PayloadAction<boolean>) {
      state.settings.soundEnabled = action.payload
    },
  },
})

const {
  roundStarted: blackjackRoundStarted,
  roundUpdated: blackjackRoundUpdated,
  roundCancelled: blackjackRoundCancelled,
  roundSettled: blackjackRoundSettled,
} = blackjackSlice.actions
const {
  roundStarted: minesRoundStarted,
  roundUpdated: minesRoundUpdated,
  roundCancelled: minesRoundCancelled,
  roundSettled: minesRoundSettled,
} = minesSlice.actions

const { betAccepted, betRemoved, betSettled } = plinkoSlice.actions
export const {
  luckChanged: setPlinkoLuck,
  soundEnabledChanged: setPlinkoSoundEnabled,
  betAmountChanged: setPlinkoBetAmount,
  modeChanged: setPlinkoMode,
  riskChanged: setPlinkoRisk,
  rowsChanged: setPlinkoRows,
  autoBetCountChanged: setPlinkoAutoBetCount,
} = plinkoSlice.actions
export const { betAmountChanged: setBlackjackBetAmount } = blackjackSlice.actions
export const {
  betAmountChanged: setMinesBetAmount,
  mineCountChanged: setMinesMineCount,
  luckChanged: setMinesLuck,
  soundEnabledChanged: setMinesSoundEnabled,
} = minesSlice.actions

export const createAppStore = (storage: AppStorage | undefined = getBrowserStorage()) => {
  const savedState = readSavedState(storage)
  const appStore = configureStore({
    reducer: {
      wallet: walletReducer,
      plinko: plinkoSlice.reducer,
      blackjack: blackjackSlice.reducer,
      mines: minesSlice.reducer,
    },
    preloadedState: {
      wallet: { balance: savedState.balance },
      plinko: { activeBets: {}, results: savedState.plinkoResults, settings: savedState.plinkoSettings },
      blackjack: { activeRound: undefined, results: [], settings: savedState.blackjackSettings },
      mines: {
        activeRound: undefined,
        results: [],
        statistics: createEmptyMinesStatistics(),
        settings: savedState.minesSettings,
      },
    },
  })

  persistState(storage, appStore.getState())
  appStore.subscribe(() => persistState(storage, appStore.getState()))
  return appStore
}
export const store = createAppStore()

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const selectBalance = (state: RootState) => state.wallet.balance
export const selectActiveBetCount = (state: RootState) => Object.keys(state.plinko.activeBets).length
export const selectPlinkoResults = (state: RootState) => state.plinko.results
export const selectPlinkoSettings = (state: RootState) => state.plinko.settings
export const selectBlackjackRound = (state: RootState) => state.blackjack.activeRound
export const selectBlackjackResults = (state: RootState) => state.blackjack.results
export const selectBlackjackSettings = (state: RootState) => state.blackjack.settings
export const selectMinesRound = (state: RootState) => state.mines.activeRound
export const selectMinesResults = (state: RootState) => state.mines.results
export const selectMinesStatistics = (state: RootState) => state.mines.statistics
export const selectMinesSettings = (state: RootState) => state.mines.settings

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

  const payout = bet.wager * bet.multiplier
  dispatch(betSettled({
    ...bet,
    id: roundId,
    payout,
    profit: payout - bet.wager,
    settledAt: Date.now(),
  }))
  dispatch(payoutCredited(payout))
  return true
}

export const cancelPlinkoBet = (roundId: string) => (dispatch: AppDispatch, getState: () => RootState) => {
  const bet = getState().plinko.activeBets[roundId]
  if (!bet) return false

  dispatch(betRemoved(roundId))
  dispatch(payoutCredited(bet.wager))
  return true
}

export const cancelAllPlinkoBets = () => (dispatch: AppDispatch, getState: () => RootState) => {
  for (const [roundId, bet] of Object.entries(getState().plinko.activeBets)) {
    dispatch(betRemoved(roundId))
    dispatch(payoutCredited(bet.wager))
  }
}

function updateBlackjackRound(dispatch: AppDispatch, round: BlackjackRound) {
  dispatch(blackjackRoundUpdated(round))
  if (round.phase !== 'settled') return
  const result = settleBlackjackRound(round)
  dispatch(blackjackRoundSettled(result))
  dispatch(payoutCredited(result.payout))
}

export const startBlackjackRound = (
  roundId: string,
  wager: number,
  sequence?: readonly BlackjackCard[],
) => (dispatch: AppDispatch, getState: () => RootState) => {
  const state = getState()
  if (
    !roundId ||
    state.blackjack.activeRound ||
    state.blackjack.results.some((result) => result.id === roundId) ||
    !Number.isFinite(wager) ||
    wager <= 0 ||
    wager > selectBalance(state)
  ) return false

  let round: BlackjackRound
  try {
    round = createBlackjackRound(roundId, wager, sequence ? [...sequence] : undefined)
  } catch {
    return false
  }
  dispatch(betPlaced(wager))
  dispatch(blackjackRoundStarted(round))
  if (round.phase === 'settled') updateBlackjackRound(dispatch, round)
  return true
}

export const chooseBlackjackInsurance = (takeInsurance: boolean) => (
  dispatch: AppDispatch,
  getState: () => RootState,
) => {
  const round = selectBlackjackRound(getState())
  if (!round || round.phase !== 'insurance') return false
  const insuranceWager = takeInsurance ? round.originalWager / 2 : 0
  if (insuranceWager > selectBalance(getState())) return false

  if (insuranceWager > 0) dispatch(betPlaced(insuranceWager))
  updateBlackjackRound(dispatch, answerBlackjackInsurance(round, takeInsurance))
  return true
}

export const hitBlackjack = () => (dispatch: AppDispatch, getState: () => RootState) => {
  const round = selectBlackjackRound(getState())
  if (!round || round.phase !== 'player') return false
  updateBlackjackRound(dispatch, hitBlackjackHand(round))
  return true
}

export const standBlackjack = () => (dispatch: AppDispatch, getState: () => RootState) => {
  const round = selectBlackjackRound(getState())
  if (!round || round.phase !== 'player') return false
  updateBlackjackRound(dispatch, standBlackjackHand(round))
  return true
}

export const doubleBlackjack = () => (dispatch: AppDispatch, getState: () => RootState) => {
  const round = selectBlackjackRound(getState())
  if (!round || !canDoubleBlackjack(round)) return false
  const additionalWager = round.hands[round.activeHand].wager
  if (additionalWager > selectBalance(getState())) return false
  dispatch(betPlaced(additionalWager))
  updateBlackjackRound(dispatch, doubleBlackjackHand(round))
  return true
}

export const splitBlackjack = () => (dispatch: AppDispatch, getState: () => RootState) => {
  const round = selectBlackjackRound(getState())
  if (!round || !canSplitBlackjack(round) || round.originalWager > selectBalance(getState())) return false
  dispatch(betPlaced(round.originalWager))
  updateBlackjackRound(dispatch, splitBlackjackHand(round))
  return true
}

export const cancelBlackjackRound = () => (dispatch: AppDispatch, getState: () => RootState) => {
  const round = selectBlackjackRound(getState())
  if (!round) return false
  const refund = round.hands.reduce((sum, hand) => sum + hand.wager, round.insuranceWager)
  dispatch(blackjackRoundCancelled())
  dispatch(payoutCredited(refund))
  return true
}

function updateMinesRound(dispatch: AppDispatch, round: MinesRound) {
  dispatch(minesRoundUpdated(round))
  if (round.status === 'playing') return
  const result = settleMinesRound(round)
  dispatch(minesRoundSettled(result))
  dispatch(payoutCredited(result.payout))
}

export const startMinesRound = (
  roundId: string,
  wager: number,
  mineCount: number,
  minePositions?: readonly number[],
) => (dispatch: AppDispatch, getState: () => RootState) => {
  const state = getState()
  if (
    !roundId ||
    state.mines.activeRound ||
    state.mines.results.some((result) => result.id === roundId) ||
    !Number.isFinite(wager) ||
    wager <= 0 ||
    wager > selectBalance(state)
  ) return false

  let round: MinesRound
  try {
    round = createMinesRound(roundId, wager, mineCount, minePositions ? [...minePositions] : undefined, state.mines.settings.luck)
  } catch {
    return false
  }
  dispatch(betPlaced(wager))
  dispatch(minesRoundStarted(round))
  return true
}

export const revealMineTile = (tile: number, random: () => number = Math.random) => (dispatch: AppDispatch, getState: () => RootState) => {
  const round = selectMinesRound(getState())
  if (!round) return false
  const updated = revealMinesTile(round, tile, random)
  if (updated === round) return false
  updateMinesRound(dispatch, updated)
  return {
    isMine: updated.status === 'mine',
    isFinalSafeReveal: updated.status === 'cleared',
  }
}

export const cashOutMines = () => (dispatch: AppDispatch, getState: () => RootState) => {
  const round = selectMinesRound(getState())
  if (!round) return false
  const updated = cashOutMinesRound(round)
  if (updated === round) return false
  updateMinesRound(dispatch, updated)
  return true
}

export const cancelMinesRound = () => (dispatch: AppDispatch, getState: () => RootState) => {
  const round = selectMinesRound(getState())
  if (!round) return false
  dispatch(minesRoundCancelled())
  dispatch(payoutCredited(round.wager))
  return true
}
