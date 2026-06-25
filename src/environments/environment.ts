/**
 * Default (production) environment. Replaced at build time by
 * environment.development.ts for the `development` configuration
 * (see fileReplacements in angular.json).
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  facebook: {
    // Public Meta app id (set per environment, e.g. via build-time config).
    appId: '1435931321914155',
    apiVersion: 'v25.0',
  },
};
