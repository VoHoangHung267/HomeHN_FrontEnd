import type { Page, Route } from '@playwright/test';
import { apiResponse } from './data';

function json(route: Route, data: unknown, status = 200, message = 'OK') {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(apiResponse(data, message)),
  });
}

export async function mockCommonShellApis(page: Page): Promise<void> {
  await page.route('**/api/api/notifications/unread-count', route => json(route, 0));
  await page.route('**/api/api/notifications', route => json(route, []));
  await page.route('**/api/api/notifications/read-all', route => json(route, null));
  await page.route(/.*\/api\/api\/notifications\/\d+\/read$/, route => json(route, null));
  await page.route(/.*\/api\/api\/ws\/info.*/, route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        websocket: false,
        cookie_needed: false,
        origins: ['*:*'],
        entropy: 12345,
      }),
    });
  });
  await page.route(/.*\/api\/api\/ws\/.*/, route => {
    return route.fulfill({
      status: 204,
      contentType: 'text/plain',
      body: '',
    });
  });
}

export async function mockEmptyReviews(page: Page, roomId: number): Promise<void> {
  await page.route(`**/api/api/reviews/room/${roomId}`, route => json(route, []));
  await page.route(`**/api/api/reviews/room/${roomId}/my-review`, route => json(route, null));
}
