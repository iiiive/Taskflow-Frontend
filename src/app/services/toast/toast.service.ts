import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

/**
 * App-wide toast queue. Toasts overlay the top-right of the screen, stack
 * (newest on top), auto-dismiss after a few seconds, and can be dismissed by
 * click. Rendered once by <app-toast-container> at the app root.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private seq = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  success(message: string, duration = 4000): void {
    this.push('success', message, duration);
  }

  error(message: string, duration = 6000): void {
    this.push('error', message, duration);
  }

  info(message: string, duration = 4000): void {
    this.push('info', message, duration);
  }

  dismiss(id: number): void {
    this._toasts.update(list => list.filter(t => t.id !== id));
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  private push(type: ToastType, message: string, duration: number): void {
    if (!message) {
      return;
    }
    const id = ++this.seq;
    this._toasts.update(list => [{ id, type, message }, ...list]);

    if (duration > 0) {
      this.timers.set(id, setTimeout(() => this.dismiss(id), duration));
    }
  }
}
