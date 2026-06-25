/** Development environment: points at the local Spring Boot backend. */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api/v1',
  facebook: {
    // Public Meta app id (set to enable "Connect with Facebook"). Leave blank to
    // hide the OAuth button and use manual connect only.
    appId: '1435931321914155',
    apiVersion: 'v25.0',
  },
};
