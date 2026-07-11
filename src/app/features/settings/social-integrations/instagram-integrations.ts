import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import {
  FacebookCredentialConfig,
  SocialIntegration,
} from '../../../shared/models/social-integration.model';
import { SocialIntegrationsService } from './social-integrations.service';

interface InstagramOAuthMessage {
  type: 'instagram-oauth';
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

@Component({
  selector: 'app-instagram-integrations',
  imports: [DatePipe, FormsModule, RouterLink, PageHeader],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <app-page-header
          title="Instagram Connection"
          subtitle="Connect an Instagram professional account with Instagram Login"
        />
        <a
          routerLink="../"
          class="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
        >
          Back to Integrations
        </a>
      </div>

      <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Connect Instagram</h2>
            <p class="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Add the app from Meta's <span class="font-semibold">API setup with Instagram login</span>.
              The connect button opens Instagram Login directly and saves the approved Instagram profile.
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            (click)="showAppForm.update((value) => !value)"
          >
            {{ showAppForm() ? 'Cancel' : 'Add Instagram app' }}
          </button>
        </div>

        @if (showAppForm()) {
          <div class="mt-5 rounded-lg border border-rose-100 bg-rose-50 p-4">
            <div class="grid gap-3 lg:grid-cols-4">
              <label>
                <span class="text-xs font-medium text-slate-600">App Name</span>
                <input
                  [(ngModel)]="form.label"
                  class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500"
                  placeholder="Instagram app"
                />
              </label>
              <label>
                <span class="text-xs font-medium text-slate-600">Instagram App ID</span>
                <input
                  [(ngModel)]="form.appId"
                  class="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-rose-500"
                  [class.border-red-300]="submitted() && !form.appId.trim()"
                  [class.border-slate-300]="!(submitted() && !form.appId.trim())"
                />
              </label>
              <label>
                <span class="text-xs font-medium text-slate-600">Instagram App Secret</span>
                <input
                  [type]="secretVisible() ? 'text' : 'password'"
                  [(ngModel)]="form.appSecret"
                  class="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-rose-500"
                  [class.border-red-300]="submitted() && !form.appSecret.trim()"
                  [class.border-slate-300]="!(submitted() && !form.appSecret.trim())"
                />
              </label>
              <label>
                <span class="text-xs font-medium text-slate-600">OAuth Redirect URI</span>
                <input
                  [(ngModel)]="form.redirectUri"
                  class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500"
                  [placeholder]="defaultRedirectUri()"
                />
              </label>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                [disabled]="savingApp()"
                (click)="saveInstagramApp()"
              >
                {{ savingApp() ? 'Saving...' : 'Save Instagram app' }}
              </button>
              <button
                type="button"
                class="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                (click)="secretVisible.update((value) => !value)"
              >
                {{ secretVisible() ? 'Hide secret' : 'Show secret' }}
              </button>
            </div>
            <p class="mt-3 text-xs leading-5 text-rose-900">
              Use the Instagram App ID from API setup with Instagram login, not the Instagram account ID.
              Add this redirect URI in Meta: {{ form.redirectUri || defaultRedirectUri() }}
            </p>
          </div>
        }

        @if (loading()) {
          <p class="mt-5 text-sm text-slate-500">Loading Instagram apps...</p>
        } @else if (!configs().length) {
          <div class="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Add an Instagram app before connecting an Instagram account.
          </div>
        } @else {
          <div class="mt-5 grid gap-3 md:grid-cols-2">
            @for (config of configs(); track config.id) {
              <article class="rounded-lg border border-slate-200 p-4">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h3 class="font-semibold text-slate-900">{{ config.label || 'Instagram app' }}</h3>
                    <p class="mt-1 text-sm text-slate-500">{{ config.appId }}</p>
                    @if (config.redirectUri) {
                      <p class="mt-1 truncate text-xs text-slate-400">{{ config.redirectUri }}</p>
                    }
                  </div>
                  <button
                    type="button"
                    class="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    [disabled]="busy()"
                    (click)="startInstagramLogin(config)"
                  >
                    {{ busyConfigId() === config.id ? 'Opening...' : 'Connect account' }}
                  </button>
                </div>
              </article>
            }
          </div>
        }
      </section>

      <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">Connected Instagram Accounts</h2>
        @if (connectedAccounts().length) {
          <div class="mt-4 grid gap-3 md:grid-cols-2">
            @for (account of connectedAccounts(); track account.id) {
              <article class="rounded-lg border border-slate-200 p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h3 class="truncate font-semibold text-slate-900">
                      {{ account.displayName || account.externalAccountId }}
                    </h3>
                    <p class="mt-1 truncate text-sm text-slate-500">{{ account.externalAccountId }}</p>
                    <p class="mt-2 text-xs text-slate-400">
                      Connected {{ account.createdAt | date: 'medium' }}
                    </p>
                  </div>
                  <span class="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    {{ account.status }}
                  </span>
                </div>
              </article>
            }
          </div>
        } @else {
          <p class="mt-3 text-sm text-slate-500">No Instagram account connected yet.</p>
        }
      </section>
    </div>
  `,
})
export class InstagramIntegrations implements OnInit {
  private readonly service = inject(SocialIntegrationsService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly configs = signal<FacebookCredentialConfig[]>([]);
  protected readonly connectedAccounts = signal<SocialIntegration[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly savingApp = signal(false);
  protected readonly showAppForm = signal(false);
  protected readonly submitted = signal(false);
  protected readonly secretVisible = signal(false);
  protected readonly busyConfigId = signal<number | null>(null);
  protected form = {
    label: 'Instagram app',
    appId: '',
    appSecret: '',
    redirectUri: '',
  };

  ngOnInit(): void {
    if (!this.form.redirectUri) {
      this.form.redirectUri = this.defaultRedirectUri();
    }
    if (!this.handleOAuthReturn()) {
      this.load();
    }
  }

  protected async startInstagramLogin(config: FacebookCredentialConfig): Promise<void> {
    this.busy.set(true);
    this.busyConfigId.set(config.id);
    const popup = this.openBlankPopup();
    if (!popup) {
      this.notifications.error('Allow popups for this site to connect Instagram.');
      this.busy.set(false);
      this.busyConfigId.set(null);
      return;
    }

    try {
      const response = await firstValueFrom(
        this.service.instagramAuthorizationUrl(this.defaultRedirectUri(), config.id),
      );
      const result = await this.waitForOAuthPopup(popup, response.authorizationUrl);
      await firstValueFrom(this.service.instagramOAuthCallback(result.code, result.state));
      this.notifications.success('Instagram account connected');
      this.load(false);
    } catch (err) {
      this.notifications.error(this.errorMessage(err, 'Instagram login failed'));
      popup.close();
    } finally {
      this.busy.set(false);
      this.busyConfigId.set(null);
    }
  }

  protected saveInstagramApp(): void {
    this.submitted.set(true);
    if (!this.form.appId.trim() || !this.form.appSecret.trim()) {
      return;
    }
    this.savingApp.set(true);
    this.service
      .createInstagramCredentialConfig({
        label: this.form.label.trim() || 'Instagram app',
        appId: this.form.appId.trim(),
        appSecret: this.form.appSecret.trim(),
        redirectUri: this.form.redirectUri.trim() || this.defaultRedirectUri(),
        scopes: INSTAGRAM_APP_SCOPES,
      })
      .subscribe({
        next: () => {
          this.notifications.success('Instagram app saved');
          this.form = {
            label: 'Instagram app',
            appId: '',
            appSecret: '',
            redirectUri: this.defaultRedirectUri(),
          };
          this.submitted.set(false);
          this.showAppForm.set(false);
          this.secretVisible.set(false);
          this.savingApp.set(false);
          this.load();
        },
        error: (err) => {
          this.notifications.error(this.errorMessage(err, 'Could not save Instagram app'));
          this.savingApp.set(false);
        },
      });
  }

  protected defaultRedirectUri(): string {
    return `${window.location.origin}/settings/social-integrations/instagram`;
  }

  private handleOAuthReturn(): boolean {
    const params = this.route.snapshot.queryParamMap;
    const error = params.get('error');
    const code = params.get('code');
    const state = params.get('state');

    if (error) {
      const description = params.get('error_description') ?? error;
      if (this.returnOAuthResultToOpener({ type: 'instagram-oauth', error, errorDescription: description })) {
        return true;
      }
      this.notifications.error(`Instagram login failed: ${description}`);
      this.clearQueryParams();
      return false;
    }

    if (code && state) {
      if (this.returnOAuthResultToOpener({ type: 'instagram-oauth', code, state })) {
        return true;
      }
      this.busy.set(true);
      this.service.instagramOAuthCallback(code, state).subscribe({
        next: () => {
          this.notifications.success('Instagram account connected');
          this.clearQueryParams();
          this.load(false);
          this.busy.set(false);
        },
        error: (err) => {
          this.notifications.error(this.errorMessage(err, 'Instagram OAuth failed'));
          this.clearQueryParams();
          this.load();
          this.busy.set(false);
        },
      });
      return true;
    }

    return false;
  }

  private load(showLoading = true): void {
    if (showLoading) {
      this.loading.set(true);
    }
    Promise.all([
      firstValueFrom(this.service.instagramCredentialConfigs()),
      firstValueFrom(this.service.list()),
    ])
      .then(([configs, integrations]) => {
        this.configs.set(configs);
        this.connectedAccounts.set(
          integrations.filter((integration) => integration.platform === 'INSTAGRAM'),
        );
        this.showAppForm.set(!configs.length);
        this.loading.set(false);
      })
      .catch((err) => {
        this.notifications.error(this.errorMessage(err, 'Could not load Instagram integrations'));
        this.loading.set(false);
      });
  }

  private clearQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
  }

  private openBlankPopup(): Window | null {
    const width = 520;
    const height = 700;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
    return window.open(
      'about:blank',
      'socialhub-instagram-oauth',
      `popup=yes,width=${width},height=${height},left=${left},top=${top}`,
    );
  }

  private waitForOAuthPopup(
    popup: Window,
    authorizationUrl: string,
  ): Promise<{ code: string; state: string }> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        settled = true;
        window.removeEventListener('message', onMessage);
        window.clearInterval(closedPoll);
      };

      const onMessage = (event: MessageEvent<unknown>) => {
        if (event.origin !== window.location.origin || !this.isOAuthMessage(event.data)) {
          return;
        }
        cleanup();
        popup.close();
        if (event.data.error) {
          reject(new Error(event.data.errorDescription || event.data.error));
          return;
        }
        if (!event.data.code || !event.data.state) {
          reject(new Error('Instagram did not return an authorization code.'));
          return;
        }
        resolve({ code: event.data.code, state: event.data.state });
      };

      const closedPoll = window.setInterval(() => {
        if (!settled && popup.closed) {
          cleanup();
          reject(new Error('Instagram sign-in was cancelled.'));
        }
      }, 500);

      window.addEventListener('message', onMessage);
      popup.location.href = authorizationUrl;
    });
  }

  private returnOAuthResultToOpener(message: InstagramOAuthMessage): boolean {
    if (!window.opener || window.opener.closed) {
      return false;
    }
    window.opener.postMessage(message, window.location.origin);
    window.setTimeout(() => window.close(), 50);
    return true;
  }

  private isOAuthMessage(value: unknown): value is InstagramOAuthMessage {
    return (
      value !== null &&
      typeof value === 'object' &&
      'type' in value &&
      (value as InstagramOAuthMessage).type === 'instagram-oauth'
    );
  }

  private errorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      return err.error?.message ?? fallback;
    }
    if (err instanceof Error) {
      return err.message;
    }
    return fallback;
  }
}

const INSTAGRAM_APP_SCOPES =
  'instagram_business_basic,instagram_business_content_publish';
