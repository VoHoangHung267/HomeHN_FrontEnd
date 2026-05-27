import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  kind?: 'primary' | 'ghost' | 'danger';
  run: () => void;
}

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  actions?: ToastAction[];
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly _items = signal<ToastItem[]>([]);

  readonly items = this._items.asReadonly();

  success(message: string, durationMs = 3500): void {
    this.show('success', message, durationMs);
  }

  error(message: string, durationMs = 4500): void {
    this.show('error', message, durationMs);
  }

  info(message: string, durationMs = 3500): void {
    this.show('info', message, durationMs);
  }

  confirm(message: string, onConfirm: () => void, confirmLabel = 'Xác nhận', cancelLabel = 'Huỷ'): void {
    const trimmed = message.trim();
    if (!trimmed) return;

    const id = this.nextId++;
    this._items.update(items => [
      ...items,
      {
        id,
        type: 'info',
        message: trimmed,
        actions: [
          {
            label: confirmLabel,
            kind: 'primary',
            run: () => {
              this.dismiss(id);
              onConfirm();
            }
          },
          {
            label: cancelLabel,
            kind: 'ghost',
            run: () => this.dismiss(id)
          }
        ]
      }
    ]);
  }

  dismiss(id: number): void {
    this._items.update(items => items.filter(item => item.id !== id));
  }

  private show(type: ToastType, message: string, durationMs: number): void {
    const trimmed = message.trim();
    if (!trimmed) return;

    const id = this.nextId++;
    this._items.update(items => [...items, { id, type, message: trimmed }]);
    window.setTimeout(() => this.dismiss(id), durationMs);
  }
}
