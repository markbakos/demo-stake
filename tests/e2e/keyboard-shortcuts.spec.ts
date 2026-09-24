import { expect, test } from '@playwright/test'

type MinesDemoWindow = Window & {
  startMinesDemo?: (minePositions: number[]) => boolean
}

test('Space drops one Plinko ball outside controls', async ({ page }) => {
  await page.goto('/plinko')
  const balance = page.getByText('10,000.00', { exact: true })
  await page.getByRole('spinbutton', { name: 'Bet Amount' }).focus()
  await page.keyboard.press('Space')
  await expect(balance).toBeVisible()

  await page.locator('canvas').click()
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press('Space')
  await expect(page.getByText('9,999.00', { exact: true })).toBeVisible()
})

test('Space picks a random Mines tile outside controls', async ({ page }) => {
  await page.goto('/mines')
  await page.evaluate(() => (window as MinesDemoWindow).startMinesDemo?.([0]))

  const status = page.locator('main p[aria-live="polite"]')
  await page.getByRole('button', { name: 'Tile 25' }).focus()
  await page.keyboard.press('Space')
  await expect(status).toHaveText('1 gem found · 1.03×')

  await page.getByRole('region', { name: 'Mines board' }).click({ position: { x: 1, y: 1 } })
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press('Space')
  await expect(status).not.toHaveText('1 gem found · 1.03×')
})
