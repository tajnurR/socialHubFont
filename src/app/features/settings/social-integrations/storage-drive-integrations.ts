import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import {
  GoogleDriveConnection,
  GoogleDriveCredentialConfig,
  GoogleDriveTestResult,
} from '../../../shared/models/social-integration.model';
import { SocialIntegrationsService } from './social-integrations.service';

interface GoogleDriveOAuthMessage {
  type: 'google-drive-oauth';
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

@Component({
  selector: 'app-storage-drive-integrations',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, PageHeader],
  template: `
    <div class="flex items-center justify-between">
      <app-page-header
        title="Storage / Drive Integrations"
        subtitle="Connect Google Drive for media storage"
      />
      <a
        routerLink="/settings/social-integrations"
        class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Social Integrations
      </a>
    </div>

    @if (loading()) {
      <p class="text-sm text-slate-400">Loading Google Drive connection…</p>
    } @else {
      <section class="rounded-xl border border-slate-200 bg-white p-6">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div class="flex items-center gap-3">
              <h2 class="text-lg font-semibold text-slate-800">Google Drive</h2>
              <span
                class="rounded-full px-2 py-1 text-xs font-medium"
                [class]="statusClass(connection()?.status)"
              >
                {{ statusLabel(connection()?.status) }}
              </span>
            </div>

            @if (connection()?.connected) {
              <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt class="text-xs font-medium uppercase text-slate-400">Account</dt>
                  <dd class="mt-1 text-slate-800">
                    {{ connection()?.googleAccountName || 'Google account' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-medium uppercase text-slate-400">Email</dt>
                  <dd class="mt-1 text-slate-800">{{ connection()?.googleAccountEmail }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium uppercase text-slate-400">Connected</dt>
                  <dd class="mt-1 text-slate-800">
                    {{ connection()?.connectedAt | date: 'medium' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-medium uppercase text-slate-400">Last sync</dt>
                  <dd class="mt-1 text-slate-800">
                    {{ connection()?.lastSyncAt ? (connection()?.lastSyncAt | date: 'medium') : 'Not synced' }}
                  </dd>
                </div>
              </dl>
            } @else {
              <p class="mt-3 max-w-2xl text-sm text-slate-500">
                Connect a Google Drive account before uploading media files for social posts.
              </p>
            }

            @if (connection()?.status === 'REAUTH_REQUIRED') {
              <p class="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Google rejected the stored token. Reconnect Google Drive to restore uploads.
              </p>
            }
          </div>

          <div class="flex flex-col gap-2 lg:min-w-72">
            @if (credentialConfigs().length) {
              <label class="text-xs font-medium uppercase text-slate-400">Google OAuth config</label>
              <select
                class="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                [value]="selectedCredentialConfigId() ?? ''"
                (change)="selectCredentialConfig($any($event.target).value)"
              >
                @for (config of credentialConfigs(); track config.id) {
                  <option [value]="config.id">
                    {{ config.label || config.clientId }} ({{ config.clientId }})
                  </option>
                }
              </select>
            }

            <div class="flex flex-wrap gap-2 lg:justify-end">
            @if (connection()?.connected) {
              <button
                type="button"
                [disabled]="busy()"
                class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                (click)="testConnection()"
              >
                Test Connection
              </button>
              <button
                type="button"
                [disabled]="busy()"
                class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                (click)="connect()"
              >
                Reconnect Google Drive
              </button>
              <button
                type="button"
                [disabled]="busy()"
                class="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                (click)="disconnect()"
              >
                Disconnect Google Drive
              </button>
            } @else {
              <button
                type="button"
                [disabled]="busy()"
                class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                (click)="connect()"
              >
                {{ busy() ? 'Starting…' : 'Connect Google Drive' }}
              </button>
            }
            </div>
          </div>
        </div>
      </section>

      <section class="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-800">Google OAuth app credentials</h3>
            <p class="mt-1 text-sm text-slate-500">
              Each user saves their own Google OAuth client. The client secret is encrypted and
              never returned to the browser.
            </p>
          </div>
          @if (credentialConfigs().length) {
            <button
              type="button"
              class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              (click)="showCredentialForm.set(!showCredentialForm())"
            >
              Add another config
            </button>
          }
        </div>

        @if (!credentialConfigs().length || showCredentialForm()) {
          <form [formGroup]="credentialForm" (ngSubmit)="saveCredentials()" class="mt-5 max-w-2xl">
            <div class="mb-3">
              <label class="mb-1 block text-sm font-medium text-slate-700">Label</label>
              <input
                type="text"
                formControlName="label"
                placeholder="Optional"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div class="mb-3">
              <label class="mb-1 block text-sm font-medium text-slate-700">OAuth Client ID</label>
              <input
                type="text"
                formControlName="clientId"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              @if (credentialInvalid('clientId')) {
                <p class="mt-1 text-xs text-red-600">Client ID is required.</p>
              }
            </div>
            <div class="mb-3">
              <label class="mb-1 block text-sm font-medium text-slate-700">OAuth Client Secret</label>
              <input
                type="password"
                formControlName="clientSecret"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              @if (credentialInvalid('clientSecret')) {
                <p class="mt-1 text-xs text-red-600">Client Secret is required.</p>
              }
            </div>
            <div class="mb-3">
              <label class="mb-1 block text-sm font-medium text-slate-700">Redirect URI</label>
              <input
                type="url"
                formControlName="redirectUri"
                [placeholder]="defaultRedirectUri()"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div class="mb-4">
              <label class="mb-1 block text-sm font-medium text-slate-700">Scopes</label>
              <input
                type="text"
                formControlName="scopes"
                placeholder="Leave blank for the default least-privilege Drive scopes"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              [disabled]="busy()"
              class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {{ busy() ? 'Saving…' : 'Save Google config' }}
            </button>
          </form>
        }
      </section>

      @if (testResult(); as result) {
        <section class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p class="font-medium">{{ result.message }}</p>
          @if (result.quota) {
            <p class="mt-1">
              Drive usage:
              {{ formatBytes(result.quota.usageBytes) }} /
              {{ result.quota.limitBytes ? formatBytes(result.quota.limitBytes) : 'unlimited' }}
            </p>
          }
        </section>
      }

      <section class="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="text-base font-semibold text-slate-800">Media upload access</h3>
        <p class="mt-1 text-sm text-slate-500">
          Upload APIs are available only while Google Drive is connected. Tokens and Google
          credentials are never exposed in browser code.
        </p>
      </section>
    }
  `,
})
export class StorageDriveIntegrations implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SocialIntegrationsService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly connection = signal<GoogleDriveConnection | null>(null);
  protected readonly credentialConfigs = signal<GoogleDriveCredentialConfig[]>([]);
  protected readonly selectedCredentialConfigId = signal<number | null>(null);
  protected readonly showCredentialForm = signal(false);
  protected readonly testResult = signal<GoogleDriveTestResult | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly credentialForm = this.fb.nonNullable.group({
    label: [''],
    clientId: ['', Validators.required],
    clientSecret: ['', Validators.required],
    redirectUri: [''],
    scopes: [''],
  });

  ngOnInit(): void {
    this.handleOAuthReturn();
  }

  protected async connect(): Promise<void> {
    if (!this.credentialConfigs().length) {
      this.showCredentialForm.set(true);
      this.notifications.error('Add your Google OAuth app credentials before connecting.');
      return;
    }
    this.busy.set(true);
    const popup = this.openBlankPopup();
    if (!popup) {
      this.notifications.error('Allow popups for this site to connect Google Drive.');
      this.busy.set(false);
      return;
    }
    try {
      const callbackUrl = `${window.location.origin}/settings/social-integrations/storage-drive`;
      const response = await firstValueFrom(
        this.service.googleDriveAuthorizationUrl(callbackUrl, this.selectedCredentialConfigId() ?? undefined),
      );
      const result = await this.waitForOAuthPopup(popup, response.authorizationUrl);
      const connection = await firstValueFrom(
        this.service.googleDriveOAuthCallback(result.code, result.state),
      );
      this.connection.set(connection);
      this.testResult.set(null);
      this.notifications.success('Google Drive connected');
      this.load(false);
    } catch (err) {
      this.notifications.error(this.errorMessage(err, 'Could not start Google Drive OAuth'));
      popup.close();
    } finally {
      this.busy.set(false);
    }
  }

  protected async disconnect(): Promise<void> {
    const ok = await this.confirm.ask(
      'Disconnect Google Drive? Stored Google tokens will be removed.',
      'Disconnect Google Drive',
      'Disconnect',
    );
    if (!ok) {
      return;
    }
    this.busy.set(true);
    this.service.disconnectGoogleDrive().subscribe({
      next: (connection) => {
        this.connection.set(connection);
        this.testResult.set(null);
        this.notifications.success('Google Drive disconnected');
        this.busy.set(false);
      },
      error: (err) => {
        this.notifications.error(this.errorMessage(err, 'Could not disconnect Google Drive'));
        this.busy.set(false);
      },
    });
  }

  protected testConnection(): void {
    this.busy.set(true);
    this.service.testGoogleDrive().subscribe({
      next: (result) => {
        this.testResult.set(result);
        this.notifications.success('Google Drive connection works');
        this.load(false);
        this.busy.set(false);
      },
      error: (err) => {
        this.notifications.error(this.errorMessage(err, 'Google Drive test failed'));
        this.load(false);
        this.busy.set(false);
      },
    });
  }

  protected saveCredentials(): void {
    if (this.credentialForm.invalid) {
      this.credentialForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.service.createGoogleDriveCredentialConfig(this.credentialForm.getRawValue()).subscribe({
      next: (config) => {
        this.credentialConfigs.update((items) => [...items, config]);
        this.selectedCredentialConfigId.set(config.id);
        this.credentialForm.reset();
        this.showCredentialForm.set(false);
        this.notifications.success('Google Drive app configuration saved');
        this.busy.set(false);
      },
      error: (err) => {
        this.notifications.error(this.errorMessage(err, 'Could not save Google Drive credentials'));
        this.busy.set(false);
      },
    });
  }

  protected credentialInvalid(name: 'clientId' | 'clientSecret'): boolean {
    const control = this.credentialForm.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  protected defaultRedirectUri(): string {
    return `${window.location.origin}/settings/social-integrations/storage-drive`;
  }

  protected selectCredentialConfig(value: string): void {
    this.selectedCredentialConfigId.set(value ? Number(value) : null);
  }

  protected statusClass(status?: string): string {
    switch (status) {
      case 'CONNECTED':
        return 'bg-emerald-50 text-emerald-700';
      case 'REAUTH_REQUIRED':
        return 'bg-amber-50 text-amber-700';
      case 'ERROR':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  protected statusLabel(status?: string): string {
    if (status === 'REAUTH_REQUIRED') {
      return 'Reconnect needed';
    }
    return status ?? 'DISCONNECTED';
  }

  protected formatBytes(value?: number | null): string {
    if (!value || value <= 0) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    return `${(value / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  }

  private handleOAuthReturn(): void {
    const params = this.route.snapshot.queryParamMap;
    const error = params.get('error');
    const code = params.get('code');
    const state = params.get('state');

    if (error) {
      const description = params.get('error_description') ?? error;
      if (this.returnOAuthResultToOpener({ type: 'google-drive-oauth', error, errorDescription: description })) {
        return;
      }
      this.notifications.error(`Google OAuth failed: ${description}`);
      this.clearQueryParams();
      this.load();
      return;
    }

    if (code && state) {
      if (this.returnOAuthResultToOpener({ type: 'google-drive-oauth', code, state })) {
        return;
      }
      this.busy.set(true);
      this.service.googleDriveOAuthCallback(code, state).subscribe({
        next: (connection) => {
          this.connection.set(connection);
          this.notifications.success('Google Drive connected');
          this.clearQueryParams();
          this.loading.set(false);
          this.busy.set(false);
        },
        error: (err) => {
          this.notifications.error(this.errorMessage(err, 'Google Drive OAuth failed'));
          this.clearQueryParams();
          this.load();
          this.busy.set(false);
        },
      });
      return;
    }

    this.load();
  }

  private load(showLoading = true): void {
    if (showLoading) {
      this.loading.set(true);
    }
    Promise.all([
      firstValueFrom(this.service.googleDriveStatus()),
      firstValueFrom(this.service.googleDriveCredentialConfigs()),
    ])
      .then(([connection, configs]) => {
        this.connection.set(connection);
        this.credentialConfigs.set(configs);
        if (!this.selectedCredentialConfigId() && configs.length) {
          this.selectedCredentialConfigId.set(configs[0].id);
        }
        this.showCredentialForm.set(!configs.length);
        this.loading.set(false);
      })
      .catch((err) => {
        this.notifications.error(this.errorMessage(err, 'Could not load Google Drive status'));
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
    const height = 680;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
    return window.open(
      'about:blank',
      'socialhub-google-drive-oauth',
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
          reject(new Error('Google OAuth did not return an authorization code.'));
          return;
        }
        resolve({ code: event.data.code, state: event.data.state });
      };

      const closedPoll = window.setInterval(() => {
        if (!settled && popup.closed) {
          cleanup();
          reject(new Error('Google Drive sign-in was cancelled.'));
        }
      }, 500);

      window.addEventListener('message', onMessage);
      popup.location.href = authorizationUrl;
    });
  }

  private returnOAuthResultToOpener(message: GoogleDriveOAuthMessage): boolean {
    if (!window.opener || window.opener.closed) {
      return false;
    }
    window.opener.postMessage(message, window.location.origin);
    window.setTimeout(() => window.close(), 50);
    return true;
  }

  private isOAuthMessage(value: unknown): value is GoogleDriveOAuthMessage {
    return (
      value !== null &&
      typeof value === 'object' &&
      'type' in value &&
      (value as GoogleDriveOAuthMessage).type === 'google-drive-oauth'
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
