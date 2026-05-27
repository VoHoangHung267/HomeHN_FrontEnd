import { expect, test } from '@playwright/test';

test.describe('Login screen', () => {
  test('mo duoc trang dang nhap', async ({ page }) => {
    await page.goto('/auth/login');

    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('route can bao ve profile khi chua dang nhap', async ({ page }) => {
    await page.goto('/profile');

    await expect(page).toHaveURL(/\/auth\/login$/);
  });
});
