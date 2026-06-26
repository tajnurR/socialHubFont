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
 * The popup is initialized with the **current user's own App ID** (passed in by
 * the caller, sourced from that user's stored credentials) — there is no global
 * app id. We take the short-lived user token from the auth response and hand it
 * to the backend, which exchanges it using that user's app secret (server-side).
 *
 * Kept inside the Facebook feature so other platforms add their own auth later.
 */
@Injectable({ providedIn: 'root' })
export class FacebookAuthService {
  private scriptPromise?: Promise<void>;
  private initializedAppId?: string;
  private readonly scope =
    'pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content';

  /**
   * Opens the Facebook login popup for the given (per-user) App ID; resolves with
   * a short-lived user access token.
   */
  async login(appId: string): Promise<string> {
    if (!appId) {
      throw new Error('No Facebook App ID for your account — save your app credentials first.');
    }
    await this.ensureInitialized(appId);
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

  /** Loads the SDK once, then (re)inits with the given app id if it changed. */
  private async ensureInitialized(appId: string): Promise<void> {
    await this.loadScript();
    if (this.initializedAppId !== appId) {
      window.FB!.init({
        appId,
        cookie: false,
        xfbml: false,
        version: environment.facebook.apiVersion,
      });
      this.initializedAppId = appId;
    }
  }

  private loadScript(): Promise<void> {
    if (this.scriptPromise) {
      return this.scriptPromise;
    }
    this.scriptPromise = new Promise<void>((resolve, reject) => {
      if (window.FB) {
        resolve();
        return;
      }
      window.fbAsyncInit = () => resolve();
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
    return this.scriptPromise;
  }
}
