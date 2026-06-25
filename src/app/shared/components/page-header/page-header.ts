import { Component, input } from '@angular/core';

/** Reusable page heading with an optional subtitle. */
@Component({
  selector: 'app-page-header',
  template: `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800">{{ title() }}</h2>
      @if (subtitle()) {
        <p class="mt-1 text-sm text-slate-500">{{ subtitle() }}</p>
      }
    </div>
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
