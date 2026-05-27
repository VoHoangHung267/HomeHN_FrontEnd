import { expect, test, type Page } from '@playwright/test';
import { makeBooking, makeReview, makeRoom } from '../fixtures/data';
import { mockCommonShellApis, mockEmptyReviews } from '../fixtures/mock-api';
import { seedLoggedInUser } from '../fixtures/auth';

test.describe('Room detail', () => {
  async function mockRoomApis(page: Page) {
    const room = makeRoom(1, {
      title: 'Studio gan truong',
      description: 'Phong dep, gan truong va co noi that day du',
      landlordName: 'Chu nha HN',
      landlordPhone: '0911222333',
      district: 'Cau Giay',
    });
    const recommendations = [
      makeRoom(2, { title: 'Phong tuong tu 1' }),
      makeRoom(3, { title: 'Phong tuong tu 2' }),
    ];

    await page.route('**/api/api/rooms/1', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: room }),
      });
    });
    await page.route('**/api/api/rooms/1/recommendations', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: recommendations }),
      });
    });

    return { room };
  }

  test.beforeEach(async ({ page }) => {
    await mockCommonShellApis(page);
  });

  test('hien thi chi tiet phong, gallery va goi y', async ({ page }) => {
    await mockRoomApis(page);
    await mockEmptyReviews(page, 1);

    await page.goto('/rooms/1');

    await expect(page.locator('.room-name')).toContainText('Studio gan truong');
    await expect(page.locator('.gallery-thumbs .thumb')).toHaveCount(2);
    await expect(page.locator('.recommendation-item')).toHaveCount(2);
    await expect(page.locator('.landlord-name')).toContainText('Chu nha HN');
  });

  test('bao ve cac hanh dong dat phong khi chua dang nhap', async ({ page }) => {
    await mockRoomApis(page);
    await mockEmptyReviews(page, 1);

    await page.goto('/rooms/1');
    await page.locator('.booking-cta').click();

    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test('gui bao cao tin dang thanh cong', async ({ page }) => {
    await seedLoggedInUser(page);
    await mockRoomApis(page);
    await mockEmptyReviews(page, 1);
    await page.route('**/api/api/rooms/1/report', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: null }),
      });
    });

    await page.goto('/rooms/1');
    await page.locator('.report-card .btn-text.danger').click();
    await page.locator('input[name="reason"]').first().check();
    await page.locator('.modal-actions .btn.btn-danger').click();

    await expect(page.locator('.report-success')).toBeVisible();
  });

  test('dat lich xem phong thanh cong', async ({ page }) => {
    await seedLoggedInUser(page);
    await mockRoomApis(page);
    await mockEmptyReviews(page, 1);
    await page.route('**/api/api/appointments/rooms/1', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: {
            id: 91,
            roomId: 1,
            roomTitle: 'Studio gan truong',
            roomPrimaryImage: '',
            seekerId: 1,
            seekerName: 'Playwright User',
            seekerPhone: '0900000000',
            landlordId: 101,
            landlordName: 'Chu nha HN',
            requestedAt: '2026-06-01T10:00:00',
            message: 'Cho minh hen buoi toi',
            landlordNote: '',
            status: 'PENDING',
            createdAt: '2026-05-27T10:00:00.000Z',
          },
        }),
      });
    });

    await page.goto('/rooms/1');
    await page.locator('.contact-actions .btn.btn-outline').nth(1).click();
    await page.locator('input[type="datetime-local"]').fill('2026-06-01T10:00');
    await page.locator('.modal-box textarea.form-control').fill('Cho minh hen buoi toi');
    await page.locator('.modal-actions .btn.btn-primary').click();

    await expect(page.locator('.report-success')).toBeVisible();
  });

  test('gui yeu cau thue phong va chuyen sang booking detail', async ({ page }) => {
    await seedLoggedInUser(page);
    await mockRoomApis(page);
    await mockEmptyReviews(page, 1);
    await page.route('**/api/api/bookings/rooms/1', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: makeBooking(501) }),
      });
    });
    await page.route('**/api/api/bookings/501', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: makeBooking(501) }),
      });
    });
    await page.route('**/api/api/bookings/501/adjustments', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: [] }),
      });
    });

    await page.goto('/rooms/1');
    await page.locator('.booking-cta').click();
    await page.locator('.modal-actions .btn.btn-primary').click();

    await expect(page).toHaveURL(/\/bookings\/501$/);
    await expect(page.locator('.section-header h1')).toContainText('Studio gan truong');
  });

  test('nguoi thue co the gui danh gia moi', async ({ page }) => {
    await seedLoggedInUser(page);
    await mockRoomApis(page);

    let currentReviews = [makeReview(1)];
    await page.route('**/api/api/reviews/room/1/my-review', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: null }),
      });
    });
    await page.route('**/api/api/reviews/room/1', route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'OK', data: currentReviews }),
        });
      }

      const createdReview = makeReview(99, {
        reviewerId: 1,
        reviewerName: 'Playwright User',
        comment: 'Phong tot va sach se',
      });
      currentReviews = [createdReview, ...currentReviews];

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: createdReview,
        }),
      });
    });

    await page.goto('/rooms/1');
    await page.locator('.review-form-card .btn.btn-outline.btn-sm').click();
    await page.locator('.review-form-card .star-btn').nth(4).click();
    await page.locator('.review-textarea').fill('Phong tot va sach se');
    await page.locator('.review-form-btns .btn.btn-primary.btn-sm').click();

    await expect(page.locator('.my-review-card')).toBeVisible();
    await expect(page.locator('.my-review-card .review-comment')).toContainText('Phong tot va sach se');
  });
});
