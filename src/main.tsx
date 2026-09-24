import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { store } from './app/store'
import { BlackjackPage } from './games/blackjack/BlackjackPage'
import { MinesPage } from './games/mines/MinesPage'
import { DicePage } from './games/dice/DicePage'
import { PlinkoPage } from './games/plinko/PlinkoPage'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/plinko" replace />} />
            <Route path="/plinko" element={<PlinkoPage />} />
            <Route path="/blackjack" element={<BlackjackPage />} />
            <Route path="/mines" element={<MinesPage />} />
            <Route path="/dice" element={<DicePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
