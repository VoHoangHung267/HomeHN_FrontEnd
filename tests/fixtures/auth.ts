import type { Page } from '@playwright/test';
import { makeUser } from './data';

type Role = 'ADMIN' | 'LANDLORD' | 'SEEKER';

interface LoginSeedOptions {
  role?: Role;
  accessToken?: string;
  refreshToken?: string;
}

export async function seedLoggedInUser(page: Page, options: LoginSeedOptions = {}): Promise<void> {
  const role = options.role ?? 'SEEKER';
  const user = makeUser({ role });

  await page.addInitScript(([accessToken, refreshToken, user]) => {
    window.localStorage.setItem('accessToken', accessToken);
    window.localStorage.setItem('refreshToken', refreshToken);
    window.localStorage.setItem('user', JSON.stringify(user));
  }, [
    options.accessToken ?? 'playwright-access-token',
    options.refreshToken ?? 'playwright-refresh-token',
    user,
  ] as const);
}
