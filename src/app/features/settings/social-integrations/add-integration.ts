import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import {
  FacebookCredentialConfig,
  FacebookPageOption,
} from '../../../shared/models/social-integration.model';
import { FacebookAuthService } from './facebook-auth.service';
import { SocialIntegrationsService } from './social-integrations.service';

type FormMode = 'create' | 'update';

@Component({
  selector: 'app-add-integration',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, PageHeader],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <app-page-header
          title="Facebook Connection"
          subtitle="Manage your Facebook app credentials before connecting Pages"
        />
        <a
          routerLink="/settings/social-integrations"
          class="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
        >
          Back
        </a>
      </div>

      @if (!showForm()) {
        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="max-w-2xl">
              <p class="text-xs font-semibold uppercase text-[#1877F2]">Facebook apps</p>
              <h2 class="mt-1 text-xl font-semibold text-slate-950">Connect your Facebook app</h2>
              <p class="mt-2 text-sm leading-6 text-slate-500">
                Add the Meta App ID and App Secret owned by your account. Secrets are encrypted and scoped to the logged-in user.
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#166fe0]"
              (click)="openCreateForm()"
            >
              Connect Facebook
            </button>
          </div>
        </section>
      }

      @if (showForm()) {
        <section class="mx-auto max-w-[480px] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase text-[#1877F2]">
                {{ formMode() === 'create' ? 'New app' : 'Update app' }}
              </p>
              <h2 class="mt-1 text-lg font-semibold text-slate-950">
                {{ formMode() === 'create' ? 'Connect Facebook' : 'Edit Facebook app' }}
              </h2>
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
                placeholder="Main Meta app"
                class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#1877F2]"
              />
              @if (invalid('label')) {
                <p class="mt-1 text-xs text-red-600">App Name is required.</p>
              }
            </label>

            <label class="block">
              <span class="text-sm font-medium text-slate-700">App ID</span>
              <input
                type="text"
                formControlName="appId"
                class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#1877F2]"
              />
              @if (invalid('appId')) {
                <p class="mt-1 text-xs text-red-600">App ID is required.</p>
              }
            </label>

            <label class="block">
              <span class="text-sm font-medium text-slate-700">App Secret</span>
              <div class="mt-1 flex rounded-xl border border-slate-300 focus-within:border-[#1877F2]">
                <input
                  [type]="secretVisible() ? 'text' : 'password'"
                  formControlName="appSecret"
                  [placeholder]="formMode() === 'update' ? 'Leave blank to keep existing secret' : ''"
                  class="min-w-0 flex-1 rounded-l-xl border-0 px-3 py-2.5 text-sm outline-none"
                />
                <button
                  type="button"
                  class="rounded-r-xl px-3 text-sm font-medium text-slate-500 hover:bg-slate-50"
                  (click)="secretVisible.update((value) => !value)"
                  [attr.aria-label]="secretVisible() ? 'Hide App Secret' : 'Show App Secret'"
                >
                  {{ secretVisible() ? 'Hide' : 'Show' }}
                </button>
              </div>
              <p class="mt-1 text-xs text-slate-400">We encrypt this secret before storing it.</p>
              @if (invalid('appSecret')) {
                <p class="mt-1 text-xs text-red-600">App Secret is required.</p>
              }
            </label>

            <button
              type="submit"
              [disabled]="saving()"
              class="w-full rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#166fe0] disabled:opacity-60"
            >
              {{ saving() ? 'Saving...' : formMode() === 'create' ? 'Save Facebook App' : 'Update Facebook App' }}
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
              <div class="grid gap-3 px-5 py-4 md:grid-cols-[1.2fr_1fr_140px_150px_48px] md:items-center">
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
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-[#1877F2]">
              f
            </div>
            <h3 class="mt-4 text-base font-semibold text-slate-950">Connect your first Facebook app</h3>
            <p class="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Add a Meta App ID and App Secret to start connecting Facebook Pages.
            </p>
            <button
              type="button"
              class="mt-5 rounded-lg bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#166fe0]"
              (click)="openCreateForm()"
            >
              Connect Facebook
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
                      <p class="font-medium text-slate-900">{{ config.label || 'Facebook App' }}</p>
                    </td>
                    <td class="px-5 py-4 text-sm text-slate-600">{{ config.appId }}</td>
                    <td class="px-5 py-4">
                      <span
                        class="rounded-full px-2.5 py-1 text-xs font-semibold"
                        [class.bg-emerald-50]="config.connected"
                        [class.text-emerald-700]="config.connected"
                        [class.bg-slate-100]="!config.connected"
                        [class.text-slate-600]="!config.connected"
                      >
                        {{ config.connected ? 'Connected' : 'Not Connected' }}
                      </span>
                    </td>
                    <td class="px-5 py-4 text-sm text-slate-500">
                      {{ config.createdAt ? (config.createdAt | date: 'MMM d, y') : 'N/A' }}
                    </td>
                    <td class="relative px-5 py-4 text-right">
                      <button
                        type="button"
                        class="rounded-lg border border-slate-200 px-2.5 py-1.5 text-lg leading-none text-slate-500 hover:bg-white"
                        (click)="toggleMenu(config.id)"
                        aria-label="Open row actions"
                      >
                        ...
                      </button>
                      @if (openMenuId() === config.id) {
                        <div class="absolute right-5 top-12 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1 text-left shadow-lg">
                          <button
                            type="button"
                            class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            (click)="connectPages(config)"
                          >
                            <span class="text-xs">↗</span>
                            Connect Page
                          </button>
                          <button
                            type="button"
                            class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            (click)="openUpdateForm(config)"
                          >
                            <span class="text-xs">✎</span>
                            Update
                          </button>
                          <button
                            type="button"
                            class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
                            (click)="removeApp(config)"
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

      @if (pages(); as pageOptions) {
        <section class="mx-auto max-w-[520px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="mb-4">
            <h2 class="text-base font-semibold text-slate-950">Select Facebook Pages</h2>
            <p class="mt-1 text-sm text-slate-500">Choose Pages to connect using {{ selectedConfig()?.label || selectedConfig()?.appId }}.</p>
          </div>
          <div class="space-y-2">
            @for (page of pageOptions; track page.id) {
              <label class="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-[#1877F2]"
                  [checked]="isPageSelected(page.id)"
                  (change)="togglePage(page.id)"
                />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-slate-900">{{ page.name || page.id }}</span>
                  <span class="block truncate text-xs text-slate-400">{{ page.id }}</span>
                </span>
              </label>
            }
          </div>
          <button
            type="button"
            [disabled]="saving() || !selectedPageCount()"
            class="mt-4 w-full rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white hover:bg-[#166fe0] disabled:opacity-60"
            (click)="connectSelectedPages()"
          >
            {{ saving() ? 'Connecting...' : 'Connect selected Pages' }}
          </button>
        </section>
      }
    </div>
  `,
})
export class AddIntegration implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SocialIntegrationsService);
  private readonly facebookAuth = inject(FacebookAuthService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);

  protected readonly configs = signal<FacebookCredentialConfig[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  protected readonly formMode = signal<FormMode>('create');
  protected readonly secretVisible = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly openMenuId = signal<number | null>(null);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = 10;
  protected readonly pages = signal<FacebookPageOption[] | null>(null);
  protected readonly selectedPageIds = signal<Set<string>>(new Set());
  protected readonly selectedCredentialConfigId = signal<number | null>(null);
  protected readonly skeletonRows = Array.from({ length: 5 }, (_, index) => index);
  private exchangeId: string | null = null;

  protected readonly form = this.fb.nonNullable.group({
    label: ['', Validators.required],
    appId: ['', Validators.required],
    appSecret: ['', Validators.required],
  });

  protected readonly pagedConfigs = computed(() => {
    const start = this.pageIndex() * this.pageSize;
    return this.configs().slice(start, start + this.pageSize);
  });
  protected readonly totalPages = computed(() => Math.max(Math.ceil(this.configs().length / this.pageSize), 1));
  protected readonly tableSummary = computed(() => {
    const total = this.configs().length;
    return total ? `${total} Facebook app${total === 1 ? '' : 's'} added` : 'No Facebook apps added yet';
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
    this.loadConfigs();
  }

  protected openCreateForm(): void {
    this.formMode.set('create');
    this.editingId.set(null);
    this.form.reset({ label: '', appId: '', appSecret: '' });
    this.form.get('appSecret')?.addValidators(Validators.required);
    this.form.get('appSecret')?.updateValueAndValidity();
    this.secretVisible.set(false);
    this.showForm.set(true);
    this.pages.set(null);
  }

  protected openUpdateForm(config: FacebookCredentialConfig): void {
    this.formMode.set('update');
    this.editingId.set(config.id);
    this.form.reset({
      label: config.label || '',
      appId: config.appId,
      appSecret: '',
    });
    this.form.get('appSecret')?.removeValidators(Validators.required);
    this.form.get('appSecret')?.updateValueAndValidity();
    this.secretVisible.set(false);
    this.showForm.set(true);
    this.openMenuId.set(null);
    this.pages.set(null);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.form.reset({ label: '', appId: '', appSecret: '' });
    this.editingId.set(null);
  }

  protected saveApp(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.saving.set(true);
    const request$ =
      this.formMode() === 'create'
        ? this.service.createFacebookCredentialConfig(raw)
        : this.service.updateFacebookCredentialConfig(this.editingId()!, {
            label: raw.label,
            appId: raw.appId,
            appSecret: raw.appSecret || null,
          });
    request$.subscribe({
      next: () => {
        this.notifications.success(
          this.formMode() === 'create' ? 'Facebook app saved' : 'Facebook app updated',
        );
        this.saving.set(false);
        this.closeForm();
        this.loadConfigs();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.notifications.error(this.errorMessage(err, 'Could not save Facebook app'));
      },
    });
  }

  protected invalid(key: string): boolean {
    const control = this.form.get(key);
    return !!control && control.invalid && control.touched;
  }

  protected toggleMenu(id: number): void {
    this.openMenuId.update((current) => (current === id ? null : id));
  }

  protected goToPage(page: number): void {
    this.pageIndex.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
  }

  protected async removeApp(config: FacebookCredentialConfig): Promise<void> {
    this.openMenuId.set(null);
    const ok = await this.confirm.ask(
      `Remove ${config.label || config.appId}? This only hides the app from future Facebook connections.`,
      'Remove Facebook app',
      'Remove',
    );
    if (!ok) {
      return;
    }
    this.saving.set(true);
    this.service.deleteFacebookCredentialConfig(config.id).subscribe({
      next: () => {
        this.notifications.success('Facebook app removed');
        this.saving.set(false);
        this.loadConfigs();
      },
      error: () => {
        this.notifications.error('Could not remove Facebook app');
        this.saving.set(false);
      },
    });
  }

  protected async connectPages(config: FacebookCredentialConfig): Promise<void> {
    this.openMenuId.set(null);
    this.selectedCredentialConfigId.set(config.id);
    this.selectedPageIds.set(new Set());
    this.pages.set(null);
    this.saving.set(true);
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
      this.saving.set(false);
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
    this.saving.set(true);
    try {
      const integrations = await firstValueFrom(
        this.service.facebookConnectPages(this.exchangeId, pageIds),
      );
      this.notifications.success(
        `Connected ${integrations.length} Page${integrations.length === 1 ? '' : 's'}`,
      );
      this.pages.set(null);
      this.selectedPageIds.set(new Set());
      this.exchangeId = null;
      this.loadConfigs();
      this.router.navigate(['/settings/social-integrations']);
    } catch (err) {
      this.notifications.error(this.errorMessage(err, 'Could not connect the selected Pages'));
    } finally {
      this.saving.set(false);
    }
  }

  protected selectedConfig(): FacebookCredentialConfig | null {
    const id = this.selectedCredentialConfigId();
    return this.configs().find((config) => config.id === id) ?? null;
  }

  protected isPageSelected(pageId: string): boolean {
    return this.selectedPageIds().has(pageId);
  }

  protected selectedPageCount(): number {
    return this.selectedPageIds().size;
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

  private loadConfigs(): void {
    this.loading.set(true);
    this.service.facebookCredentialConfigs().subscribe({
      next: (configs) => {
        this.configs.set(configs);
        this.pageIndex.set(Math.min(this.pageIndex(), this.totalPages() - 1));
        this.loading.set(false);
      },
      error: () => {
        this.notifications.error('Could not load Facebook apps');
        this.configs.set([]);
        this.loading.set(false);
      },
    });
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
