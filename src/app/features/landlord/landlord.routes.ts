import { Routes } from '@angular/router';
export const LANDLORD_ROUTES: Routes = [
  { path: '',             loadComponent: () => import('./dashboard/landlord-dashboard.component').then(m => m.LandlordDashboardComponent) },
  { path: 'rooms/new',    loadComponent: () => import('./room-form/room-form.component').then(m => m.RoomFormComponent) },
  { path: 'rooms/:id/edit', loadComponent: () => import('./room-form/room-form.component').then(m => m.RoomFormComponent) },
];