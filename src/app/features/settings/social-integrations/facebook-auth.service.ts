import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

// Minimal typing for the globally-loaded Facebook SDK.
declare global {
  interface Window {
    FB?: {
      init: (params: Record<string, unknown>) => void;
      login: (cb: (response: FbLoginResponse) => void, opts: Record<string, unknown>) => void;
    };
    fbAsyncInit?: () => void;
  }
}

interface FbLoginResponse {
  authResponse?: { accessToken?: string };
  status?: string;
}

/**
 * Encapsulates the Facebook Login popup via the FB JS SDK.
 *
 * We use the SDK's `FB.login` (which opens Facebook's popup) and take the
 * short-lived **user** access token from the auth response, then hand it to the
 * backend to exchange for a long-lived token + Page tokens. We chose the SDK
 * popup over a server-side redirect flow because it needs no redirect/callback
 * endpoint or `state` handling, while the app secret still stays server-side
 * (the backend performs the token exchange).
 *
 * Kept inside the Facebook feature so other platforms add their own auth later.
 */
@Injectable({ providedIn: 'root' })
export class FacebookAuthService {
  private sdkPromise?: Promise<void>;
  private readonly scope =
    'pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content';

  /** Whether an App ID is configured (controls showing the OAuth button). */
  get configured(): boolean {
    return !!environment.facebook.appId;
  }

  /** Opens the Facebook login popup; resolves with a short-lived user access token. */
  async login(): Promise<string> {
    if (!this.configured) {
      throw new Error('Facebook App ID is not configured (set environment.facebook.appId).');
    }
    await this.loadSdk();
    const fb = window.FB!;
    return new Promise<string>((resolve, reject) => {
      fb.login(
        (response) => {
          const token = response?.authResponse?.accessToken;
          if (token) {
            resolve(token);
          } else {
            reject(new Error('Facebook login was cancelled or not authorized.'));
          }
        },
        { scope: this.scope, return_scopes: true },
      );
    });
  }

  private loadSdk(): Promise<void> {
    if (this.sdkPromise) {
      return this.sdkPromise;
    }
    this.sdkPromise = new Promise<void>((resolve, reject) => {
      if (window.FB) {
        resolve();
        return;
      }
      window.fbAsyncInit = () => {
        window.FB!.init({
          appId: environment.facebook.appId,
          cookie: false,
          xfbml: false,
          version: environment.facebook.apiVersion,
        });
        resolve();
      };
      const existing = document.getElementById('facebook-jssdk');
      if (existing) {
        return; // fbAsyncInit will fire once it loads
      }
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error('Failed to load the Facebook SDK.'));
      document.body.appendChild(script);
    });
    return this.sdkPromise;
  }
}
