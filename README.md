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
`environment.development.ts` (`http://localhost:8081/api/v1`) in the `development`
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
`http://localhost:8081`; start the backend (see `../../back/README.md`) for the
dashboard/accounts pages to load live data — they degrade gracefully otherwise.

## Add Post Media Flow

The Add Post page opens the form directly and lets users choose one or more
platform/account targets inside the form:

- Users can select the same platform multiple times when each row uses a
  different connected account.
- Duplicate platform/account combinations are blocked before saving.
- Saving creates one draft per selected platform/account combination, so the
  post list shows account-specific rows that can be scheduled independently.
- Users can drag/drop multiple images/videos, choose multiple files from their
  device, or attach multiple existing uploaded Media Library items.
- New files upload once to Google Drive through the Media Library API, then the
  resulting `mediaAssetIds` are attached to every generated draft in selection
  order.
- Existing Media Library items are attached directly to every generated draft
  without a duplicate upload.
- The page shows compact local previews, authenticated blob previews for library
  thumbnails, save/upload progress, and upload failure state while keeping
  `status` and `scheduledAt` out of the Add Post workflow.

## Bulk Upload Templates

The bulk-upload area on Add Post now supports:

- downloading either `.xlsx` or `.csv` templates
- uploading `.xlsx` or `.csv` files
- row-level validation errors returned by the API
- downloading a generated CSV error report when some rows fail

Supported media columns in the template are `imageUrl`, `videoUrl`, and
`googleDriveUrl`. A row can include multiple media URLs by separating values with
semicolons, commas, or new lines. Public URLs are imported into the Media Library;
Google Drive URLs must be accessible through the connected Drive account.

## Scheduled Publishing Status Flow

The post-management and schedules UI now reflect the safer publish lifecycle:

- schedule create/edit uses a three-step drawer: basic info, posting time, and
  review/save; it no longer contains post selection
- schedules no longer select one posting account for the whole schedule; each
  selected post keeps the platform/account chosen in the Add Post flow
- posts are added to schedules only from the Add Post list, where only
  unscheduled Draft posts are selectable
- Posted rows expose a Clone action in the Add Post list; cloning creates a new
  Draft row and keeps the original posted history unchanged
- Schedule View shows only waiting/not-yet-posted rows and provides actions to
  remove a post from the schedule or set/clear a custom posting time for that
  post only
- posting time is loaded from the saved schedule and is not reinitialized while
  the editor remains open
- custom schedules expose an hourly interval so multiple linked posts publish
  sequentially across the day
- all schedule types display linked posts in sequential publish order rather than
  publishing multiple posts at the same timestamp
- scheduled drafts move to `Pending`
- the worker moves claimed posts to `Processing`
- completed publishes become `Posted`
- failures stay `Failed` with retry metadata from the API

Failed posts now expose a `Retry Now` action from the post-management view, and
all displayed publish/schedule timestamps continue to use the browser's local
timezone through Angular date pipes while the backend stores UTC instants.
# socialHubFont
