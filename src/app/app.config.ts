import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // ← thêm
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor'; // ← đường dẫn đúng chưa?

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])), // ← thêm dòng này
  ]
};