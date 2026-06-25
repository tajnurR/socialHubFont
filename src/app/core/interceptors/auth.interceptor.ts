import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Attaches the auth token to outgoing requests (placeholder).
 *
 * No token exists yet, so requests pass through unchanged. Once SSO is wired,
 * `AuthService.getToken()` returns a real token and it is added as a Bearer header.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();

  if (!token) {
    return next(req);
  }

  // TODO[SSO]: also handle token refresh / 401 retry once real auth exists.
  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return next(authReq);
};
