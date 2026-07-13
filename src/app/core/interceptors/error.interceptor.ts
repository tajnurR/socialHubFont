import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { ErrorResponse } from '../../shared/models/api-response.model';
import { AuthService } from '../services/auth.service';

/**
 * Centralized HTTP error handling. On 401 for a protected request, clears the
 * session and redirects to login (skips auth endpoints so a bad-login 401 stays
 * on the login page). Logs a normalized message and re-throws.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const body = error.error as Partial<ErrorResponse> | null;
      const message = body?.message ?? error.message ?? 'Unexpected error';

      const isAuthEndpoint = req.url.includes('/auth/');
      if (error.status === 401 && !isAuthEndpoint) {
        const refreshToken = auth.getRefreshToken();
        if (refreshToken) {
          return auth.refreshSession().pipe(
            switchMap((session) =>
              next(req.clone({ setHeaders: { Authorization: `Bearer ${session.accessToken}` } })),
            ),
            catchError((refreshError) => {
              auth.logout();
              return throwError(() => refreshError);
            }),
          );
        }
        auth.logout();
      }

      console.error(`[HTTP ${error.status}] ${req.method} ${req.url}: ${message}`);
      return throwError(() => error);
    }),
  );
};
