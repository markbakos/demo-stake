# Demo Casino

Demo Casino is a browser-only collection of casino-style games built for casual play and game-behavior testing. It currently includes Plinko, Blackjack, and Mines, with a shared balance of virtual demo credits.

No account or backend is required. Credits are only for this demo; they cannot be deposited, withdrawn, transferred, or redeemed for money or other value.

## Games

- **Plinko** — Choose a wager, risk level, and board size from 8 to 16 rows. Watch a Matter.js simulation guide the ball to the selected result, then review recent drops and session statistics.
- **Blackjack** — Play against the dealer with Hit, Stand, Split, Double, and Insurance actions. The card order is selected before the deal begins.
- **Mines** — Reveal gems on a 5×5 board with 1–24 mines, pick a tile at random, and cash out after safe reveals. Mine locations are selected before the first reveal.

All three games use the same demo-credit balance, which starts at 10,000 and is saved in the browser when storage is available. Active rounds are not restored after a reload.

## Outcome-first design

Each round's result is chosen before the game presents it. Plinko physics animates toward its selected bin; Blackjack deals from a preselected card sequence; Mines reveals a preselected board. The animations display outcomes and do not choose payouts.

The project does not provide real-money gambling, payments, accounts, cryptocurrency, or provably-fair claims.

## Technology

- React and TypeScript
- Vite and Tailwind CSS
- Redux Toolkit and React Router
- Matter.js for Plinko physics
- Vitest for logic and state tests
- Playwright for desktop and mobile browser journeys
- pnpm for package management

## Run locally

Requirements: Node.js compatible with Vite 8 and pnpm.

```sh
git clone https://github.com/markbakos/demo-stake.git
cd demo-stake
pnpm install
pnpm dev
```

Vite prints the local development URL after it starts.

## Project commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Vite development server. |
| `pnpm typecheck` | Run the TypeScript project check. |
| `pnpm test` | Run Vitest checks in `src`. |
| `pnpm exec playwright install chromium` | Install the browser used by Playwright. |
| `pnpm test:e2e` | Run Playwright browser journeys. |
| `pnpm build` | Typecheck and create a production build in `dist`. |

## Deploy to Netlify

The repository's [`netlify.toml`](netlify.toml) configures Netlify to run `pnpm build`, publish `dist`, and rewrite client-side routes to `index.html`. Connect the repository to Netlify and use the repository root as the base directory.

## Project structure

```text
src/
  app/                 Application shell, routing, and shared store
  games/
    blackjack/         Blackjack interface and game rules
    mines/             Mines interface and game rules
    plinko/            Plinko interface, outcomes, and Matter.js physics
  main.tsx             React application entry point
tests/
  e2e/                 Playwright browser journeys
```

Game-specific rules and UI live with each game. The shared store owns the demo wallet; Plinko's Matter.js engine owns live physics while Redux holds application and round state.
