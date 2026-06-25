import { Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';

/** Renders the active notifications as stacked toasts (top-right). */
@Component({
  selector: 'app-toast',
  template: `
    <div class="pointer-events-none fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
      @for (n of notifications.items(); track n.id) {
        <div
          class="pointer-events-auto flex items-start justify-between gap-3 rounded-lg px-4 py-3 text-sm shadow-lg"
          [class]="styles(n.type)"
        >
          <span>{{ n.message }}</span>
          <button type="button" class="font-bold opacity-70 hover:opacity-100" (click)="notifications.dismiss(n.id)">
            ×
          </button>
        </div>
      }
    </div>
  `,
})
export class Toast {
  protected readonly notifications = inject(NotificationService);

  protected styles(type: string): string {
    switch (type) {
      case 'success':
        return 'bg-emerald-600 text-white';
      case 'error':
        return 'bg-red-600 text-white';
      default:
        return 'bg-slate-800 text-white';
    }
  }
}
