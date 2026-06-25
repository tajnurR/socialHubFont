import { Component, inject, OnInit, signal } from '@angular/core';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { ProviderInfo } from '../../shared/models/social-platform.model';
import { AccountsService } from './accounts.service';

/**
 * Connected accounts page. Lists the social platforms the backend supports
 * (GET /integrations/providers) as a starting point for account connection UX.
 */
@Component({
  selector: 'app-accounts',
  imports: [PageHeader],
  template: `
    <app-page-header
      title="Accounts"
      subtitle="Social platforms available to connect"
    />

    @if (loading()) {
      <p class="text-sm text-slate-400">Loading providers…</p>
    } @else if (error()) {
      <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        {{ error() }}
      </div>
    } @else {
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (provider of providers(); track provider.platform) {
          <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5">
            <div>
              <p class="font-semibold text-slate-800">{{ provider.platform }}</p>
              <p class="text-xs text-slate-400">
                {{ provider.enabled ? 'Available' : 'Disabled' }}
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              Connect
            </button>
          </div>
        } @empty {
          <p class="text-sm text-slate-400">No providers registered.</p>
        }
      </div>
    }
  `,
})
export class Accounts implements OnInit {
  private readonly accountsService = inject(AccountsService);

  protected readonly providers = signal<ProviderInfo[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.accountsService.listProviders().subscribe({
      next: (providers) => {
        this.providers.set(providers);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load providers — is the backend running?');
        this.loading.set(false);
      },
    });
  }
}
