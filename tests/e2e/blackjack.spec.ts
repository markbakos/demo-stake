import { expect, test } from '@playwright/test'

test('plays and settles a Blackjack round', async ({ page }, testInfo) => {
  await page.goto('/blackjack')

  await expect(page).toHaveTitle('Free Blackjack Demo | Demo Casino')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Blackjack demo/)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', '/blackjack-demo-preview.jpg')
  await page.getByRole('button', { name: 'Bet', exact: true }).click()

  const noInsurance = page.getByRole('button', { name: 'No Insurance' })
  if (await noInsurance.isVisible()) await noInsurance.click()
  const stand = page.getByRole('button', { name: 'Stand', exact: true })
  await page.screenshot({ path: testInfo.outputPath('blackjack-in-play.png'), fullPage: true })
  if (await stand.isVisible()) await stand.click()

  await expect(page.getByText(/^(You Win|Dealer Wins|Push) ·/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bet', exact: true })).toBeEnabled()

  const tableBox = await page.getByRole('region', { name: 'Blackjack table' }).boundingBox()
  const controlsBox = await page.locator('main > div > aside').boundingBox()
  expect(tableBox).not.toBeNull()
  expect(controlsBox).not.toBeNull()
  if (testInfo.project.name === 'desktop') {
    expect(controlsBox!.x).toBeLessThan(tableBox!.x)
  } else {
    expect(tableBox!.y).toBeLessThan(controlsBox!.y)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  }

  await page.screenshot({ path: testInfo.outputPath('blackjack.png'), fullPage: true })
})
