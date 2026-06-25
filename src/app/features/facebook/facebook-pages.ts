import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { ConnectedPage } from '../../shared/models/facebook-analytics.model';
import { FacebookService } from './facebook.service';

/** Lists the org's connected Facebook Pages; clicking one opens its analytics. */
@Component({
  selector: 'app-facebook-pages',
  imports: [RouterLink, PageHeader],
  template: `
    <app-page-header title="Facebook" subtitle="Your connected Facebook Pages" />

    @if (loading()) {
      <p class="text-sm text-slate-400">Loading pages…</p>
    } @else if (error()) {
      <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        {{ error() }}
      </div>
    } @else {
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (page of pages(); track page.integrationId) {
          <a
            [routerLink]="[page.integrationId, 'analytics']"
            class="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"
          >
            <div class="flex items-start justify-between">
              <div>
                <p class="font-semibold text-slate-800">{{ page.name || page.pageId }}</p>
                <p class="text-xs text-slate-400">Page ID: {{ page.pageId }}</p>
              </div>
              <span
                class="rounded-full px-2 py-1 text-xs font-medium"
                [class]="page.status === 'CONNECTED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
              >
                {{ page.status === 'REAUTH_REQUIRED' ? 'Reconnect needed' : page.status }}
              </span>
            </div>
            <p class="mt-4 text-sm font-medium text-indigo-600">View analytics →</p>
          </a>
        } @empty {
          <div class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400 sm:col-span-2 lg:col-span-3">
            No connected Pages yet.
            <a routerLink="/settings/social-integrations" class="font-medium text-indigo-600 hover:underline">
              Connect a Facebook Page
            </a>
            to see analytics.
          </div>
        }
      </div>
    }
  `,
})
export class FacebookPages implements OnInit {
  private readonly facebook = inject(FacebookService);

  protected readonly pages = signal<ConnectedPage[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.facebook.pages().subscribe({
      next: (pages) => {
        this.pages.set(pages);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load your Facebook Pages — is the backend running?');
        this.loading.set(false);
      },
    });
  }
}
