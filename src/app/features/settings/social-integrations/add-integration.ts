import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PlatformConfig, PLATFORM_CONFIGS } from './platform-fields';
import { SocialIntegrationsService } from './social-integrations.service';

/**
 * Add Integration: pick a platform (only enabled ones are selectable), then fill
 * the platform-specific credential fields. Both the selector and the field set
 * are driven by {@link PLATFORM_CONFIGS}, so new platforms need no code changes.
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

    <!-- Step 2: credential fields for the chosen platform -->
    @if (selected(); as cfg) {
      <form
        [formGroup]="form()!"
        (ngSubmit)="submit()"
        class="max-w-lg rounded-xl border border-slate-200 bg-white p-6"
      >
        <h3 class="mb-4 text-base font-semibold text-slate-800">Connect {{ cfg.label }}</h3>

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

        <div class="mt-6 flex gap-2">
          <button
            type="submit"
            [disabled]="submitting()"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {{ submitting() ? 'Connecting…' : 'Connect' }}
          </button>
          <a routerLink="/settings/social-integrations" class="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </a>
        </div>
      </form>
    }
  `,
})
export class AddIntegration {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SocialIntegrationsService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly configs = PLATFORM_CONFIGS;
  protected readonly selected = signal<PlatformConfig | null>(null);
  protected readonly form = signal<FormGroup | null>(null);
  protected readonly submitting = signal(false);

  protected select(cfg: PlatformConfig): void {
    if (!cfg.enabled) {
      return;
    }
    const controls: Record<string, unknown> = {};
    for (const field of cfg.fields) {
      controls[field.key] = ['', field.required ? Validators.required : []];
    }
    this.selected.set(cfg);
    this.form.set(this.fb.group(controls));
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

  protected submit(): void {
    const cfg = this.selected();
    const form = this.form();
    if (!cfg || !form) {
      return;
    }
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const credentials = form.value as Record<string, string>;
    this.service.connect({ platform: cfg.platform, credentials }).subscribe({
      next: (integration) => {
        this.notifications.success(`Connected ${integration.displayName || integration.platform}`);
        this.router.navigate(['/settings/social-integrations']);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.notifications.error(err.error?.message ?? 'Failed to connect integration');
      },
    });
  }
}
