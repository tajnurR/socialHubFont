/**
 * Single source of truth for every backend API endpoint path.
 *
 * Paths are **relative** to `environment.apiBaseUrl` (e.g.
 * `http://localhost:8080/api/v1`) — the base URL is never hardcoded here.
 *
 * Use `:param` tokens for path parameters and pass values via
 * `ApiRequestOptions.pathParams` (see `ApiService`). Reference endpoints only
 * through this enum — never as inline strings.
 */
export enum ApiEndpoint {
  // --- Auth ---
  AUTH_LOGIN = '/auth/login',
  AUTH_REGISTER = '/auth/register',
  AUTH_REFRESH = '/auth/refresh',
  AUTH_LOGOUT = '/auth/logout',
  AUTH_ME = '/auth/me',

  // --- Tenant / organizations ---
  ORGANIZATIONS = '/organizations',
  ORGANIZATION_BY_ID = '/organizations/:id',

  // --- Integrations ---
  INTEGRATION_PROVIDERS = '/integrations/providers',
  INTEGRATIONS = '/integrations',
  INTEGRATION_BY_ID = '/integrations/:id',
  INTEGRATION_POSTS = '/integrations/:id/posts',
  INTEGRATION_REAUTH = '/integrations/:id/reauth',
  FACEBOOK_OAUTH_EXCHANGE = '/integrations/facebook/oauth/exchange',
  FACEBOOK_OAUTH_CONNECT = '/integrations/facebook/connect',
  FACEBOOK_OAUTH_CONNECT_PAGES = '/integrations/facebook/connect/pages',
  FACEBOOK_CREDENTIALS = '/integrations/facebook/credentials',
  FACEBOOK_CREDENTIAL_CONFIGS = '/integrations/facebook/credentials/configs',
  FACEBOOK_PAGES = '/facebook/pages',
  FACEBOOK_PAGE_ANALYTICS = '/facebook/pages/:integrationId/analytics',

  // --- Storage integrations ---
  GOOGLE_DRIVE = '/storage/google-drive',
  GOOGLE_DRIVE_AUTHORIZATION_URL = '/storage/google-drive/oauth/authorization-url',
  GOOGLE_DRIVE_OAUTH_CALLBACK = '/storage/google-drive/oauth/callback',
  GOOGLE_DRIVE_DISCONNECT = '/storage/google-drive/disconnect',
  GOOGLE_DRIVE_TEST = '/storage/google-drive/test',
  GOOGLE_DRIVE_FILES = '/storage/google-drive/files',
  GOOGLE_DRIVE_CREDENTIAL_CONFIGS = '/storage/google-drive/credentials/configs',

  // --- Media library ---
  MEDIA = '/media',
  MEDIA_BY_ID = '/media/:id',
  MEDIA_RETRY = '/media/:id/retry',
  MEDIA_DOWNLOAD = '/media/:id/download',
  MEDIA_EXPORT = '/media/export',

  // --- Analytics ---
  ANALYTICS_SUMMARY = '/analytics/summary',

  // --- Posts (post management, bulk upload, publishing) ---
  POSTS = '/posts',
  POST_BY_ID = '/posts/:id',
  POSTS_TEMPLATE = '/posts/template',
  POSTS_BULK_UPLOAD = '/posts/bulk-upload',
  POST_PUBLISH = '/posts/:id/publish',

  // --- Products ---
  PRODUCTS = '/products',
  PRODUCT_BY_ID = '/products/:id',

  // --- Schedule events ---
  SCHEDULE_EVENTS = '/schedule-events',
  SCHEDULE_EVENT_POSTS = '/schedule-events/:id/posts',
  SCHEDULES = '/schedules',
  SCHEDULE_BY_ID = '/schedules/:id',
  SCHEDULE_DUPLICATE = '/schedules/:id/duplicate',
  SCHEDULE_TOGGLE_PAUSE = '/schedules/:id/toggle-pause',
  SCHEDULE_POST_QUICK_ACTION = '/schedules/:scheduleId/posts/:postId/quick-action',
  SCHEDULE_POST_RESCHEDULE = '/schedules/:scheduleId/posts/:postId/reschedule',
  SCHEDULE_TEMPLATES = '/schedules/templates',

  // --- Planned platform endpoints (backend stubs not implemented yet) ---
  FACEBOOK_POSTS = '/facebook/posts',
  FACEBOOK_POST_BY_ID = '/facebook/posts/:id',
  INSTAGRAM_POSTS = '/instagram/posts',
  INSTAGRAM_POST_BY_ID = '/instagram/posts/:id',
  WHATSAPP_MESSAGES = '/whatsapp/messages',
}
