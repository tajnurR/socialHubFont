import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Attaches the active organization to every request as `X-Organization-Id`.
 *
 * Dev placeholder: a fixed org id. The backend also falls back to a default org
 * when the header is absent.
 *
 * TODO[SSO]: derive the organization from the authenticated user's session/claims
 * once SSO is wired, instead of hardcoding it here.
 */
const DEV_ORGANIZATION_ID = '1';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ setHeaders: { 'X-Organization-Id': DEV_ORGANIZATION_ID } }));
};
