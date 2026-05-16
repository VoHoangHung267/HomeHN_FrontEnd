import {
  Component, ChangeDetectionStrategy, OnInit,
  signal, inject
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AdminService, StatsResponse } from '../../core/services/admin.service';
import { Room, User } from '../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  // ── Signals ──────────────────────────────────────────────
  tab          = signal<'rooms'|'users'>('rooms');
  stats        = signal<StatsResponse | null>(null);
  pendingRooms = signal<Room[]>([]);
  users        = signal<User[]>([]);
  usersLoaded  = signal(false);

  ngOnInit(): void {
    this.adminService.getStats().subscribe(r => this.stats.set(r.data));
    this.adminService.getPendingRooms().subscribe(r => this.pendingRooms.set(r.data));
  }

  switchTab(t: 'rooms'|'users'): void {
    this.tab.set(t);
    if (t === 'users' && !this.usersLoaded()) {
      this.adminService.getAllUsers().subscribe(r => {
        this.users.set(r.data);
        this.usersLoaded.set(true);
      });
    }
  }

  approveRoom(room: Room): void {
    this.adminService.approveRoom(room.id).subscribe(() => {
      this.pendingRooms.update(list => list.filter(r => r.id !== room.id));
      this.stats.update(s => s ? { ...s, pendingRooms: s.pendingRooms - 1 } : s);
    });
  }

  rejectRoom(room: Room): void {
    const reason = prompt('Lý do từ chối:');
    if (reason === null) return;
    this.adminService.rejectRoom(room.id, reason).subscribe(() => {
      this.pendingRooms.update(list => list.filter(r => r.id !== room.id));
      this.stats.update(s => s ? { ...s, pendingRooms: s.pendingRooms - 1 } : s);
    });
  }

  toggleUser(user: User): void {
    this.adminService.toggleUserActive(user.id).subscribe(() => {
      this.users.update(list =>
        list.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u)
      );
    });
  }
}