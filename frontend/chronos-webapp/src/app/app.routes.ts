import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'room/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./room/room.component').then((m) => m.RoomComponent),
  },
  {
    path: 'team/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./team/team.component').then((m) => m.TeamComponent),
  },
  {
    path: 'team/:id/invite/:token',
    canActivate: [authGuard],
    loadComponent: () => import('./team/team.component').then((m) => m.TeamComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
