import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PlinkoPage } from './games/plinko/PlinkoPage'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/plinko" replace />} />
        <Route path="/plinko" element={<PlinkoPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
