import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  CircleDollarSign,
  GitFork,
  Menu,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { NavLink, Outlet } from 'react-router-dom'
import { addCredits, CREDIT_AMOUNTS, selectBalance, type AppDispatch, type CreditAmount } from './store'

const PORTFOLIO_URL = 'https://www.markbakos.com'
const SOURCE_URL = 'https://github.com/markbakos/demo-stake'

const creditFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const addAmountFormatter = new Intl.NumberFormat('en-US')

export function AppShell() {
  const [isRailOpen, setIsRailOpen] = useState(() => window.matchMedia('(min-width: 1280px)').matches)
  const addBalanceDialogRef = useRef<HTMLDialogElement>(null)
  const balance = useSelector(selectBalance)
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1280px)')
    const handleBreakpointChange = (event: MediaQueryListEvent) => setIsRailOpen(event.matches)
    desktop.addEventListener('change', handleBreakpointChange)
    return () => desktop.removeEventListener('change', handleBreakpointChange)
  }, [])

  function handleAddCredits(amount: CreditAmount) {
    dispatch(addCredits(amount))
  }

  return (
    <div className="min-h-dvh bg-[#1a2c38] text-white">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-50 -translate-y-20 rounded bg-white px-3 py-2 text-sm font-semibold text-[#0f212e] focus:translate-y-0"
      >
        Skip to game
      </a>

      <header className="sticky top-0 z-30 h-16 bg-[#1a2c38] shadow-lg shadow-black/30">
        <div className="relative flex h-full items-center px-3 sm:px-6">
          <button
            type="button"
            aria-controls="game-navigation"
            aria-expanded={isRailOpen}
            aria-label={isRailOpen ? 'Collapse navigation' : 'Expand navigation'}
            onClick={() => setIsRailOpen((isOpen) => !isOpen)}
            className="rounded p-2 text-[#b1bad3] transition-colors hover:bg-[#213743] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>
          <span className="ml-3 hidden text-xl font-extrabold tracking-tight sm:inline" translate="no">
            Casino
          </span>
          <div className="ml-auto flex min-w-0 overflow-hidden rounded shadow-md sm:absolute sm:left-1/2 sm:ml-0 sm:-translate-x-1/2">
            <div className="flex min-w-0 items-center gap-1.5 bg-[#0f212e] px-2.5 py-2 text-sm font-semibold tabular-nums sm:gap-2 sm:px-3 sm:text-base">
              <CircleDollarSign aria-hidden="true" className="size-4 text-[#b1bad3]" />
              <span aria-live="polite">{creditFormatter.format(balance)}</span>
            </div>
            <button
              type="button"
              onClick={() => addBalanceDialogRef.current?.showModal()}
              className="shrink-0 bg-[#1475e1] px-3 py-2 text-sm font-semibold transition-colors hover:bg-[#1164c1] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-white sm:px-5 sm:text-base"
            >
              Add
            </button>
          </div>
        </div>
      </header>

      <div
        className={`relative grid min-h-[calc(100dvh-4rem)] grid-cols-1 transition-[grid-template-columns] duration-200 ${
          isRailOpen
            ? 'xl:grid-cols-[15rem_minmax(0,1fr)]'
            : 'xl:grid-cols-[4rem_minmax(0,1fr)]'
        }`}
      >
        {isRailOpen ? (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsRailOpen(false)}
            className="fixed inset-x-0 bottom-0 top-16 z-10 bg-black/55 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#00e701] xl:hidden"
          />
        ) : null}
        <aside
          id="game-navigation"
          className={`min-h-full flex-col overflow-y-auto overscroll-contain border-r border-white/5 bg-[#0f212e] px-2 py-5 shadow-xl shadow-black/10 xl:flex ${
            isRailOpen ? 'fixed bottom-0 left-0 top-16 z-20 flex w-60 xl:static xl:w-auto' : 'hidden'
          }`}
        >
          <div className="mb-2 flex items-center justify-between px-2">
            <p className={isRailOpen ? 'text-xs font-semibold uppercase tracking-wider text-[#b1bad3]' : 'sr-only'}>
              Games
            </p>
            <button
              type="button"
              aria-label={isRailOpen ? 'Collapse navigation' : 'Expand navigation'}
              onClick={() => setIsRailOpen((isOpen) => !isOpen)}
              className="hidden rounded p-1.5 text-[#b1bad3] transition-colors hover:bg-[#213743] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701] md:block"
            >
              {isRailOpen ? <ChevronLeft aria-hidden="true" className="size-4" /> : <ChevronRight aria-hidden="true" className="size-4" />}
            </button>
          </div>

          <nav aria-label="Games">
            <ul>
              <li>
                <NavLink
                  to="/plinko"
                  aria-label="Plinko"
                  title={isRailOpen ? undefined : 'Plinko'}
                  className={({ isActive }) =>
                    `flex items-center rounded py-3 text-sm font-semibold transition-colors hover:bg-[#213743] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701] ${
                      isRailOpen ? 'gap-3 px-3' : 'justify-center px-2'
                    } ${isActive ? 'bg-[#213743] text-white' : 'text-[#b1bad3]'}`
                  }
                >
                  <CircleDot aria-hidden="true" className="size-5 shrink-0 text-[#00e701]" />
                  {isRailOpen ? <span>Plinko</span> : null}
                </NavLink>
              </li>
            </ul>
          </nav>

          <nav aria-label="External links" className="mt-auto border-t border-[#213743] pt-3">
            <ul className="space-y-1">
              <li>
                <RailLink href={PORTFOLIO_URL} label="Mark Bakos" isRailOpen={isRailOpen}>
                  <BriefcaseBusiness aria-hidden="true" className="size-5 shrink-0" />
                </RailLink>
              </li>
              <li>
                <RailLink href={SOURCE_URL} label="Source Code" isRailOpen={isRailOpen}>
                  <GitFork aria-hidden="true" className="size-5 shrink-0" />
                </RailLink>
              </li>
            </ul>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col">
          <Outlet />
          <footer className="mt-auto px-3 pb-5 text-sm text-[#b1bad3] sm:px-4">
            <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-5 gap-y-3 border-t border-white/10 pt-4 sm:justify-end">
              <a href={PORTFOLIO_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]">
                <BriefcaseBusiness aria-hidden="true" className="size-5" />
                Mark Bakos
              </a>
              <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]">
                <GitFork aria-hidden="true" className="size-5" />
                Source Code
              </a>
            </div>
          </footer>
        </div>
      </div>

      <dialog
        ref={addBalanceDialogRef}
        aria-labelledby="add-balance-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
        className="m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%_-_1rem)] max-w-md overflow-y-auto overscroll-contain rounded-lg border border-white/10 bg-[#213743] p-0 text-white shadow-2xl shadow-black/50 backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:w-[calc(100%_-_2rem)]"
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 id="add-balance-title" className="text-lg font-semibold">Add Balance</h2>
            <button
              type="button"
              aria-label="Close add balance dialog"
              onClick={() => addBalanceDialogRef.current?.close()}
              className="rounded p-2 text-[#b1bad3] transition-colors hover:bg-[#2f4553] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {CREDIT_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleAddCredits(amount)}
                className="rounded bg-[#1475e1] px-4 py-3 font-semibold tabular-nums transition-colors hover:bg-[#1164c1] active:bg-[#0f56a5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                +${addAmountFormatter.format(amount)}
              </button>
            ))}
          </div>
        </div>
      </dialog>
    </div>
  )
}

function RailLink({ children, href, isRailOpen, label }: { children: ReactNode; href: string; isRailOpen: boolean; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={isRailOpen ? undefined : label}
      className={`flex items-center rounded py-3 text-sm font-normal text-[#b1bad3] transition-colors hover:bg-[#213743] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701] ${
        isRailOpen ? 'gap-3 px-3' : 'justify-center px-2'
      }`}
    >
      {children}
      {isRailOpen ? <span>{label}</span> : null}
    </a>
  )
}
