import { expect, test } from '@playwright/test';
import { makeAppointment, makeRoom, makeUser } from '../fixtures/data';
import { mockCommonShellApis } from '../fixtures/mock-api';
import { seedLoggedInUser } from '../fixtures/auth';

test.describe('Landlord flows', () => {
  test.beforeEach(async ({ page }) => {
    await seedLoggedInUser(page, { role: 'LANDLORD' });
    await mockCommonShellApis(page);
  });

  test('dashboard render rooms va appointments, hide room', async ({ page }) => {
    await page.route('**/api/api/rooms/my-rooms', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: [makeRoom(1, { status: 'ACTIVE' }), makeRoom(2, { status: 'PENDING' })],
        }),
      });
    });
    await page.route('**/api/api/appointments/my', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: [makeAppointment(1, { status: 'PENDING' })],
        }),
      });
    });
    await page.route('**/api/api/rooms/1/status?status=HIDDEN', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: makeRoom(1, { status: 'HIDDEN' }),
        }),
      });
    });

    await page.goto('/landlord');
    await expect(page.locator('.stat-card .stat-num').nth(0)).toContainText('2');
    await page.locator('tbody tr').first().locator('button.btn.btn-ghost.btn-sm').click();
    await page.locator('.toast-action-primary').click();
    await expect(page.locator('tbody .status-badge.status-hidden').first()).toBeVisible();
  });

  test('room form tao phong moi bang mock API', async ({ page }) => {
    await page.route('**/api/api/rooms', route => {
      if (route.request().method() !== 'POST') {
        return route.fallback();
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: makeRoom(99, { id: 99 }),
        }),
      });
    });
    await page.route('**/api/api/rooms/99/images', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: null }),
      });
    });

    await page.goto('/landlord/rooms/new');
    await page.locator('input[name="title"]').fill('Phong moi');
    await page.locator('input[name="price"]').fill('4500000');
    await page.locator('input[name="area"]').fill('28');
    await page.locator('select[name="district"]').selectOption({ index: 1 });
    await page.locator('input[name="address"]').fill('12 Nguyen Trai');
    await page.locator('input[name="city"]').fill('Ha Noi');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/landlord$/);
  });
});
