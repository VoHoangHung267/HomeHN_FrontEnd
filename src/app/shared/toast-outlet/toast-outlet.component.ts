import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-outlet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="toast-stack">
  @for (toast of toastService.items(); track toast.id) {
    <div class="toast-item toast-{{ toast.type }}">
      <div class="toast-icon">
        {{ toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : 'i' }}
      </div>
      <div class="toast-message">{{ toast.message }}</div>
      <button type="button" class="toast-close" (click)="toastService.dismiss(toast.id)">×</button>
    </div>
  }
</div>
  `,
  styles: [`
:host {
  position: fixed;
  top: 88px;
  right: 20px;
  z-index: 2100;
  pointer-events: none;
}

.toast-stack {
  display: grid;
  gap: 12px;
  width: min(380px, calc(100vw - 32px));
}

.toast-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 24px;
  align-items: start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid #dbeafe;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(12px);
  pointer-events: auto;
}

.toast-success { border-color: #bbf7d0; }
.toast-error { border-color: #fecaca; }
.toast-info { border-color: #bfdbfe; }

.toast-icon {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  background: #eff6ff;
}

.toast-success .toast-icon {
  background: #dcfce7;
  color: #166534;
}

.toast-error .toast-icon {
  background: #fee2e2;
  color: #b91c1c;
}

.toast-info .toast-icon {
  background: #dbeafe;
  color: #1d4ed8;
}

.toast-message {
  font-size: 14px;
  line-height: 1.5;
  color: #0f172a;
  overflow-wrap: anywhere;
}

.toast-close {
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

@media (max-width: 768px) {
  :host {
    top: 76px;
    right: 16px;
  }
}
  `]
})
export class ToastOutletComponent {
  readonly toastService = inject(ToastService);
}
