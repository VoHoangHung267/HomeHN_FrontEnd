import { expect, test } from '@playwright/test';
import { makeProfileStats, makeUser } from '../fixtures/data';
import { mockCommonShellApis } from '../fixtures/mock-api';
import { seedLoggedInUser } from '../fixtures/auth';

test.describe('Profile page', () => {
  test.beforeEach(async ({ page }) => {
    await seedLoggedInUser(page);
    await mockCommonShellApis(page);
  });

  test('route guard cho phep vao profile khi da dang nhap va tai du lieu', async ({ page }) => {
    await page.route('**/api/api/profile', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: makeUser({ fullName: 'Nguyen Van Test', phone: '0912345678' }),
        }),
      });
    });
    await page.route('**/api/api/profile/stats', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: makeProfileStats({ totalFavorites: 5, totalBookings: 2 }),
        }),
      });
    });

    await page.goto('/profile');

    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.locator('.profile-name')).toContainText('Nguyen Van Test');
    await expect(page.locator('.profile-email')).toContainText('playwright@example.com');
  });

  test('cap nhat thong tin ca nhan thanh cong', async ({ page }) => {
    await page.route('**/api/api/profile', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'OK',
            data: makeUser({ fullName: 'Playwright User', phone: '0900000000' }),
          }),
        });
        return;
      }

      const body = route.request().postDataJSON() as { fullName: string; phone: string };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: makeUser({ fullName: body.fullName, phone: body.phone }),
        }),
      });
    });
    await page.route('**/api/api/profile/stats', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: makeProfileStats() }),
      });
    });

    await page.goto('/profile');
    await page.locator('input[type="text"].form-control').first().fill('Nguyen Van Moi');
    await page.locator('input[type="tel"].form-control').fill('0911222333');
    await page.locator('.form-actions .btn.btn-primary').click();

    await expect(page.locator('.profile-name')).toContainText('Nguyen Van Moi');
    await expect(page.locator('input[type="tel"].form-control')).toHaveValue('0911222333');
  });

  test('doi mat khau thanh cong va reset form', async ({ page }) => {
    await page.route('**/api/api/profile', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: makeUser(),
        }),
      });
    });
    await page.route('**/api/api/profile/stats', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: makeProfileStats() }),
      });
    });
    await page.route('**/api/api/profile/password', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: null }),
      });
    });

    await page.goto('/profile');
    await page.locator('.profile-nav button').nth(1).click();

    const passwordInputs = page.locator('.profile-content input.form-control');
    await passwordInputs.nth(0).fill('OldPassword1!');
    await passwordInputs.nth(1).fill('NewPassword1!');
    await passwordInputs.nth(2).fill('NewPassword1!');
    await page.locator('.form-actions .btn.btn-primary').click();

    await expect(passwordInputs.nth(0)).toHaveValue('');
    await expect(passwordInputs.nth(1)).toHaveValue('');
    await expect(passwordInputs.nth(2)).toHaveValue('');
  });

  test('xem thong ke hoat dong', async ({ page }) => {
    await page.route('**/api/api/profile', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: makeUser(),
        }),
      });
    });
    await page.route('**/api/api/profile/stats', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: makeProfileStats({ totalFavorites: 11, totalAppointments: 3, totalBookings: 4 }),
        }),
      });
    });

    await page.goto('/profile');
    await page.locator('.profile-nav button').nth(2).click();

    const statNumbers = page.locator('.stat-box .stat-num');
    await expect(statNumbers.nth(0)).toContainText('11');
    await expect(statNumbers.nth(1)).toContainText('3');
    await expect(statNumbers.nth(2)).toContainText('4');
  });
});
