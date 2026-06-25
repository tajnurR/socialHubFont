import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { MainLayout } from './layout/main-layout/main-layout';

/**
 * Top-level routing.
 *
 * All app pages live under the shell ({@link MainLayout}) and are lazy-loaded
 * via `loadComponent`. Add a new feature by creating its standalone component
 * and registering a lazy child route here.
 */
export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'accounts',
        loadComponent: () => import('./features/accounts/accounts').then((m) => m.Accounts),
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/analytics/analytics').then((m) => m.Analytics),
      },
      {
        path: 'facebook',
        loadComponent: () => import('./features/facebook/facebook').then((m) => m.Facebook),
      },
      {
        path: 'instagram',
        loadComponent: () => import('./features/instagram/instagram').then((m) => m.Instagram),
      },
      {
        path: 'whatsapp',
        loadComponent: () => import('./features/whatsapp/whatsapp').then((m) => m.Whatsapp),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
