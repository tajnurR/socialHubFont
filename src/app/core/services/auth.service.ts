import { computed, Injectable, signal } from '@angular/core';

/**
 * Authentication state holder (placeholder).
 *
 * Uses signals so components/guards can react to auth changes. There is no real
 * login yet — `token` stays null and `isAuthenticated` is forced true so the app
 * is usable during development.
 *
 * TODO[SSO]: integrate an OAuth2/OIDC flow (e.g. angular-auth-oidc-client):
 *   - perform the redirect/code-exchange login
 *   - store the access token via `setToken(...)`
 *   - derive `isAuthenticated` from real token validity
 *   - expose the current user/organization
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _token = signal<string | null>(null);

  readonly token = this._token.asReadonly();

  // TODO[SSO]: replace `true` with `() => this._token() !== null` once login exists.
  readonly isAuthenticated = computed(() => true);

  getToken(): string | null {
    return this._token();
  }

  setToken(token: string | null): void {
    this._token.set(token);
  }

  logout(): void {
    this._token.set(null);
  }
}
