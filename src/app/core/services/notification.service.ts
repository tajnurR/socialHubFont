import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info';

export interface AppNotification {
  id: number;
  type: NotificationType;
  message: string;
}

/**
 * App-wide toast notifications (signal-based). Rendered by the `Toast` component
 * in the shell. Auto-dismiss after a few seconds.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _items = signal<AppNotification[]>([]);
  readonly items = this._items.asReadonly();
  private seq = 0;

  success(message: string): void {
    this.push('success', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  info(message: string): void {
    this.push('info', message);
  }

  dismiss(id: number): void {
    this._items.update((list) => list.filter((n) => n.id !== id));
  }

  private push(type: NotificationType, message: string): void {
    const id = ++this.seq;
    this._items.update((list) => [...list, { id, type, message }]);
    setTimeout(() => this.dismiss(id), 4500);
  }
}
