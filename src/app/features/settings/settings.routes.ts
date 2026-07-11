import { Routes } from '@angular/router';

/**
 * Settings feature routes (lazy-loaded). Add future settings pages here.
 * Route params (`:id`) are bound to component inputs via withComponentInputBinding.
 */
export const SETTINGS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'social-integrations' },
  {
    path: 'social-integrations',
    loadComponent: () =>
      import('./social-integrations/integrations-list').then((m) => m.IntegrationsList),
  },
  {
    path: 'social-integrations/add',
    loadComponent: () =>
      import('./social-integrations/add-integration').then((m) => m.AddIntegration),
  },
  {
    path: 'social-integrations/storage-drive',
    loadComponent: () =>
      import('./social-integrations/storage-drive-integrations').then(
        (m) => m.StorageDriveIntegrations,
      ),
  },
  {
    path: 'social-integrations/instagram',
    loadComponent: () =>
      import('./social-integrations/instagram-integrations').then((m) => m.InstagramIntegrations),
  },
  {
    path: 'social-integrations/:id/posts/new',
    loadComponent: () => import('./social-integrations/new-post').then((m) => m.NewPost),
  },
];
