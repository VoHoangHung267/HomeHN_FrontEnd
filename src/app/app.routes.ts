import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'rooms', pathMatch: 'full' },

  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'rooms',
    loadChildren: () => import('./features/seeker/seeker.routes').then(m => m.SEEKER_ROUTES)
  },
  {
    path: 'landlord',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['LANDLORD', 'ADMIN'] },
    loadChildren: () => import('./features/landlord/landlord.routes').then(m => m.LANDLORD_ROUTES)
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadChildren: () => import('./features/chat/chat.routes').then(m => m.CHAT_ROUTES)
  },
  {
    path: 'bookings',
    canActivate: [authGuard],
    loadComponent: () => import('./features/bookings/my-bookings.component').then(m => m.MyBookingsComponent)
  },
  {
    path: 'bookings/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/bookings/booking-detail.component').then(m => m.BookingDetailComponent)
  },
  {
    path: 'appointments',
    canActivate: [authGuard],
    loadComponent: () => import('./features/appointments/my-appointments.component').then(m => m.MyAppointmentsComponent)
  },
  {
    path: 'reports/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/reports/report-detail.component').then(m => m.ReportDetailComponent)
  },

  // ✅ NEW ROUTES
  {
    path: 'map',
    loadComponent: () => import('./features/map/room-map.component').then(m => m.RoomMapComponent)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
  },

  { path: '**', redirectTo: 'rooms' }
];
