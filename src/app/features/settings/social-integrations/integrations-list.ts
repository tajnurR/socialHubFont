import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SocialIntegration } from '../../../shared/models/social-integration.model';
import { FacebookAuthService } from './facebook-auth.service';
import { SocialIntegrationsService } from './social-integrations.service';

/** Lists connected integrations with actions: view posts, disconnect, add new. */
@Component({
  selector: 'app-integrations-list',
  imports: [RouterLink, PageHeader],
  template: `
    <div class="flex items-center justify-between">
      <app-page-header
        title="Social Media Integrations"
        subtitle="Connect platform accounts to view and publish content"
      />
      <a
        routerLink="add"
        class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        + Add Integration
      </a>
    </div>

    @if (loading()) {
      <p class="text-sm text-slate-400">Loading integrations…</p>
    } @else if (error()) {
      <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        {{ error() }}
      </div>
    } @else {
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        @for (it of integrations(); track it.id) {
          <div class="rounded-xl border border-slate-200 bg-white p-5">
            <div class="flex items-start justify-between">
              <div>
                <p class="font-semibold text-slate-800">{{ it.displayName || it.externalAccountId }}</p>
                <p class="text-xs text-slate-400">{{ it.platform }} · {{ it.externalAccountId }}</p>
                <p class="mt-1 text-xs text-slate-400">Token {{ it.accessTokenMasked }}</p>
              </div>
              <span class="rounded-full px-2 py-1 text-xs font-medium" [class]="statusClass(it.status)">
                {{ it.status === 'REAUTH_REQUIRED' ? 'Reconnect needed' : it.status }}
              </span>
            </div>

            @if (it.status === 'REAUTH_REQUIRED') {
              <p class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Facebook rejected the stored token. Reconnect to restore access.
              </p>
            }

            <div class="mt-4 flex flex-wrap gap-2">
              <a
                [routerLink]="[it.id, 'posts']"
                class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View posts
              </a>
              @if (it.platform === 'FACEBOOK') {
                <button
                  type="button"
                  [disabled]="busyId() === it.id"
                  class="rounded-lg bg-[#1877F2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#166fe0] disabled:opacity-60"
                  (click)="reconnect(it)"
                >
                  {{ busyId() === it.id ? 'Reconnecting…' : 'Reconnect' }}
                </button>
              }
              <button
                type="button"
                class="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                (click)="disconnect(it)"
              >
                Disconnect
              </button>
            </div>
          </div>
        } @empty {
          <div class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400 lg:col-span-2">
            No integrations yet. Click “Add Integration” to connect a Facebook Page.
          </div>
        }
      </div>
    }
  `,
})
export class IntegrationsList implements OnInit {
  private readonly service = inject(SocialIntegrationsService);
  private readonly facebookAuth = inject(FacebookAuthService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly integrations = signal<SocialIntegration[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected statusClass(status: string): string {
    switch (status) {
      case 'CONNECTED':
        return 'bg-emerald-50 text-emerald-700';
      case 'REAUTH_REQUIRED':
        return 'bg-amber-50 text-amber-700';
      default:
        return 'bg-red-50 text-red-700';
    }
  }

  /** Re-runs the Facebook OAuth popup and replaces the stored token in place. */
  protected async reconnect(integration: SocialIntegration): Promise<void> {
    this.busyId.set(integration.id);
    try {
      const creds = await firstValueFrom(this.service.facebookCredentialStatus());
      const shortLivedToken = await this.facebookAuth.login(creds.appId ?? '');
      const exchange = await firstValueFrom(this.service.facebookExchange(shortLivedToken));
      await firstValueFrom(this.service.reauth(integration.id, exchange.exchangeId));
      this.notifications.success('Integration reconnected');
      this.load();
    } catch (err) {
      this.notifications.error(this.errorMessage(err));
    } finally {
      this.busyId.set(null);
    }
  }

  private errorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      return err.error?.message ?? 'Could not reconnect the integration';
    }
    if (err instanceof Error) {
      return err.message;
    }
    return 'Could not reconnect the integration';
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list().subscribe({
      next: (items) => {
        this.integrations.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load integrations — is the backend running?');
        this.loading.set(false);
      },
    });
  }

  protected async disconnect(integration: SocialIntegration): Promise<void> {
    const ok = await this.confirm.ask(
      `Disconnect ${integration.displayName || integration.externalAccountId}? This removes its stored credentials.`,
      'Disconnect integration',
      'Disconnect',
    );
    if (!ok) {
      return;
    }
    this.service.disconnect(integration.id).subscribe({
      next: () => {
        this.notifications.success('Integration disconnected');
        this.load();
      },
      error: () => this.notifications.error('Failed to disconnect integration'),
    });
  }
}
