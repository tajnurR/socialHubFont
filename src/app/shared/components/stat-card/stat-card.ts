import { Component, input } from '@angular/core';

/** Small KPI card used on the dashboard. */
@Component({
  selector: 'app-stat-card',
  template: `
    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p class="text-sm font-medium text-slate-500">{{ label() }}</p>
      <p class="mt-2 text-3xl font-bold text-slate-800">{{ value() }}</p>
      @if (hint()) {
        <p class="mt-1 text-xs text-slate-400">{{ hint() }}</p>
      }
    </div>
  `,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input<string>('');
}
