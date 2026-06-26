import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiEndpoint } from '../constants/api-endpoints';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserProfile,
} from '../../shared/models/auth.model';
import { ApiService } from './api.service';

const ACCESS_KEY = 'sh_access';
const REFRESH_KEY = 'sh_refresh';

/**
 * Authentication state + session handling for first-party (email/password) login.
 *
 * <p>Holds the access token (persisted in localStorage) and current user as
 * signals. The interface (login/register/logout/isAuthenticated/getToken) is the
 * **swappable boundary**: an SSO/OIDC login (redirect-based) can replace the
 * password methods with minimal change to consumers (guard, interceptor, shell).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(localStorage.getItem(ACCESS_KEY));
  private readonly _user = signal<UserProfile | null>(null);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.api
      .post<AuthResponse>(ApiEndpoint.AUTH_LOGIN, request)
      .pipe(tap((res) => this.storeSession(res)));
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.api
      .post<AuthResponse>(ApiEndpoint.AUTH_REGISTER, request)
      .pipe(tap((res) => this.storeSession(res)));
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this._token();
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  /** Lazily fetch the current user's profile (e.g. after a page refresh). */
  loadProfile(): void {
    if (!this.isAuthenticated() || this._user()) {
      return;
    }
    this.api.get<UserProfile>(ApiEndpoint.AUTH_ME).subscribe({
      next: (user) => this._user.set(user),
      error: () => this.clearSession(),
    });
  }

  private storeSession(res: AuthResponse): void {
    localStorage.setItem(ACCESS_KEY, res.accessToken);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    this._token.set(res.accessToken);
    if (res.user) {
      this._user.set(res.user);
    } else {
      this.loadProfile();
    }
  }

  private clearSession(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this._token.set(null);
    this._user.set(null);
  }
}
