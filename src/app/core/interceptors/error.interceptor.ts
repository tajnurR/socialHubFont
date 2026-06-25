import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorResponse } from '../../shared/models/api-response.model';
import { AuthService } from '../services/auth.service';

/**
 * Centralized HTTP error handling. Logs a normalized message and re-throws so
 * callers can still react. Extend with toast notifications / global error state
 * as needed.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const body = error.error as Partial<ErrorResponse> | null;
      const message = body?.message ?? error.message ?? 'Unexpected error';

      if (error.status === 401) {
        // TODO[SSO]: trigger re-authentication / redirect to login.
        auth.logout();
      }

      console.error(`[HTTP ${error.status}] ${req.method} ${req.url}: ${message}`);
      return throwError(() => error);
    }),
  );
};
