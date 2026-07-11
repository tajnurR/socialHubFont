import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from '../../../core/services/confirm.service';
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
  imports: [DatePipe, ReactiveFormsModule, RouterLink, PageHeader],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <app-page-header
          title="Instagram Connection"
          subtitle="Manage your Instagram app credentials before connecting profiles"
        />
        <div class="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            class="inline-flex w-full items-center justify-center rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 sm:w-auto"
            (click)="openSetupGuide()"
          >
            How to connect
          </button>
          <a
            routerLink="/settings/social-integrations"
            class="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            Back
          </a>
        </div>
      </div>

      @if (!showForm()) {
        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="max-w-2xl">
              <p class="text-xs font-semibold uppercase text-rose-600">Instagram apps</p>
              <h2 class="mt-1 text-xl font-semibold text-slate-950">Connect your Instagram app</h2>
              <p class="mt-2 text-sm leading-6 text-slate-500">
                Add the Instagram App ID and App Secret from Meta's API setup with Instagram login.
                Secrets are encrypted and scoped to the logged-in user.
              </p>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                class="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                (click)="openCreateForm()"
              >
                Add Instagram app
              </button>
              <button
                type="button"
                class="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
                [disabled]="busy() || !configs().length"
                (click)="connectPrimaryApp()"
              >
                {{ busy() ? 'Opening...' : 'Connect Instagram' }}
              </button>
            </div>
          </div>
        </section>
      }

      @if (showForm()) {
        <section class="mx-auto max-w-[520px] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase text-rose-600">New app</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">Connect Instagram</h2>
            </div>
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
              (click)="closeForm()"
            >
              Close
            </button>
          </div>

          <form class="space-y-4" [formGroup]="form" (ngSubmit)="saveApp()">
            <label class="block">
              <span class="text-sm font-medium text-slate-700">App Name</span>
              <input
                type="text"
                formControlName="label"
                placeholder="Instagram app"
                class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-500"
              />
              @if (invalid('label')) {
                <p class="mt-1 text-xs text-red-600">App Name is required.</p>
              }
            </label>

            <label class="block">
              <span class="text-sm font-medium text-slate-700">Instagram App ID</span>
              <input
                type="text"
                formControlName="appId"
                class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-500"
              />
              @if (invalid('appId')) {
                <p class="mt-1 text-xs text-red-600">Instagram App ID is required.</p>
              }
            </label>

            <label class="block">
              <span class="text-sm font-medium text-slate-700">Instagram App Secret</span>
              <div class="mt-1 flex rounded-xl border border-slate-300 focus-within:border-rose-500">
                <input
                  [type]="secretVisible() ? 'text' : 'password'"
                  formControlName="appSecret"
                  class="min-w-0 flex-1 rounded-l-xl border-0 px-3 py-2.5 text-sm outline-none"
                />
                <button
                  type="button"
                  class="rounded-r-xl px-3 text-sm font-medium text-slate-500 hover:bg-slate-50"
                  (click)="secretVisible.update((value) => !value)"
                  [attr.aria-label]="secretVisible() ? 'Hide Instagram App Secret' : 'Show Instagram App Secret'"
                >
                  {{ secretVisible() ? 'Hide' : 'Show' }}
                </button>
              </div>
              <p class="mt-1 text-xs text-slate-400">We encrypt this secret before storing it.</p>
              @if (invalid('appSecret')) {
                <p class="mt-1 text-xs text-red-600">Instagram App Secret is required.</p>
              }
            </label>

            <label class="block">
              <span class="text-sm font-medium text-slate-700">OAuth Redirect URI</span>
              <input
                type="text"
                formControlName="redirectUri"
                class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-500"
              />
              <p class="mt-1 text-xs text-slate-400">
                Add this exact URI in Meta's Instagram Login settings.
              </p>
              @if (invalid('redirectUri')) {
                <p class="mt-1 text-xs text-red-600">Redirect URI is required.</p>
              }
            </label>

            <button
              type="submit"
              [disabled]="saving()"
              class="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
            >
              {{ saving() ? 'Saving...' : 'Save Instagram App' }}
            </button>
          </form>
        </section>
      }

      <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-base font-semibold text-slate-950">Added apps</h2>
            <p class="mt-1 text-sm text-slate-500">{{ tableSummary() }}</p>
          </div>
        </div>

        @if (loading()) {
          <div class="divide-y divide-slate-100">
            @for (row of skeletonRows; track row) {
              <div class="grid gap-3 px-5 py-4 md:grid-cols-[1.2fr_1fr_140px_150px_120px] md:items-center">
                <div class="h-4 rounded bg-slate-100"></div>
                <div class="h-4 rounded bg-slate-100"></div>
                <div class="h-7 rounded-full bg-slate-100"></div>
                <div class="h-4 rounded bg-slate-100"></div>
                <div class="h-8 rounded bg-slate-100"></div>
              </div>
            }
          </div>
        } @else if (!configs().length) {
          <div class="px-5 py-14 text-center">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-lg font-bold text-rose-600">
              ig
            </div>
            <h3 class="mt-4 text-base font-semibold text-slate-950">Connect your first Instagram app</h3>
            <p class="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Add an Instagram App ID and App Secret to start connecting Instagram profiles.
            </p>
            <button
              type="button"
              class="mt-5 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
              (click)="openCreateForm()"
            >
              Connect Instagram
            </button>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full min-w-[760px] text-left">
              <thead class="text-xs uppercase text-slate-400">
                <tr>
                  <th class="px-5 py-3 font-semibold">App Name</th>
                  <th class="px-5 py-3 font-semibold">App ID</th>
                  <th class="px-5 py-3 font-semibold">Status</th>
                  <th class="px-5 py-3 font-semibold">Date Added</th>
                  <th class="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (config of pagedConfigs(); track config.id) {
                  <tr class="border-b border-slate-100 transition hover:bg-slate-50/80">
                    <td class="px-5 py-4">
                      <p class="font-medium text-slate-900">{{ config.label || 'Instagram App' }}</p>
                    </td>
                    <td class="px-5 py-4 text-sm text-slate-600">{{ config.appId }}</td>
                    <td class="px-5 py-4">
                      <span
                        class="rounded-full px-2.5 py-1 text-xs font-semibold"
                        [class.bg-emerald-50]="appConnected(config)"
                        [class.text-emerald-700]="appConnected(config)"
                        [class.bg-slate-100]="!appConnected(config)"
                        [class.text-slate-600]="!appConnected(config)"
                      >
                        {{ appConnected(config) ? 'Connected' : 'Not Connected' }}
                      </span>
                    </td>
                    <td class="px-5 py-4 text-sm text-slate-500">
                      {{ config.createdAt ? (config.createdAt | date: 'MMM d, y') : 'N/A' }}
                    </td>
                    <td class="px-5 py-4 text-right">
                      <button
                        type="button"
                        class="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                        [disabled]="busy()"
                        (click)="startInstagramLogin(config)"
                      >
                        {{ busyConfigId() === config.id ? 'Opening...' : 'Connect Instagram' }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="flex flex-col gap-3 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>{{ pageRange() }}</p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                [disabled]="pageIndex() === 0"
                (click)="goToPage(pageIndex() - 1)"
              >
                ‹
              </button>
              <button
                type="button"
                class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                [disabled]="pageIndex() >= totalPages() - 1"
                (click)="goToPage(pageIndex() + 1)"
              >
                ›
              </button>
            </div>
          </div>
        }
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-base font-semibold text-slate-950">Connected Instagram profiles</h2>
            <p class="mt-1 text-sm text-slate-500">{{ profileSummary() }}</p>
          </div>
        </div>

        @if (!connectedAccounts().length) {
          <div class="px-5 py-10 text-center">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-500">
              ig
            </div>
            <h3 class="mt-4 text-base font-semibold text-slate-950">No Instagram profile connected</h3>
            <p class="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Save an Instagram app, then use Connect Instagram to authorize your profile.
            </p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full min-w-[760px] text-left">
              <thead class="text-xs uppercase text-slate-400">
                <tr>
                  <th class="px-5 py-3 font-semibold">Profile</th>
                  <th class="px-5 py-3 font-semibold">Instagram ID</th>
                  <th class="px-5 py-3 font-semibold">Status</th>
                  <th class="px-5 py-3 font-semibold">Connected</th>
                  <th class="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (account of connectedAccounts(); track account.id) {
                  <tr class="border-b border-slate-100 transition hover:bg-slate-50/80">
                    <td class="px-5 py-4">
                      <p class="font-medium text-slate-900">
                        {{ account.displayName || 'Instagram profile' }}
                      </p>
                    </td>
                    <td class="px-5 py-4 text-sm text-slate-600">{{ account.externalAccountId }}</td>
                    <td class="px-5 py-4">
                      <span
                        class="rounded-full px-2.5 py-1 text-xs font-semibold"
                        [class.bg-emerald-50]="account.status === 'CONNECTED'"
                        [class.text-emerald-700]="account.status === 'CONNECTED'"
                        [class.bg-amber-50]="account.status === 'REAUTH_REQUIRED'"
                        [class.text-amber-700]="account.status === 'REAUTH_REQUIRED'"
                        [class.bg-slate-100]="account.status !== 'CONNECTED' && account.status !== 'REAUTH_REQUIRED'"
                        [class.text-slate-600]="account.status !== 'CONNECTED' && account.status !== 'REAUTH_REQUIRED'"
                      >
                        {{ account.status === 'CONNECTED' ? 'Connected' : account.status }}
                      </span>
                    </td>
                    <td class="px-5 py-4 text-sm text-slate-500">
                      {{ account.createdAt | date: 'MMM d, y' }}
                    </td>
                    <td class="relative px-5 py-4 text-right">
                      <button
                        type="button"
                        class="rounded-lg border border-slate-200 px-2.5 py-1.5 text-lg leading-none text-slate-500 hover:bg-white"
                        (click)="toggleProfileMenu(account.id)"
                        aria-label="Open profile actions"
                      >
                        ...
                      </button>
                      @if (openProfileMenuId() === account.id) {
                        <div class="absolute right-5 top-12 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1 text-left shadow-lg">
                          <button
                            type="button"
                            class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            [disabled]="busy()"
                            (click)="reconnectAccount(account)"
                          >
                            <span class="text-xs">↗</span>
                            Reconnect
                          </button>
                          <button
                            type="button"
                            class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            [disabled]="busy()"
                            (click)="updateAccount(account)"
                          >
                            <span class="text-xs">✎</span>
                            Update
                          </button>
                          <button
                            type="button"
                            class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
                            [disabled]="busy()"
                            (click)="removeAccount(account)"
                          >
                            <span class="text-xs">⌫</span>
                            Remove
                          </button>
                        </div>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  `,
})
export class InstagramIntegrations implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SocialIntegrationsService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly configs = signal<FacebookCredentialConfig[]>([]);
  protected readonly connectedAccounts = signal<SocialIntegration[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  protected readonly secretVisible = signal(false);
  protected readonly busyConfigId = signal<number | null>(null);
  protected readonly openProfileMenuId = signal<number | null>(null);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = 10;
  protected readonly skeletonRows = Array.from({ length: 5 }, (_, index) => index);

  protected readonly form = this.fb.nonNullable.group({
    label: ['Instagram app', Validators.required],
    appId: ['', Validators.required],
    appSecret: ['', Validators.required],
    redirectUri: [this.defaultRedirectUri(), Validators.required],
  });

  protected readonly pagedConfigs = computed(() => {
    const start = this.pageIndex() * this.pageSize;
    return this.configs().slice(start, start + this.pageSize);
  });
  protected readonly totalPages = computed(() => Math.max(Math.ceil(this.configs().length / this.pageSize), 1));
  protected readonly tableSummary = computed(() => {
    const total = this.configs().length;
    return total ? `${total} Instagram app${total === 1 ? '' : 's'} added` : 'No Instagram apps added yet';
  });
  protected readonly profileSummary = computed(() => {
    const total = this.connectedAccounts().length;
    return total
      ? `${total} Instagram profile${total === 1 ? '' : 's'} connected`
      : 'No Instagram profile connected';
  });
  protected readonly pageRange = computed(() => {
    const total = this.configs().length;
    if (!total) {
      return '0 apps';
    }
    const start = this.pageIndex() * this.pageSize + 1;
    const end = Math.min(start + this.pagedConfigs().length - 1, total);
    return `${start}-${end} of ${total}`;
  });

  ngOnInit(): void {
    this.form.patchValue({ redirectUri: this.defaultRedirectUri() });
    if (!this.handleOAuthReturn()) {
      this.load();
    }
  }

  protected openCreateForm(): void {
    this.form.reset({
      label: 'Instagram app',
      appId: '',
      appSecret: '',
      redirectUri: this.defaultRedirectUri(),
    });
    this.secretVisible.set(false);
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.form.reset({
      label: 'Instagram app',
      appId: '',
      appSecret: '',
      redirectUri: this.defaultRedirectUri(),
    });
  }

  protected saveApp(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.service
      .createInstagramCredentialConfig({
        label: raw.label.trim() || 'Instagram app',
        appId: raw.appId.trim(),
        appSecret: raw.appSecret.trim(),
        redirectUri: raw.redirectUri.trim() || this.defaultRedirectUri(),
        scopes: INSTAGRAM_APP_SCOPES,
      })
      .subscribe({
        next: () => {
          this.notifications.success('Instagram app saved');
          this.saving.set(false);
          this.closeForm();
          this.load();
        },
        error: (err) => {
          this.notifications.error(this.errorMessage(err, 'Could not save Instagram app'));
          this.saving.set(false);
        },
      });
  }

  protected invalid(key: string): boolean {
    const control = this.form.get(key);
    return !!control && control.invalid && control.touched;
  }

  protected goToPage(page: number): void {
    this.pageIndex.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }

  protected toggleProfileMenu(id: number): void {
    this.openProfileMenuId.update((current) => (current === id ? null : id));
  }

  protected appConnected(config: FacebookCredentialConfig): boolean {
    return this.connectedAccounts().some((account) => account.appCredentialId === config.id);
  }

  protected connectPrimaryApp(): void {
    const config = this.configs()[0];
    if (!config) {
      this.openCreateForm();
      return;
    }
    void this.startInstagramLogin(config);
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

  protected updateAccount(account: SocialIntegration): void {
    this.openProfileMenuId.set(null);
    const config = this.configForAccount(account);
    if (!config) {
      this.notifications.error('No Instagram app is available to update this account.');
      return;
    }
    void this.startInstagramLogin(config);
  }

  protected reconnectAccount(account: SocialIntegration): void {
    this.openProfileMenuId.set(null);
    const config = this.configForAccount(account);
    if (!config) {
      this.notifications.error('No Instagram app is available to reconnect this account.');
      return;
    }
    void this.startInstagramLogin(config);
  }

  protected async removeAccount(account: SocialIntegration): Promise<void> {
    this.openProfileMenuId.set(null);
    const ok = await this.confirm.ask(
      `Remove ${account.displayName || account.externalAccountId}? Scheduled draft posts will remain, but this Instagram profile will no longer be available for publishing.`,
      'Remove Instagram account',
      'Remove',
    );
    if (!ok) {
      return;
    }
    this.busy.set(true);
    this.service.disconnect(account.id).subscribe({
      next: () => {
        this.notifications.success('Instagram account removed');
        this.busy.set(false);
        this.load(false);
      },
      error: (err) => {
        this.notifications.error(this.errorMessage(err, 'Could not remove Instagram account'));
        this.busy.set(false);
      },
    });
  }

  private configForAccount(account: SocialIntegration): FacebookCredentialConfig | null {
    if (account.appCredentialId) {
      return this.configs().find((config) => config.id === account.appCredentialId) ?? null;
    }
    return this.configs()[0] ?? null;
  }

  protected defaultRedirectUri(): string {
    return `${window.location.origin}/settings/social-integrations/instagram`;
  }

  protected openSetupGuide(): void {
    const guideWindow = window.open(INSTAGRAM_GUIDE_URL, '_blank', 'noopener,noreferrer');
    if (!guideWindow) {
      this.notifications.error('Allow popups for this site to open the Instagram guide.');
    }
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
        this.pageIndex.set(Math.min(this.pageIndex(), this.totalPages() - 1));
        this.showForm.set(!configs.length);
        this.loading.set(false);
      })
      .catch((err) => {
        this.notifications.error(this.errorMessage(err, 'Could not load Instagram integrations'));
        this.configs.set([]);
        this.connectedAccounts.set([]);
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
const INSTAGRAM_GUIDE_URL = '/instagram_app_setup_instruction_simple.html';
