import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { FacebookPageOption } from '../../../shared/models/social-integration.model';
import { FacebookAuthService } from './facebook-auth.service';
import { PlatformConfig, PLATFORM_CONFIGS } from './platform-fields';
import { SocialIntegrationsService } from './social-integrations.service';

/**
 * Add Integration: pick a platform, then connect. For Facebook the primary path
 * is "Connect with Facebook" (OAuth popup → backend exchange → page picker);
 * manual Page-ID/token entry remains available under "Advanced". Both the
 * selector and the manual field set are driven by {@link PLATFORM_CONFIGS}.
 */
@Component({
  selector: 'app-add-integration',
  imports: [ReactiveFormsModule, RouterLink, PageHeader],
  template: `
    <app-page-header title="Add Integration" subtitle="Connect a social platform account" />

    <!-- Step 1: choose a platform -->
    <div class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      @for (cfg of configs; track cfg.platform) {
        <button
          type="button"
          class="rounded-xl border p-4 text-left transition"
          [class]="cardClass(cfg)"
          [disabled]="!cfg.enabled"
          (click)="select(cfg)"
        >
          <div class="flex items-center justify-between">
            <span class="font-semibold text-slate-800">{{ cfg.label }}</span>
            @if (!cfg.enabled) {
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Coming soon</span>
            }
          </div>
          @if (cfg.description) {
            <p class="mt-1 text-xs text-slate-400">{{ cfg.description }}</p>
          }
        </button>
      }
    </div>

    @if (selected(); as cfg) {
      <div class="max-w-lg rounded-xl border border-slate-200 bg-white p-6">
        <h3 class="mb-4 text-base font-semibold text-slate-800">Connect {{ cfg.label }}</h3>

        @if (pages(); as pageOptions) {
          <!-- Step 3 (multi-page): pick which Page to connect -->
          <p class="mb-2 text-sm text-slate-600">Select the Page to connect:</p>
          <div class="space-y-2">
            @for (page of pageOptions; track page.id) {
              <button
                type="button"
                [disabled]="busy()"
                class="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-2 text-left text-sm hover:border-indigo-300 disabled:opacity-60"
                (click)="connectPage(page)"
              >
                <span class="font-medium text-slate-800">{{ page.name || page.id }}</span>
                <span class="text-xs text-slate-400">{{ page.id }}</span>
              </button>
            }
          </div>
        } @else {
          <!-- Step 2: primary OAuth button -->
          <button
            type="button"
            [disabled]="busy() || !facebookConfigured"
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#166fe0] disabled:opacity-60"
            (click)="connectWithFacebook()"
          >
            {{ busy() ? 'Connecting…' : 'Connect with Facebook' }}
          </button>
          @if (!facebookConfigured) {
            <p class="mt-2 text-xs text-amber-600">
              Facebook login isn't configured (no App ID). Use the manual option below.
            </p>
          }

          <!-- Advanced / manual fallback -->
          <button
            type="button"
            class="mt-4 text-xs font-medium text-slate-500 hover:text-slate-700"
            (click)="toggleManual()"
          >
            {{ showManual() ? '▾' : '▸' }} Advanced: connect manually with a Page token
          </button>

          @if (showManual() && form()) {
            <form [formGroup]="form()!" (ngSubmit)="submitManual()" class="mt-3 border-t border-slate-100 pt-3">
              @for (field of cfg.fields; track field.key) {
                <div class="mb-4">
                  <label class="mb-1 block text-sm font-medium text-slate-700">{{ field.label }}</label>
                  <input
                    [type]="field.type"
                    [formControlName]="field.key"
                    [placeholder]="field.placeholder ?? ''"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  @if (field.helpText) {
                    <p class="mt-1 text-xs text-slate-400">{{ field.helpText }}</p>
                  }
                  @if (invalid(field.key)) {
                    <p class="mt-1 text-xs text-red-600">{{ field.label }} is required.</p>
                  }
                </div>
              }
              @if (cfg.docsUrl) {
                <a [href]="cfg.docsUrl" target="_blank" rel="noopener" class="text-xs text-indigo-600 hover:underline">
                  Where do I find these credentials? ↗
                </a>
              }
              <div class="mt-4">
                <button
                  type="submit"
                  [disabled]="busy()"
                  class="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  Connect manually
                </button>
              </div>
            </form>
          }
        }

        <div class="mt-6">
          <a routerLink="/settings/social-integrations" class="text-sm font-medium text-slate-600 hover:underline">
            Cancel
          </a>
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
  protected readonly facebookConfigured = this.facebookAuth.configured;

  protected readonly selected = signal<PlatformConfig | null>(null);
  protected readonly form = signal<FormGroup | null>(null);
  protected readonly showManual = signal(false);
  protected readonly busy = signal(false);

  // OAuth page-picker state
  protected readonly pages = signal<FacebookPageOption[] | null>(null);
  private exchangeId: string | null = null;

  protected select(cfg: PlatformConfig): void {
    if (!cfg.enabled) {
      return;
    }
    this.selected.set(cfg);
    this.pages.set(null);
    this.exchangeId = null;
    this.showManual.set(false);
    const controls: Record<string, unknown> = {};
    for (const field of cfg.fields) {
      controls[field.key] = ['', field.required ? Validators.required : []];
    }
    this.form.set(this.fb.group(controls));
  }

  protected toggleManual(): void {
    this.showManual.update((v) => !v);
  }

  protected async connectWithFacebook(): Promise<void> {
    this.busy.set(true);
    try {
      const shortLivedToken = await this.facebookAuth.login();
      const result = await firstValueFrom(this.service.facebookExchange(shortLivedToken));
      if (result.pages.length === 1) {
        await this.connectPage(result.pages[0], result.exchangeId);
        return;
      }
      this.exchangeId = result.exchangeId;
      this.pages.set(result.pages);
    } catch (err) {
      this.notifications.error(this.errorMessage(err, 'Facebook login failed'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async connectPage(page: FacebookPageOption, exchangeId = this.exchangeId): Promise<void> {
    if (!exchangeId) {
      return;
    }
    this.busy.set(true);
    try {
      const integration = await firstValueFrom(this.service.facebookConnect(exchangeId, page.id));
      this.notifications.success(`Connected ${integration.displayName || integration.platform}`);
      this.router.navigate(['/settings/social-integrations']);
    } catch (err) {
      this.notifications.error(this.errorMessage(err, 'Could not connect the selected Page'));
    } finally {
      this.busy.set(false);
    }
  }

  protected submitManual(): void {
    const cfg = this.selected();
    const form = this.form();
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

  protected invalid(key: string): boolean {
    const control = this.form()?.get(key);
    return !!control && control.invalid && control.touched;
  }

  protected cardClass(cfg: PlatformConfig): string {
    if (!cfg.enabled) {
      return 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60';
    }
    return this.selected()?.platform === cfg.platform
      ? 'border-indigo-500 bg-indigo-50'
      : 'border-slate-200 bg-white hover:border-indigo-300';
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
