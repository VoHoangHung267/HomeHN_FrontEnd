import { expect, test } from '@playwright/test';
import { makeRoom, makeRoomsPage } from '../fixtures/data';
import { mockCommonShellApis } from '../fixtures/mock-api';
import { seedLoggedInUser } from '../fixtures/auth';

test.describe('Room list', () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonShellApis(page);
  });

  test('hien thi danh sach phong va redirect tu root', async ({ page }) => {
    const rooms = [
      makeRoom(1, { title: 'Studio gan truong', district: 'Cau Giay' }),
      makeRoom(2, { title: 'Phong tro gia tot', district: 'Dong Da' }),
    ];

    await page.route(/.*\/api\/api\/rooms(\?.*)?$/, route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: makeRoomsPage(rooms),
        }),
      });
    });

    await page.goto('/');

    await expect(page).toHaveURL(/\/rooms$/);
    await expect(page.locator('.room-card')).toHaveCount(2);
    await expect(page.locator('.room-title').first()).toContainText('Studio gan truong');
  });

  test('chi hien dung so phong cua tung trang khi API tra ve full list', async ({ page }) => {
    const rooms = Array.from({ length: 15 }, (_, index) =>
      makeRoom(index + 1, { title: `Phong ${index + 1}` })
    );

    await page.route(/.*\/api\/api\/rooms(\?.*)?$/, async route => {
      const url = new URL(route.request().url());
      const pageIndex = Number(url.searchParams.get('page') ?? '0');
      const size = Number(url.searchParams.get('size') ?? '12');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: {
            content: rooms,
            totalElements: rooms.length,
            totalPages: Math.ceil(rooms.length / size),
            number: pageIndex,
            size,
          },
        }),
      });
    });

    await page.goto('/rooms');
    await expect(page.locator('.room-card')).toHaveCount(12);
    await expect(page.locator('.room-title').first()).toContainText('Phong 1');

    await page.locator('.pagination button').nth(2).click();
    await expect(page.locator('.room-card')).toHaveCount(3);
    await expect(page.locator('.room-title').first()).toContainText('Phong 13');
  });

  test('loc theo tu khoa o thanh tim kiem', async ({ page }) => {
    const rooms = [makeRoom(10, { title: 'Studio Cau Giay cho sinh vien', district: 'Cau Giay' })];

    await page.route(/.*\/api\/api\/rooms(\?.*)?$/, async route => {
      const url = new URL(route.request().url());
      const keyword = url.searchParams.get('keyword');
      const data = keyword === 'studio cau giay' ? makeRoomsPage(rooms) : makeRoomsPage([]);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data }),
      });
    });

    await page.goto('/rooms');
    await page.locator('.search-input').fill('studio cau giay');
    await page.locator('.hero .btn.btn-primary').click();

    await expect(page.locator('.room-card')).toHaveCount(1);
    await expect(page.locator('.room-title').first()).toContainText('Studio Cau Giay');
  });

  test('AI search ap dung bo loc va hien ket qua phu hop', async ({ page }) => {
    const rooms = [makeRoom(20, { title: 'Studio full noi that', district: 'Cau Giay', price: 3900000 })];

    await page.route('**/api/api/rooms/ai/parse-search', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: {
            district: 'Cau Giay',
            maxPrice: 4000000,
            roomType: 'STUDIO',
            isFurnished: true,
            sortBy: 'createdAt',
            note: 'Da ap dung bo loc AI',
          },
        }),
      });
    });

    await page.route(/.*\/api\/api\/rooms(\?.*)?$/, async route => {
      const url = new URL(route.request().url());
      const district = url.searchParams.get('district');
      const roomType = url.searchParams.get('roomType');
      const maxPrice = url.searchParams.get('maxPrice');
      const isFurnished = url.searchParams.get('isFurnished');
      const matched = district === 'Cau Giay' && roomType === 'STUDIO' && maxPrice === '4000000' && isFurnished === 'true';

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: matched ? makeRoomsPage(rooms) : makeRoomsPage([]),
        }),
      });
    });

    await page.goto('/rooms');
    await page.locator('.ai-search-input').fill('Can phong duoi 4 trieu o Cau Giay, co noi that');
    await page.locator('.ai-search-actions .btn.btn-primary').click();

    await expect(page.locator('.room-card')).toHaveCount(1);
    await expect(page.locator('.room-title').first()).toContainText('Studio full noi that');
  });

  test('yeu thich khi chua dang nhap se chuyen sang trang login', async ({ page }) => {
    await page.route(/.*\/api\/api\/rooms(\?.*)?$/, route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: makeRoomsPage([makeRoom(1)]),
        }),
      });
    });

    await page.goto('/rooms');
    await page.locator('.room-fav').first().click();

    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test('nguoi dung da dang nhap co the toggle yeu thich', async ({ page }) => {
    await seedLoggedInUser(page);

    let favorited = false;
    await page.route(/.*\/api\/api\/rooms(\?.*)?$/, route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: makeRoomsPage([makeRoom(1, { favorited })]),
        }),
      });
    });
    await page.route('**/api/api/rooms/1/favorite', route => {
      favorited = true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: { favorited: true } }),
      });
    });

    await page.goto('/rooms');
    const favoriteButton = page.locator('.room-fav').first();
    const before = await favoriteButton.textContent();
    await favoriteButton.click();

    await expect.poll(async () => await favoriteButton.textContent()).not.toBe(before);
  });
});
