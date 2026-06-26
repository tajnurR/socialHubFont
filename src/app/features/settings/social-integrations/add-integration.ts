import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import {
  FacebookCredentialConfig,
  FacebookCredentialStatus,
  FacebookPageOption,
} from '../../../shared/models/social-integration.model';
import { SocialPlatform } from '../../../shared/models/social-platform.model';
import { FacebookAuthService } from './facebook-auth.service';
import { PlatformConfig, PLATFORM_CONFIGS } from './platform-fields';
import { SocialIntegrationsService } from './social-integrations.service';

/**
 * Add Integration flow:
 *   1. Pick a platform (dropdown; Facebook enabled, others "coming soon").
 *   2. (Facebook) Provide the org's own App ID + App Secret — validated & stored.
 *   3. Connect with Facebook (OAuth popup → page picker). Manual Page-ID/token
 *      entry remains under "Advanced".
 */
@Component({
  selector: 'app-add-integration',
  imports: [ReactiveFormsModule, RouterLink, PageHeader],
  template: `
    <app-page-header title="Add Integration" subtitle="Connect a social platform account" />

    <!-- Step 1: platform dropdown -->
    <div class="mb-4 max-w-lg">
      <label class="mb-1 block text-sm font-medium text-slate-700">Which social media?</label>
      <select
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        (change)="onPlatformChange($any($event.target).value)"
      >
        <option value="">Select a platform…</option>
        @for (cfg of configs; track cfg.platform) {
          <option [value]="cfg.platform" [disabled]="!cfg.enabled">
            {{ cfg.label }}{{ cfg.enabled ? '' : ' — coming soon' }}
          </option>
        }
      </select>
    </div>

    @if (platform() === 'FACEBOOK') {
      <div class="max-w-lg rounded-xl border border-slate-200 bg-white p-6">
        @if (loadingCred()) {
          <p class="text-sm text-slate-400">Checking your Facebook app credentials…</p>
        } @else {
          <!-- Step 2: per-user App ID / App Secret -->
          @if (showCredentialForm()) {
            <h3 class="mb-1 text-base font-semibold text-slate-800">Facebook App credentials</h3>
            <p class="mb-4 text-xs text-slate-400">
              From your Meta app at developers.facebook.com → Settings → Basic. The App Secret is
              stored encrypted and never shown again.
            </p>
            <form [formGroup]="credForm" (ngSubmit)="saveCredentials()">
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
                <label class="mb-1 block text-sm font-medium text-slate-700">App ID</label>
                <input
                  type="text"
                  formControlName="appId"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
                @if (credInvalid('appId')) {
                  <p class="mt-1 text-xs text-red-600">App ID is required.</p>
                }
              </div>
              <div class="mb-4">
                <label class="mb-1 block text-sm font-medium text-slate-700">App Secret</label>
                <input
                  type="password"
                  formControlName="appSecret"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
                @if (credInvalid('appSecret')) {
                  <p class="mt-1 text-xs text-red-600">App Secret is required.</p>
                }
              </div>
              <div class="flex gap-2">
                <button
                  type="submit"
                  [disabled]="busy()"
                  class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {{ busy() ? 'Validating…' : 'Validate & Save' }}
                </button>
                @if (credentialConfigs().length) {
                  <button
                    type="button"
                    class="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    (click)="cancelEdit()"
                  >
                    Cancel
                  </button>
                }
              </div>
            </form>
          }

          <!-- Step 3: connect with Facebook -->
          @if (showConnect()) {
            <h3 class="mb-1 text-base font-semibold text-slate-800">Connect your Page</h3>
            <p class="mb-4 text-xs text-slate-400">
              App credentials saved.
              <button
                type="button"
                class="text-indigo-600 hover:underline"
                (click)="editCredentials()"
              >
                Add another app
              </button>
            </p>

            <label class="mb-1 block text-sm font-medium text-slate-700">Facebook App config</label>
            <select
              class="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              [value]="selectedCredentialConfigId() ?? ''"
              (change)="selectCredentialConfig($any($event.target).value)"
            >
              @for (config of credentialConfigs(); track config.id) {
                <option [value]="config.id">
                  {{ config.label || config.appId }} ({{ config.appId }})
                </option>
              }
            </select>

            @if (pages(); as pageOptions) {
              <div class="mb-2 flex items-center justify-between gap-3">
                <p class="text-sm text-slate-600">Select Pages to connect:</p>
                <button
                  type="button"
                  class="text-xs font-medium text-indigo-600 hover:underline"
                  (click)="toggleAllPages()"
                >
                  {{ allPagesSelected() ? 'Clear all' : 'Select all' }}
                </button>
              </div>
              <div class="space-y-2">
                @for (page of pageOptions; track page.id) {
                  <label
                    class="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-4 py-2 text-left text-sm hover:border-indigo-300"
                  >
                    <input
                      type="checkbox"
                      class="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      [checked]="isPageSelected(page.id)"
                      (change)="togglePage(page.id)"
                    />
                    <span class="min-w-0 flex-1">
                      <span class="block truncate font-medium text-slate-800">{{
                        page.name || page.id
                      }}</span>
                      <span class="block truncate text-xs text-slate-400">{{ page.id }}</span>
                    </span>
                  </label>
                }
              </div>
              <button
                type="button"
                [disabled]="busy() || !selectedPageCount()"
                class="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                (click)="connectSelectedPages()"
              >
                {{ busy() ? 'Connecting…' : 'Connect selected Pages' }}
              </button>
            } @else {
              <button
                type="button"
                [disabled]="busy()"
                class="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#166fe0] disabled:opacity-60"
                (click)="connectWithFacebook()"
              >
                {{ busy() ? 'Connecting…' : 'Connect with Facebook' }}
              </button>

              <button
                type="button"
                class="mt-4 text-xs font-medium text-slate-500 hover:text-slate-700"
                (click)="toggleManual()"
              >
                {{ showManual() ? '▾' : '▸' }} Advanced: connect manually with a Page token
              </button>
              @if (showManual() && manualForm(); as form) {
                <form
                  [formGroup]="form"
                  (ngSubmit)="submitManual()"
                  class="mt-3 border-t border-slate-100 pt-3"
                >
                  @for (field of selectedConfig()?.fields ?? []; track field.key) {
                    <div class="mb-4">
                      <label class="mb-1 block text-sm font-medium text-slate-700">{{
                        field.label
                      }}</label>
                      <input
                        [type]="field.type"
                        [formControlName]="field.key"
                        [placeholder]="field.placeholder ?? ''"
                        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                      @if (field.helpText) {
                        <p class="mt-1 text-xs text-slate-400">{{ field.helpText }}</p>
                      }
                      @if (manualInvalid(field.key)) {
                        <p class="mt-1 text-xs text-red-600">{{ field.label }} is required.</p>
                      }
                    </div>
                  }
                  <button
                    type="submit"
                    [disabled]="busy()"
                    class="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    Connect manually
                  </button>
                </form>
              }
            }
          }
        }

        <div class="mt-6">
          <a
            routerLink="/settings/social-integrations"
            class="text-sm font-medium text-slate-600 hover:underline"
            >Cancel</a
          >
        </div>
      </div>
    }
  `,
})
export class AddIntegration {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SocialIntegrationsService);
  private readonly facebookAuth = inject(FacebookAuthService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly configs = PLATFORM_CONFIGS;

  protected readonly platform = signal<SocialPlatform | null>(null);
  protected readonly credStatus = signal<FacebookCredentialStatus | null>(null);
  protected readonly loadingCred = signal(false);
  protected readonly editingCredentials = signal(false);
  protected readonly busy = signal(false);
  protected readonly showManual = signal(false);
  protected readonly credentialConfigs = signal<FacebookCredentialConfig[]>([]);
  protected readonly selectedCredentialConfigId = signal<number | null>(null);
  protected readonly pages = signal<FacebookPageOption[] | null>(null);
  protected readonly selectedPageIds = signal<Set<string>>(new Set());
  private exchangeId: string | null = null;

  protected readonly credForm = this.fb.nonNullable.group({
    label: [''],
    appId: ['', Validators.required],
    appSecret: ['', Validators.required],
  });
  protected readonly manualForm = signal<FormGroup | null>(null);

  protected selectedConfig(): PlatformConfig | undefined {
    return this.configs.find((c) => c.platform === this.platform());
  }

  protected onPlatformChange(value: string): void {
    const cfg = this.configs.find((c) => c.platform === value && c.enabled);
    this.resetState();
    this.platform.set(cfg ? cfg.platform : null);
    if (!cfg) {
      return;
    }
    this.buildManualForm(cfg);
    if (cfg.platform === 'FACEBOOK') {
      this.loadCredentialStatus();
    }
  }

  protected showCredentialForm(): boolean {
    const status = this.credStatus();
    return !!status && (!this.credentialConfigs().length || this.editingCredentials());
  }

  protected showConnect(): boolean {
    return this.credentialConfigs().length > 0 && !this.editingCredentials();
  }

  protected editCredentials(): void {
    this.credForm.reset({ label: '', appId: '', appSecret: '' });
    this.editingCredentials.set(true);
    this.pages.set(null);
    this.selectedPageIds.set(new Set());
  }

  protected cancelEdit(): void {
    this.editingCredentials.set(false);
  }

  protected saveCredentials(): void {
    if (this.credForm.invalid) {
      this.credForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    const { label, appId, appSecret } = this.credForm.getRawValue();
    this.service.createFacebookCredentialConfig({ label, appId, appSecret }).subscribe({
      next: (config) => {
        this.busy.set(false);
        this.credentialConfigs.update((configs) => [...configs, config]);
        this.selectedCredentialConfigId.set(config.id);
        this.credStatus.set({ configured: true, appId: config.appId, appSecretMasked: '********' });
        this.editingCredentials.set(false);
        this.notifications.success('Facebook app credentials saved');
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.notifications.error(this.errorMessage(err, 'Could not validate credentials'));
      },
    });
  }

  protected toggleManual(): void {
    this.showManual.update((v) => !v);
  }

  protected async connectWithFacebook(): Promise<void> {
    const config = this.selectedCredentialConfig();
    if (!config) {
      this.notifications.error('Add Facebook app credentials before connecting Pages');
      return;
    }
    this.busy.set(true);
    try {
      const shortLivedToken = await this.facebookAuth.login(config.appId);
      const result = await firstValueFrom(
        this.service.facebookExchange(shortLivedToken, config.id),
      );
      this.exchangeId = result.exchangeId;
      this.pages.set(result.pages);
      this.selectedPageIds.set(new Set(result.pages.map((page) => page.id)));
    } catch (err) {
      this.notifications.error(this.errorMessage(err, 'Facebook login failed'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async connectSelectedPages(): Promise<void> {
    if (!this.exchangeId) {
      return;
    }
    const pageIds = [...this.selectedPageIds()];
    if (!pageIds.length) {
      this.notifications.error('Select at least one Page to connect');
      return;
    }
    this.busy.set(true);
    try {
      const integrations = await firstValueFrom(
        this.service.facebookConnectPages(this.exchangeId, pageIds),
      );
      this.notifications.success(
        `Connected ${integrations.length} Page${integrations.length === 1 ? '' : 's'}`,
      );
      this.router.navigate(['/settings/social-integrations']);
    } catch (err) {
      this.notifications.error(this.errorMessage(err, 'Could not connect the selected Pages'));
    } finally {
      this.busy.set(false);
    }
  }

  protected submitManual(): void {
    const cfg = this.selectedConfig();
    const form = this.manualForm();
    if (!cfg || !form) {
      return;
    }
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    const credentials = form.value as Record<string, string>;
    this.service.connect({ platform: cfg.platform, credentials }).subscribe({
      next: (integration) => {
        this.notifications.success(`Connected ${integration.displayName || integration.platform}`);
        this.router.navigate(['/settings/social-integrations']);
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.notifications.error(this.errorMessage(err, 'Failed to connect integration'));
      },
    });
  }

  protected credInvalid(key: string): boolean {
    const control = this.credForm.get(key);
    return !!control && control.invalid && control.touched;
  }

  protected manualInvalid(key: string): boolean {
    const control = this.manualForm()?.get(key);
    return !!control && control.invalid && control.touched;
  }

  protected selectCredentialConfig(value: string): void {
    const id = Number(value);
    this.selectedCredentialConfigId.set(Number.isFinite(id) ? id : null);
    this.pages.set(null);
    this.selectedPageIds.set(new Set());
    this.exchangeId = null;
  }

  protected selectedCredentialConfig(): FacebookCredentialConfig | null {
    const id = this.selectedCredentialConfigId();
    return this.credentialConfigs().find((config) => config.id === id) ?? null;
  }

  protected isPageSelected(pageId: string): boolean {
    return this.selectedPageIds().has(pageId);
  }

  protected selectedPageCount(): number {
    return this.selectedPageIds().size;
  }

  protected allPagesSelected(): boolean {
    const pages = this.pages() ?? [];
    return pages.length > 0 && pages.every((page) => this.selectedPageIds().has(page.id));
  }

  protected togglePage(pageId: string): void {
    this.selectedPageIds.update((current) => {
      const next = new Set(current);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  }

  protected toggleAllPages(): void {
    const pages = this.pages() ?? [];
    this.selectedPageIds.set(
      this.allPagesSelected() ? new Set() : new Set(pages.map((page) => page.id)),
    );
  }

  private buildManualForm(cfg: PlatformConfig): void {
    const controls: Record<string, unknown> = {};
    for (const field of cfg.fields) {
      controls[field.key] = ['', field.required ? Validators.required : []];
    }
    this.manualForm.set(this.fb.group(controls));
  }

  private loadCredentialStatus(): void {
    this.loadingCred.set(true);
    this.service.facebookCredentialConfigs().subscribe({
      next: (configs) => {
        this.credentialConfigs.set(configs);
        this.selectedCredentialConfigId.set(configs[0]?.id ?? null);
        this.credStatus.set(
          configs.length
            ? { configured: true, appId: configs[0].appId, appSecretMasked: '********' }
            : { configured: false },
        );
        this.loadingCred.set(false);
      },
      error: () => {
        this.credentialConfigs.set([]);
        this.selectedCredentialConfigId.set(null);
        this.credStatus.set({ configured: false });
        this.loadingCred.set(false);
      },
    });
  }

  private resetState(): void {
    this.credStatus.set(null);
    this.editingCredentials.set(false);
    this.credentialConfigs.set([]);
    this.selectedCredentialConfigId.set(null);
    this.pages.set(null);
    this.selectedPageIds.set(new Set());
    this.exchangeId = null;
    this.showManual.set(false);
    this.credForm.reset({ label: '', appId: '', appSecret: '' });
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
