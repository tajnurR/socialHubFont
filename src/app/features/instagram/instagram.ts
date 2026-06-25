import { Component } from '@angular/core';
import { PageHeader } from '../../shared/components/page-header/page-header';

/** Instagram feature placeholder. Build platform-specific views here. */
@Component({
  selector: 'app-instagram',
  imports: [PageHeader],
  template: `
    <app-page-header title="Instagram" subtitle="Manage your Instagram presence" />
    <div class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
      Instagram integration coming soon.
    </div>
  `,
})
export class Instagram {}
