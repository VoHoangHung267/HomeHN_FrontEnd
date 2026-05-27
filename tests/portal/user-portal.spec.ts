import { expect, test } from '@playwright/test';
import { makeAppointment, makeBooking, makeChatRoom, makeMessage, makeRoom, makeUser } from '../fixtures/data';
import { mockCommonShellApis } from '../fixtures/mock-api';
import { seedLoggedInUser } from '../fixtures/auth';

test.describe('User portal flows', () => {
  test.beforeEach(async ({ page }) => {
    await seedLoggedInUser(page);
    await mockCommonShellApis(page);
  });

  test('favorites render va bo yeu thich', async ({ page }) => {
    await page.route('**/api/api/rooms/favorites', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: [makeRoom(1, { favorited: true }), makeRoom(2, { favorited: true })],
        }),
      });
    });
    await page.route(/.*\/api\/api\/rooms\/\d+\/favorite$/, route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: { favorited: false } }),
      });
    });

    await page.goto('/rooms/favorites');
    await expect(page.locator('.room-card')).toHaveCount(2);
    await page.locator('.room-fav').first().click();
    await expect(page.locator('.room-card')).toHaveCount(1);
  });

  test('bookings page hien danh sach bookings cua seeker', async ({ page }) => {
    await page.route('**/api/api/bookings/my', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: [makeBooking(1), makeBooking(2, { roomTitle: 'Phong 2' })],
        }),
      });
    });

    await page.goto('/bookings');
    await expect(page.locator('.booking-item')).toHaveCount(2);
  });

  test('appointments page huy lich xem phong', async ({ page }) => {
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
    await page.route('**/api/api/appointments/1/cancel', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: makeAppointment(1, { status: 'CANCELLED' }),
        }),
      });
    });

    await page.goto('/appointments');
    await page.locator('.appointment-actions .btn.btn-outline').click();
    await page.locator('.toast-action-primary').click();

    await expect(page.locator('.status-badge.status-cancelled')).toContainText('Đã huỷ');
  });

  test('chat render, mo cuoc tro chuyen, tao appointment va booking trong chat', async ({ page }) => {
    await page.route('**/api/api/chat/my-chats', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: [makeChatRoom(1), makeChatRoom(2, { roomId: 2, roomTitle: 'Phong 2' })],
        }),
      });
    });
    await page.route('**/api/api/chat/1/messages', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: [
            makeMessage(1, { chatRoomId: 1, senderId: 101 }),
            makeMessage(2, { chatRoomId: 1, senderId: 1, senderName: 'Playwright User', content: 'Em quan tam phong nay' }),
          ],
        }),
      });
    });
    await page.route('**/api/api/appointments/my', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: [makeAppointment(1)] }),
      });
    });
    await page.route('**/api/api/bookings/my', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: [makeBooking(1, { status: 'PENDING_PAYMENT' })] }),
      });
    });
    await page.route('**/api/api/appointments/rooms/1', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: makeAppointment(3) }),
      });
    });
    await page.route('**/api/api/bookings/rooms/1', route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: makeBooking(3) }),
      });
    });

    await page.goto('/chat');
    await page.locator('.chat-item').first().click();
    await expect(page.locator('.message-row')).toHaveCount(2);

    await page.locator('input[type="datetime-local"]').fill('2026-06-01T10:00');
    await page.locator('.action-card textarea.form-control').first().fill('Hen xem phong');
    await page.locator('.action-card .btn.btn-primary.btn-block').first().click();
    await expect(page.locator('.action-section').first().locator('.item-list .item-card')).toHaveCount(2);

    await page.locator('.action-tabs button').nth(1).click();
    await page.locator('input[type="text"].form-control').first().fill('Nguyen Van A');
    await page.locator('input[type="tel"].form-control').fill('0911222333');
    await page.locator('input[type="date"].form-control').fill('2026-06-05');
    await page.locator('.action-section .btn.btn-primary.btn-block').click();
    await expect(page.locator('.action-section .item-list .item-card')).toHaveCount(2);
  });
});
