# SocialHub Frontend

Angular foundation for the social media management & analytics platform.

- **Angular 21** (standalone components, signals)
- **Tailwind CSS 4** for styling
- Lazy-loaded, feature-based structure with a typed API layer

## Architecture

```
src/app
├── core/                singletons (provided in root)
│   ├── services/        ApiService (typed HttpClient wrapper), AuthService (signals)
│   ├── guards/          authGuard (placeholder — returns true)
│   └── interceptors/    authInterceptor (token placeholder), errorInterceptor
├── shared/              reusable, presentational pieces
│   ├── components/       PageHeader, StatCard
│   └── models/           typed interfaces mirroring backend DTOs
├── layout/              app shell: MainLayout (sidebar + topbar + outlet)
└── features/            lazy-loaded pages
    ├── dashboard/        page + DashboardStore (signal-based state pattern)
    ├── accounts/         lists backend providers
    ├── analytics/        placeholder
    ├── facebook/  instagram/  whatsapp/   platform placeholders
```

### Routing & lazy loading
`app.routes.ts` mounts every page under `MainLayout` and loads each feature with
`loadComponent` (its own bundle — confirmed in the build output). `authGuard`
gates the shell; it returns `true` for now (`TODO[SSO]`).

### HTTP layer
`ApiService` prefixes `environment.apiBaseUrl` and unwraps the backend
`ApiResponse<T>` envelope. Two functional interceptors are registered in
`app.config.ts`: `authInterceptor` (attaches a Bearer token once one exists) and
`errorInterceptor` (centralized error logging / 401 handling).

### State management
Service-based with **signals**. `DashboardStore` is the reference pattern: private
writable signals exposed read-only, derived `computed` view models, and
`loading`/`error` flags toggled around async loads. Provide a store at the feature
component (`providers: [...]`) or in root as it grows. Reach for a dedicated state
library only if cross-feature coordination demands it.

### Environments
`src/environments/environment.ts` (prod, `apiBaseUrl: /api/v1`) is swapped for
`environment.development.ts` (`http://localhost:8080/api/v1`) in the `development`
build via `fileReplacements` in `angular.json`. `ng serve` uses development.

## Adding a new feature

1. Create `features/<name>/<name>.ts` as a standalone component.
2. Add a lazy child route in `app.routes.ts` (`loadComponent`).
3. Add a nav entry in `layout/sidebar/sidebar.ts`.
4. Put data access in `core/services` or a feature service using `ApiService`;
   hold view state in a signal store like `DashboardStore`.

## Running locally

```bash
npm install
npm start          # ng serve → http://localhost:4200
```

Build: `npm run build`. The dev server points at the backend on
`http://localhost:8080`; start the backend (see `../../back/README.md`) for the
dashboard/accounts pages to load live data — they degrade gracefully otherwise.
# socialHubFont
