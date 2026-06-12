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
      makeRoom(1, { title: 'Studio gần trường', ward: 'Nghĩa Đô' }),
      makeRoom(2, { title: 'Phòng trọ giá tốt', ward: 'Kim Liên' }),
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
    await expect(page.locator('.room-title').first()).toContainText('Studio gần trường');
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
    const rooms = [makeRoom(10, { title: 'Studio Nghĩa Đô cho sinh viên', ward: 'Nghĩa Đô' })];

    await page.route(/.*\/api\/api\/rooms(\?.*)?$/, async route => {
      const url = new URL(route.request().url());
      const keyword = url.searchParams.get('keyword');
      const data = keyword === 'studio nghĩa đô' ? makeRoomsPage(rooms) : makeRoomsPage([]);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data }),
      });
    });

    await page.goto('/rooms');
    await page.locator('.search-input').fill('studio nghĩa đô');
    await page.locator('.hero .btn.btn-primary').click();

    await expect(page.locator('.room-card')).toHaveCount(1);
    await expect(page.locator('.room-title').first()).toContainText('Studio Nghĩa Đô');
  });

  test('AI search ap dung bo loc va hien ket qua phu hop', async ({ page }) => {
    const rooms = [makeRoom(20, { title: 'Studio full nội thất', ward: 'Nghĩa Đô', price: 3900000 })];

    await page.route('**/api/api/rooms/ai/parse-search', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: {
            ward: 'Nghĩa Đô',
            maxPrice: 4000000,
            roomType: 'STUDIO',
            isFurnished: true,
            sortBy: 'createdAt',
            note: 'Đã áp dụng bộ lọc AI',
          },
        }),
      });
    });

    await page.route(/.*\/api\/api\/rooms(\?.*)?$/, async route => {
      const url = new URL(route.request().url());
      const ward = url.searchParams.get('ward');
      const roomType = url.searchParams.get('roomType');
      const maxPrice = url.searchParams.get('maxPrice');
      const isFurnished = url.searchParams.get('isFurnished');
      const matched = ward === 'Nghĩa Đô' && roomType === 'STUDIO' && maxPrice === '4000000' && isFurnished === 'true';

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
    await page.locator('.ai-search-input').fill('Cần phòng dưới 4 triệu ở Nghĩa Đô, có nội thất');
    await page.locator('.ai-search-actions .btn.btn-primary').click();

    await expect(page.locator('.room-card')).toHaveCount(1);
    await expect(page.locator('.room-title').first()).toContainText('Studio full nội thất');
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
