import { Component } from '@angular/core';
import { PageHeader } from '../../shared/components/page-header/page-header';

/** Instagram feature entry point. Connection lives under Social Integrations. */
@Component({
  selector: 'app-instagram',
  imports: [PageHeader],
  template: `
    <app-page-header title="Instagram" subtitle="Manage your Instagram presence" />
    <div class="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
      Connect Instagram accounts from Social Integrations, then create and schedule Instagram
      posts from Add Post and Schedules.
    </div>
  `,
})
export class Instagram {}
