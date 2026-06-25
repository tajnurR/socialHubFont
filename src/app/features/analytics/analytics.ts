import { Component } from '@angular/core';
import { PageHeader } from '../../shared/components/page-header/page-header';

/** Analytics page placeholder. */
@Component({
  selector: 'app-analytics',
  imports: [PageHeader],
  template: `
    <app-page-header
      title="Analytics"
      subtitle="Cross-platform performance across all your posts"
    />
    <div class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
      Analytics dashboards will be built here.
    </div>
  `,
})
export class Analytics {}
