import { expect, test } from '@playwright/test';
import { makeAdminStats, makeReport, makeReview, makeRoom, makeRoomsPage, makeUser } from '../fixtures/data';
import { mockCommonShellApis } from '../fixtures/mock-api';
import { seedLoggedInUser } from '../fixtures/auth';

test.describe('Admin flows', () => {
  test.beforeEach(async ({ page }) => {
    await seedLoggedInUser(page, { role: 'ADMIN' });
    await mockCommonShellApis(page);
    await page.addInitScript(() => {
      window.prompt = () => 'Ly do tu choi';
    });
  });

  test('admin dashboard duyet phong va tai user tab', async ({ page }) => {
    await page.route('**/api/api/admin/stats', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: makeAdminStats() }),
      });
    });
    await page.route('**/api/api/admin/rooms/pending', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: [makeRoom(1, { status: 'PENDING' })] }),
      });
    });
    await page.route('**/api/api/admin/rooms/1/approve', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: null }),
      });
    });
    await page.route('**/api/api/admin/users', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: [makeUser(), makeUser({ id: 2, email: 'b@example.com' })] }),
      });
    });

    await page.goto('/admin');
    await expect(page.locator('.admin-room-card')).toHaveCount(1);
    await page.locator('.admin-room-actions .btn.btn-primary.btn-sm').click();
    await expect(page.locator('.admin-room-card')).toHaveCount(0);

    await page.locator('.admin-tabs button').nth(1).click();
    await expect(page.locator('tbody tr')).toHaveCount(2);
  });

  test('admin room management xu ly room, report va review', async ({ page }) => {
    await page.route(/.*\/api\/api\/admin\/rooms\/all(\?.*)?$/, route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: makeRoomsPage([makeRoom(1), makeRoom(2)]),
        }),
      });
    });
    await page.route('**/api/api/admin/reports?status=PENDING', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: [makeReport(1)] }),
      });
    });
    await page.route('**/api/api/admin/reviews', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: [{ ...makeReview(1), roomId: 1, roomTitle: 'Studio gan truong' }],
        }),
      });
    });
    await page.route('**/api/api/admin/rooms/1/toggle-hidden', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: null }),
      });
    });
    await page.route('**/api/api/admin/reports/1/resolve', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: null }),
      });
    });
    await page.route('**/api/api/admin/reviews/1', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: null }),
      });
    });

    await page.goto('/admin/room-management');
    await expect(page.locator('tbody tr')).toHaveCount(2);
    await page.locator('tbody .btn.btn-warning').first().click();
    await expect(page.locator('tbody .btn.btn-outline').first()).toBeVisible();

    await page.locator('.header-tabs button').nth(1).click();
    await expect(page.locator('.report-card')).toHaveCount(1);
    await page.locator('.report-actions .btn.btn-outline.btn-sm').click();
    await page.locator('.form-control').last().fill('Da xu ly');
    await page.locator('.modal-actions .btn.btn-danger').click();
    await expect(page.locator('.report-card')).toHaveCount(0);

    await page.locator('.header-tabs button').nth(2).click();
    await expect(page.locator('.report-card')).toHaveCount(1);
    await page.locator('.report-actions .btn.btn-danger.btn-sm').click();
    await page.locator('.toast-action-primary').click();
    await expect(page.locator('.report-card')).toHaveCount(0);
  });
});
