import { expect, test, type Page } from '@playwright/test';

/** The title screen waits for any key; press one to reach the main menu. */
async function passTitle(page: Page): Promise<void> {
  await expect(page.locator('.title-screen')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('.title-screen')).toHaveCount(0);
}

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
  await passTitle(page);
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

test('a challenge day can be watched again as a replay', async ({ page }) => {
  const errors = await freshPlayer(page);
  await page.locator('.mode-card', { hasText: 'Challenges' }).click();
  await page.getByRole('button', { name: 'Treasure Hunt' }).click();
  await page.getByRole('button', { name: /Scattered Light/ }).click();
  await inDay(page);
  await page.waitForTimeout(3000);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /End the day now/ }).click();
  await page.getByRole('button', { name: 'Watch the replay' }).click();
  await expect(page.getByRole('toolbar', { name: 'Replay controls' })).toBeVisible();
  await page.getByRole('button', { name: '8×' }).click();
  await expect(page.locator('.replay-time')).not.toContainText('0:00 /', { timeout: 20_000 });
  await page.getByRole('button', { name: 'Leave' }).click();
  await expect(page.getByRole('button', { name: 'Treasure Hunt' })).toBeVisible();
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
  await passTitle(page);
  await page.locator('.mode-card', { hasText: 'Challenges' }).click();
  await page.getByRole('button', { name: 'Treasure Hunt' }).click();
  await page.getByRole('button', { name: /Scattered Light/ }).click();
  await inDay(page);
});

test('two browsers can play a battle online, in step', async ({ browser }) => {
  // The relay, kept in memory: the two pages find each other through it, then talk directly.
  const topics = new Map<string, string[]>();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.route('https://ntfy.sh/**', async (route) => {
    const url = new URL(route.request().url());
    const [topic, rest] = url.pathname.slice(1).split('/');
    const headers = { 'access-control-allow-origin': '*' };
    if (route.request().method() === 'POST') {
      topics.set(topic, [...(topics.get(topic) ?? []), route.request().postData() ?? '']);
      await route.fulfill({ status: 200, headers, body: '{}' });
    } else if (rest === 'json') {
      const lines = (topics.get(topic) ?? []).map((message) =>
        JSON.stringify({ event: 'message', topic, message }),
      );
      await route.fulfill({ status: 200, headers, body: lines.join('\n') });
    } else await route.fulfill({ status: 200, headers, body: '' });
  });
  const host = await context.newPage();
  const guest = await context.newPage();
  const errors: string[] = [];
  for (const page of [host, guest]) {
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.addInitScript(() => {
      localStorage.setItem(
        'dandori-academy-settings',
        JSON.stringify({
          graphics: 'low',
          graphicsTuned: true,
          seenIntro: true,
          commentary: false,
        }),
      );
    });
    await page.goto('./');
    await passTitle(page);
    await page.locator('.mode-card', { hasText: 'Battles' }).click();
  }
  await host.getByRole('button', { name: 'Host a room' }).click();
  const code = (await host.locator('.room-code-shown').textContent({ timeout: 20_000 })) ?? '';
  await guest.getByPlaceholder('Room code').fill(code);
  await guest.getByRole('button', { name: 'Join' }).click();
  await expect(host.getByText(/Connected\. Pick the race/)).toBeVisible({ timeout: 60_000 });
  await host.locator('button.lesson').first().click();
  for (const page of [host, guest]) {
    await expect(page.getByRole('button', { name: /Begin the day/ })).toBeVisible({
      timeout: 30_000,
    });
  }
  await host.getByRole('button', { name: /Begin the day/ }).click();
  await guest.getByRole('button', { name: /Begin the day/ }).click();
  for (const page of [host, guest]) {
    await expect(page.getByRole('button', { name: /^Pause/ })).toBeVisible();
  }
  await host.waitForTimeout(8000);
  for (const page of [host, guest]) {
    await expect(page.locator('.net-status', { hasText: 'Out of step' })).toHaveCount(0);
    await expect(page.locator('.net-status', { hasText: 'left' })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
  await context.close();
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
  await expect(page.locator('.title-logo')).toContainText('⟦');
  expect(await untranslated(page)).toEqual([]);
  await passTitle(page);
  await expect(page.locator('.hero-title')).toContainText('⟦');
  expect(await untranslated(page)).toEqual([]);
  await page.locator('.mode-card').first().click();
  await expect(page.locator('.camp-day').first()).toContainText('⟦');
  expect(await untranslated(page)).toEqual([]);
  await page.locator('.mode-card, .tab').filter({ hasText: '⟦' }).nth(3).click();
  await expect(page.locator('h1')).toContainText('⟦');
  expect(await untranslated(page)).toEqual([]);
});
