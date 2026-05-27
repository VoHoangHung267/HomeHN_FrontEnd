import { expect, test } from '@playwright/test';
import { makeReport, makeRoom, makeRoomsPage } from '../fixtures/data';
import { mockCommonShellApis } from '../fixtures/mock-api';
import { seedLoggedInUser } from '../fixtures/auth';

test.describe('Map and report pages', () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonShellApis(page);
  });

  test('map page render room list va filter', async ({ page }) => {
    await page.route(/.*\/api\/api\/rooms(\?.*)?$/, route => {
      const url = new URL(route.request().url());
      const district = url.searchParams.get('district');
      const data = district
        ? makeRoomsPage([makeRoom(2, { district, latitude: 21.03, longitude: 105.8 })])
        : makeRoomsPage([
            makeRoom(1, { district: 'Cau Giay', latitude: 21.028, longitude: 105.804 }),
            makeRoom(2, { district: 'Dong Da', latitude: 21.03, longitude: 105.8 }),
          ]);

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data }),
      });
    });

    await page.goto('/map');
    await expect(page.locator('.room-item')).toHaveCount(2);
    await page.locator('select.form-control').first().selectOption({ index: 1 });
    await page.locator('.filter-btns .btn.btn-primary').click();
    await expect(page.locator('.room-item')).toHaveCount(1);
  });

  test('landlord response tren report detail', async ({ page }) => {
    await seedLoggedInUser(page, { role: 'LANDLORD' });
    await page.route('**/api/api/reports/1', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: makeReport(1, { status: 'REVIEWED' }),
        }),
      });
    });
    await page.route('**/api/api/reports/1/landlord-response', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: makeReport(1, {
            status: 'REVIEWED',
            landlordResponseType: 'WILL_FIX',
            landlordResponseNote: 'Toi se sua lai thong tin',
            landlordRespondedAt: '2026-05-27T11:00:00.000Z',
          }),
        }),
      });
    });

    await page.goto('/reports/1');
    await page.locator('.choice-btn').first().click();
    await page.locator('.response-textarea').fill('Toi se sua lai thong tin');
    await page.locator('.btn.btn-primary').last().click();

    await expect(page.locator('.body-text').last()).toContainText('Toi se sua lai thong tin');
  });
});
