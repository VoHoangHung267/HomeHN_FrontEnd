import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
 
export const SEEKER_ROUTES: Routes = [
  { path: '',         loadComponent: () => import('./room-list/room-list.component').then(m => m.RoomListComponent) },
  { path: 'favorites',canActivate: [authGuard], loadComponent: () => import('./favorites/favorites.component').then(m => m.FavoritesComponent) },
  { path: ':id',      loadComponent: () => import('./room-detail/room-detail.component').then(m => m.RoomDetailComponent) },
];
 