import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard placeholder. Returns true for now so all routes are reachable.
 *
 * TODO[SSO]: once login exists, return `auth.isAuthenticated()` and redirect
 * unauthenticated users to the login/SSO flow.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // TODO[SSO]: redirect to the login route once it exists.
  return router.createUrlTree(['/']);
};
