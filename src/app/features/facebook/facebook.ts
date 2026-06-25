import { Component } from '@angular/core';
import { PageHeader } from '../../shared/components/page-header/page-header';

/** Facebook feature placeholder. Build platform-specific views here. */
@Component({
  selector: 'app-facebook',
  imports: [PageHeader],
  template: `
    <app-page-header title="Facebook" subtitle="Manage your Facebook presence" />
    <div class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
      Facebook integration coming soon.
    </div>
  `,
})
export class Facebook {}
