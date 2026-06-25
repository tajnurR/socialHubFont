import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiEndpoint } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { AnalyticsSummary } from '../../shared/models/analytics.model';

/**
 * Signal-based feature store — the reference pattern for state in this app.
 *
 * State is held in private signals and exposed read-only; async loads flip
 * `loading`/`error`. Scale this pattern per feature; reach for a dedicated state
 * library only if cross-feature coordination becomes complex.
 */
@Injectable()
export class DashboardStore {
  private readonly api = inject(ApiService);

  private readonly _summary = signal<AnalyticsSummary | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly summary = this._summary.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  /** Derived view models for the dashboard's stat cards. */
  readonly stats = computed(() => {
    const s = this._summary();
    return {
      accounts: s?.totalAccounts ?? 0,
      posts: s?.totalPosts ?? 0,
      impressions: s?.totalImpressions ?? 0,
      engagements: s?.totalEngagements ?? 0,
    };
  });

  load(): void {
    this._loading.set(true);
    this._error.set(null);
    this.api.get<AnalyticsSummary>(ApiEndpoint.ANALYTICS_SUMMARY).subscribe({
      next: (summary) => {
        this._summary.set(summary);
        this._loading.set(false);
      },
      error: () => {
        // Foundation stage: backend may be offline. Show zeros, surface a hint.
        this._error.set('Could not reach the analytics API — showing placeholder data.');
        this._loading.set(false);
      },
    });
  }
}
