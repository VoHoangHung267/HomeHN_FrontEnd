import { expect, test } from '@playwright/test';
import { mockCommonShellApis } from '../fixtures/mock-api';
import { makeUser } from '../fixtures/data';

test.describe('Auth flows', () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonShellApis(page);
  });

  test('dang ky gui ma xac thuc va submit thanh cong', async ({ page }) => {
    await page.route('**/api/api/auth/check-email*', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: { exists: false } }),
      });
    });
    await page.route('**/api/api/auth/send-verification-code', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Da gui ma', data: null }),
      });
    });
    await page.route('**/api/api/auth/register', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Dang ky thanh cong',
          data: {
            accessToken: 'token',
            refreshToken: 'refresh',
            tokenType: 'Bearer',
            user: makeUser(),
          },
        }),
      });
    });

    await page.goto('/auth/register');
    await page.locator('input[name="fullName"]').fill('Nguyen Van A');
    await page.locator('input[name="email"]').fill('new@example.com');
    await page.locator('input[name="email"]').blur();
    await page.locator('.auth-actions .btn').click();
    await page.locator('input[name="verificationCode"]').fill('123456');
    await page.locator('input[name="phone"]').fill('0911222333');
    await page.locator('input[name="password"]').fill('Password1!');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/rooms$/);
  });

  test('quen mat khau gui request thanh cong', async ({ page }) => {
    await page.route('**/api/api/auth/forgot-password', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Da gui email', data: null }),
      });
    });

    await page.goto('/auth/forgot-password');
    await page.locator('input[name="email"]').fill('playwright@example.com');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('.toast-item')).toBeVisible();
  });

  test('dat lai mat khau bang token hop le', async ({ page }) => {
    await page.route('**/api/api/auth/reset-password', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Dat lai mat khau thanh cong', data: null }),
      });
    });

    await page.goto('/auth/reset-password?token=abc123');
    await page.locator('input[name="newPassword"]').fill('NewPassword1!');
    await page.locator('input[name="confirmPassword"]').fill('NewPassword1!');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/auth\/login$/);
  });
});
