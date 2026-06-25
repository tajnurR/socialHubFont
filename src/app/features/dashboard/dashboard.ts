import { Component, inject, OnInit } from '@angular/core';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatCard } from '../../shared/components/stat-card/stat-card';
import { DashboardStore } from './dashboard.store';

/** Dashboard landing page. Pulls a KPI summary from the backend via the store. */
@Component({
  selector: 'app-dashboard',
  imports: [PageHeader, StatCard],
  providers: [DashboardStore],
  template: `
    <app-page-header
      title="Dashboard"
      subtitle="Overview of your connected accounts and content performance"
    />

    @if (store.error(); as error) {
      <div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        {{ error }}
      </div>
    }

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <app-stat-card label="Connected accounts" [value]="store.stats().accounts" />
      <app-stat-card label="Total posts" [value]="store.stats().posts" />
      <app-stat-card label="Impressions" [value]="store.stats().impressions" />
      <app-stat-card label="Engagements" [value]="store.stats().engagements" />
    </div>

    <div class="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
      Charts and recent activity will appear here once integrations are implemented.
    </div>
  `,
})
export class Dashboard implements OnInit {
  protected readonly store = inject(DashboardStore);

  ngOnInit(): void {
    this.store.load();
  }
}
