import { Component } from '@angular/core';
import { PageHeader } from '../../shared/components/page-header/page-header';

/** WhatsApp feature placeholder. Build platform-specific views here. */
@Component({
  selector: 'app-whatsapp',
  imports: [PageHeader],
  template: `
    <app-page-header title="WhatsApp" subtitle="Manage your WhatsApp Business messaging" />
    <div class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
      WhatsApp integration coming soon.
    </div>
  `,
})
export class Whatsapp {}
