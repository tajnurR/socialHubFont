import { Injectable, signal } from '@angular/core';

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  resolve: (confirmed: boolean) => void;
}

/**
 * Promise-based confirm dialog. Call `ask(...)` and await the boolean; the
 * `ConfirmDialog` component (rendered in the shell) presents the modal.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<ConfirmRequest | null>(null);

  ask(message: string, title = 'Please confirm', confirmLabel = 'Confirm'): Promise<boolean> {
    return new Promise((resolve) => {
      this.request.set({ title, message, confirmLabel, resolve });
    });
  }

  respond(confirmed: boolean): void {
    const current = this.request();
    if (current) {
      current.resolve(confirmed);
      this.request.set(null);
    }
  }
}
