import { expect, test } from '@playwright/test'

test('plays Dice Over and Under rounds and opens live statistics', async ({ page }, testInfo) => {
  await page.goto('/dice')

  await expect(page).toHaveTitle('Free Dice Demo | Demo Casino')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Dice demo/)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', '/dice-demo-preview.svg')
  await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute('content', 'image/svg+xml')
  await expect(page.getByText('10,000.00', { exact: true })).toBeVisible()

  await page.evaluate(() => { Math.random = () => 0.8 })
  await page.getByRole('button', { name: 'Bet', exact: true }).click()
  await expect(page.getByText('You won · +1.00 credits')).toBeVisible()
  await expect(page.getByText('10,001.00', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Roll Under' }).click()
  await page.getByRole('button', { name: 'Bet', exact: true }).click()
  await expect(page.getByText('No win · −1.00 credits')).toBeVisible()
  await expect(page.getByText('10,000.00', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'auto', exact: true }).click()
  await page.getByLabel(/Number of Bets/).fill('2')
  await page.getByRole('button', { name: 'Start Autobet' }).click()
  await expect(page.getByRole('button', { name: 'Start Autobet' })).toBeEnabled()
  await expect(page.getByText('9,998.00', { exact: true })).toBeVisible()

  await page.getByLabel(/Number of Bets/).fill('0')
  await page.getByLabel('Stop on Profit').fill('1')
  await page.getByRole('button', { name: 'Roll Over' }).click()
  await page.getByRole('button', { name: 'Start Autobet' }).click()
  await expect(page.getByRole('button', { name: 'Start Autobet' })).toBeEnabled()
  await expect(page.getByText('9,999.00', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Game settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Game Settings' })
  await expect(settings).toBeVisible()
  await expect(settings.getByRole('checkbox', { name: /Sound Effects/ })).toBeChecked()
  await settings.getByRole('button', { name: 'Close settings' }).click()

  await page.getByRole('button', { name: 'Open live statistics' }).click()
  const statistics = page.getByRole('dialog', { name: 'Live Statistics' })
  await expect(statistics).toBeVisible()
  await expect(statistics.getByText('5', { exact: true })).toBeVisible()
  await statistics.getByRole('button', { name: 'Close statistics' }).click()

  const boardBox = await page.getByRole('region', { name: 'Dice game board' }).boundingBox()
  const controlsBox = await page.locator('main > div > aside').boundingBox()
  expect(boardBox).not.toBeNull()
  expect(controlsBox).not.toBeNull()
  if (testInfo.project.name === 'desktop') {
    expect(controlsBox!.x).toBeLessThan(boardBox!.x)
  } else {
    expect(boardBox!.y).toBeLessThan(controlsBox!.y)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  }

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath('dice.png'), fullPage: true })
})
