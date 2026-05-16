import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-dashboard.component').then(m => m.AdminDashboardComponent)
  },
  {
    path: 'room-management',
    loadComponent: () =>
      import('./room-management/admin-room-management.component')
        .then(m => m.AdminRoomManagementComponent)
  }
];