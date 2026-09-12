import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { PlinkoPage } from './games/plinko/PlinkoPage'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/plinko" replace />} />
          <Route path="/plinko" element={<PlinkoPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
