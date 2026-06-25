import { Component, inject } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';

/** Modal confirm dialog driven by {@link ConfirmService}. */
@Component({
  selector: 'app-confirm-dialog',
  template: `
    @if (confirm.request(); as req) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div class="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
          <h3 class="text-lg font-semibold text-slate-800">{{ req.title }}</h3>
          <p class="mt-2 text-sm text-slate-600">{{ req.message }}</p>
          <div class="mt-6 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              (click)="confirm.respond(false)"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              (click)="confirm.respond(true)"
            >
              {{ req.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialog {
  protected readonly confirm = inject(ConfirmService);
}
