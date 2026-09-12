import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  CircleDollarSign,
  Code2,
  Menu,
  UserRound,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const PORTFOLIO_URL = 'https://www.markbakos.com'
const SOURCE_URL = 'https://github.com/markbakos/demo-stake'

const creditFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function AppShell() {
  const [isRailOpen, setIsRailOpen] = useState(() => !window.matchMedia('(max-width: 767px)').matches)

  return (
    <div className="min-h-dvh bg-[#1a2c38] text-white">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-50 -translate-y-20 rounded bg-white px-3 py-2 text-sm font-semibold text-[#0f212e] focus:translate-y-0"
      >
        Skip to game
      </a>

      <header className="sticky top-0 z-30 h-16 bg-[#1a2c38] shadow-lg shadow-black/30">
        <div className="relative flex h-full items-center px-4 sm:px-6">
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
          <span className="ml-3 text-xl font-extrabold tracking-tight" translate="no">
            Casino
          </span>
          <div className="ml-auto flex overflow-hidden rounded shadow-md sm:absolute sm:left-1/2 sm:ml-0 sm:-translate-x-1/2">
            <div className="flex items-center gap-2 bg-[#0f212e] px-3 py-2 text-sm font-semibold tabular-nums sm:text-base">
              <CircleDollarSign aria-hidden="true" className="size-4 text-[#b1bad3]" />
              <span>{creditFormatter.format(10_000)}</span>
            </div>
            <span className="bg-[#1475e1] px-3 py-2 text-sm font-semibold sm:px-5 sm:text-base">
              Wallet
            </span>
          </div>
        </div>
      </header>

      <div
        className={`grid min-h-[calc(100dvh-4rem)] transition-[grid-template-columns] duration-200 ${
          isRailOpen
            ? 'grid-cols-[4rem_minmax(0,1fr)] md:grid-cols-[15rem_minmax(0,1fr)]'
            : 'grid-cols-[4rem_minmax(0,1fr)]'
        }`}
      >
        <aside
          id="game-navigation"
          className={`flex min-h-full flex-col border-r border-white/5 bg-[#0f212e] px-2 py-5 shadow-xl shadow-black/10 ${
            isRailOpen ? 'max-md:absolute max-md:inset-y-0 max-md:z-20 max-md:w-60' : ''
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
                  <UserRound aria-hidden="true" className="size-4 shrink-0" />
                </RailLink>
              </li>
              <li>
                <RailLink href={SOURCE_URL} label="Source Code" isRailOpen={isRailOpen}>
                  <Code2 aria-hidden="true" className="size-4 shrink-0" />
                </RailLink>
              </li>
            </ul>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col">
          <Outlet />
          <footer className="mt-auto px-4 pb-4 text-[0.6875rem] text-[#7f8da3]">
            <div className="mx-auto flex max-w-6xl justify-end gap-4 border-t border-white/5 pt-3">
              <a href={PORTFOLIO_URL} target="_blank" rel="noreferrer" className="transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]">
                Mark Bakos
              </a>
              <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701]">
                Source Code
              </a>
            </div>
          </footer>
        </div>
      </div>
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
      className={`flex items-center rounded py-2 text-xs text-[#7f8da3] transition-colors hover:bg-[#213743] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e701] ${
        isRailOpen ? 'gap-3 px-3' : 'justify-center px-2'
      }`}
    >
      {children}
      {isRailOpen ? <span>{label}</span> : null}
    </a>
  )
}
