import { test, expect } from '@playwright/test';

test('converter page matches baseline', async ({ page }) => {
  await page.goto('/jk3-to-jk2/');

  // Accessibility-tree snapshot first: it's resilient to font-rendering /
  // anti-aliasing noise that would otherwise show up as a pixel diff in the
  // screenshot below, so it catches structural/semantic regressions (e.g. a
  // heading losing its role, a button's accessible name changing) even when
  // pixels are unaffected, and vice versa.
  await expect(page).toMatchAriaSnapshot({ name: 'converter-page.aria.yml' });

  await expect(page).toHaveScreenshot('converter-page.png', { fullPage: true });
});

test('landing page matches baseline', async ({ page }) => {
  await page.goto('/');

  await expect(page).toMatchAriaSnapshot({ name: 'landing-page.aria.yml' });

  await expect(page).toHaveScreenshot('landing-page.png', { fullPage: true });
});
