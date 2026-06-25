import { Routes } from '@angular/router';

/** Facebook feature routes (lazy-loaded): connected pages list + per-page analytics. */
export const FACEBOOK_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./facebook-pages').then((m) => m.FacebookPages),
  },
  {
    path: ':integrationId/analytics',
    loadComponent: () => import('./facebook-analytics').then((m) => m.FacebookAnalytics),
  },
];
