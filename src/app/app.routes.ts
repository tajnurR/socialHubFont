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
    path: 'login',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register').then((m) => m.Register),
  },
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
        loadChildren: () =>
          import('./features/facebook/facebook.routes').then((m) => m.FACEBOOK_ROUTES),
      },
      {
        path: 'posts/bulk-upload',
        loadComponent: () => import('./features/publishing/bulk-upload').then((m) => m.BulkUpload),
      },
      {
        path: 'posts/drafts',
        loadComponent: () => import('./features/publishing/drafts').then((m) => m.Drafts),
      },
      {
        path: 'posts/monitor',
        loadComponent: () =>
          import('./features/publishing/posts-monitor').then((m) => m.PostsMonitor),
      },
      {
        path: 'schedules',
        loadComponent: () => import('./features/schedules/schedules').then((m) => m.Schedules),
      },
      {
        path: 'schedules/:id',
        loadComponent: () =>
          import('./features/schedules/schedule-details').then((m) => m.ScheduleDetails),
      },
      {
        path: 'products',
        loadComponent: () => import('./features/publishing/products').then((m) => m.Products),
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
