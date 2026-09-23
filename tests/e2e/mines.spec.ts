import { expect, test } from '@playwright/test'

type MinesDemoWindow = Window & {
  startMinesDemo?: (minePositions: number[]) => boolean
}

test('reveals every tile crossed during a drag', async ({ page }) => {
  await page.goto('/mines')
  await page.evaluate(() => (window as MinesDemoWindow).startMinesDemo?.([24]))

  const firstTile = page.getByRole('button', { name: 'Tile 1', exact: true })
  const lastTile = page.getByRole('button', { name: 'Tile 3', exact: true })
  const firstBox = await firstTile.boundingBox()
  const lastBox = await lastTile.boundingBox()
  expect(firstBox).not.toBeNull()
  expect(lastBox).not.toBeNull()

  await page.mouse.move(firstBox!.x + firstBox!.width / 2, firstBox!.y + firstBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(lastBox!.x + lastBox!.width / 2, lastBox!.y + lastBox!.height / 2, { steps: 8 })
  await page.mouse.up()

  for (const tile of [1, 2, 3]) {
    const button = page.getByRole('button', { name: `Tile ${tile}: gem` })
    await expect(button).toBeVisible()
    await expect(button).toBeEnabled()
  }
})

test('plays winning and losing Mines rounds with the shared wallet', async ({ page }, testInfo) => {
  await page.goto('/mines')

  await expect(page).toHaveTitle('Free Mines Demo | Demo Casino')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Mines demo/)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', '/mines-demo-preview.jpg')
  await expect(page.getByText('10,000.00', { exact: true })).toBeVisible()

  await page.evaluate(() => (window as MinesDemoWindow).startMinesDemo?.([0, 1, 2]))
  await expect(page.getByText('9,999.00', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Tile 4' }).click()
  await expect(page.getByRole('button', { name: 'Cash Out 1.13' })).toBeEnabled()
  await page.screenshot({ path: testInfo.outputPath('mines-in-play.png'), fullPage: true })
  await page.getByRole('button', { name: 'Cash Out 1.13' }).click()
  await expect(page.getByText('Cashed out · +0.13 credits')).toBeVisible()
  await expect(page.getByText('10,000.13', { exact: true })).toBeVisible()

  await page.evaluate(() => (window as MinesDemoWindow).startMinesDemo?.([0, 1, 2]))
  await page.getByRole('button', { name: 'Tile 1', exact: true }).click()
  await expect(page.getByText('Mine hit · -1.00 credits')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tile 1: mine' })).toBeVisible()

  const boardBox = await page.getByRole('region', { name: 'Mines board' }).boundingBox()
  const controlsBox = await page.locator('main > div > aside').boundingBox()
  expect(boardBox).not.toBeNull()
  expect(controlsBox).not.toBeNull()
  if (testInfo.project.name === 'desktop') {
    expect(controlsBox!.x).toBeLessThan(boardBox!.x)
  } else {
    expect(boardBox!.y).toBeLessThan(controlsBox!.y)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  }

  await page.screenshot({ path: testInfo.outputPath('mines.png'), fullPage: true })
})
