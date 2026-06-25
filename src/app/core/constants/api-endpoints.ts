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
  FACEBOOK_CREDENTIALS = '/integrations/facebook/credentials',
  FACEBOOK_PAGES = '/facebook/pages',
  FACEBOOK_PAGE_ANALYTICS = '/facebook/pages/:integrationId/analytics',

  // --- Analytics ---
  ANALYTICS_SUMMARY = '/analytics/summary',

  // --- Planned platform endpoints (backend stubs not implemented yet) ---
  FACEBOOK_POSTS = '/facebook/posts',
  FACEBOOK_POST_BY_ID = '/facebook/posts/:id',
  INSTAGRAM_POSTS = '/instagram/posts',
  INSTAGRAM_POST_BY_ID = '/instagram/posts/:id',
  WHATSAPP_MESSAGES = '/whatsapp/messages',
}
