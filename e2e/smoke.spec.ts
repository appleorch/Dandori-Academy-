import { expect, test, type Page } from '@playwright/test';

/** A returning player on low graphics, with the briefings and commentary off. */
async function freshPlayer(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem(
      'dandori-academy-settings',
      JSON.stringify({
        graphics: 'low',
        graphicsTuned: true,
        seenIntro: true,
        briefings: true,
        hints: false,
        commentary: false,
      }),
    );
  });
  await page.goto('./');
  return errors;
}

/** Waits for the day to be running: the HUD's pause button is up. */
async function inDay(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: /Begin the day/ })).toBeVisible();
  await page.getByRole('button', { name: /Begin the day/ }).click();
  await expect(page.getByRole('button', { name: /^Pause/ })).toBeVisible();
}

test('the main menu offers the four ways to play', async ({ page }) => {
  const errors = await freshPlayer(page);
  for (const name of ['Story', 'Time Attack', 'Challenges', 'Battles']) {
    await expect(page.locator('.mode-card', { hasText: name }).first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('a story day can be played and called, and is settled at the base camp', async ({ page }) => {
  const errors = await freshPlayer(page);
  await page.getByRole('button', { name: /Begin the story/ }).click();
  await expect(page.getByRole('heading', { name: 'Story' })).toBeVisible();
  await page.getByRole('button', { name: /Begin the expedition/ }).click();
  await expect(page.getByRole('button', { name: /Begin the day/ })).toBeVisible();
  await page.getByRole('button', { name: /Begin the day/ }).click();
  // The first morning opens with a scene; skip it, as a player may.
  await page.getByRole('button', { name: 'Skip' }).click({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /^Pause/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Call it a day/ }).click();
  await expect(page.getByText('Sproutlings home by sunset')).toBeVisible();
  await page.getByRole('button', { name: 'Base camp' }).click();
  await expect(page.getByText('Day 2', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('a challenge can be played and ended for a result', async ({ page }) => {
  const errors = await freshPlayer(page);
  await page.locator('.mode-card', { hasText: 'Challenges' }).click();
  await page.getByRole('button', { name: 'Treasure Hunt' }).click();
  await page.getByRole('button', { name: /Scattered Light/ }).click();
  await inDay(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /End the day now/ }).click();
  await expect(page.getByRole('button', { name: /Try again/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('a Time Attack lesson starts from the lesson map', async ({ page }) => {
  const errors = await freshPlayer(page);
  await page.locator('.mode-card', { hasText: 'Time Attack' }).click();
  await expect(page.getByRole('heading', { name: 'Time Attack' })).toBeVisible();
  await page.getByRole('button', { name: /Play this day|Continue/ }).click();
  await inDay(page);
  expect(errors).toEqual([]);
});

test('a battle can be started and conceded', async ({ page }) => {
  const errors = await freshPlayer(page);
  await page.locator('.mode-card', { hasText: 'Battles' }).click();
  await page.locator('button.lesson').first().click();
  await inDay(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Concede the battle/ }).click();
  await expect(page.getByRole('button', { name: /Rematch/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('once opened, the game loads and starts a day offline', async ({ page, context }) => {
  await freshPlayer(page);
  // Let the service worker take over and the background downloads (scene, physics) finish.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForTimeout(6000);
  await context.setOffline(true);
  await page.reload();
  await page.locator('.mode-card', { hasText: 'Challenges' }).click();
  await page.getByRole('button', { name: 'Treasure Hunt' }).click();
  await page.getByRole('button', { name: /Scattered Light/ }).click();
  await inDay(page);
});

/** Visible text on the page with two plain letters in a row: in the pseudo-locale, untranslated. */
async function untranslated(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim() ?? '';
      const element = node.parentElement;
      if (!text || !element || element.closest('script, style, kbd, svg, [aria-hidden="true"]')) {
        continue;
      }
      if (!element.checkVisibility()) continue;
      if (/[A-Za-z]{2,}/.test(text)) found.push(text);
    }
    return found;
  });
}

test('in the pseudo-locale, the converted screens show no untranslated text', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'dandori-academy-settings',
      JSON.stringify({ graphics: 'low', graphicsTuned: true, seenIntro: true, locale: 'pseudo' }),
    );
  });
  await page.goto('./');
  await expect(page.locator('.hero-title')).toContainText('⟦');
  expect(await untranslated(page)).toEqual([]);
  await page.locator('.mode-card').first().click();
  await expect(page.locator('.camp-day').first()).toContainText('⟦');
  expect(await untranslated(page)).toEqual([]);
  await page.locator('.mode-card, .tab').filter({ hasText: '⟦' }).nth(3).click();
  await expect(page.locator('h1')).toContainText('⟦');
  expect(await untranslated(page)).toEqual([]);
});
