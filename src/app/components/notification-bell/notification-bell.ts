import { Component, OnInit, signal, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification/notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss'
})
export class NotificationBell implements OnInit {
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  unreadCount = this.notificationService.unreadCount;
  notifications = signal<any[]>([]);
  open = signal(false);
  loading = signal(false);

  ngOnInit(): void {
    this.notificationService.getUnreadCount().subscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const el = event.target as HTMLElement;
    if (!el.closest('.notification-bell')) {
      this.open.set(false);
    }
  }

  toggle(): void {
    const isOpening = !this.open();
    this.open.set(isOpening);
    if (isOpening && this.notifications().length === 0) {
      this.loadNotifications();
    }
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.notificationService.getNotifications().subscribe({
      next: (res: any) => {
        this.notifications.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  markAsRead(notification: any, event: MouseEvent): void {
    event.stopPropagation();
    if (notification.read_at) return;
    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        this.notifications.update(list =>
          list.map(n => n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)
        );
      }
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update(list =>
          list.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
        );
      }
    });
  }

  navigate(notification: any): void {
    this.markAsRead(notification, new MouseEvent('click'));
    if (notification.action_url) {
      this.router.navigateByUrl(notification.action_url);
      this.open.set(false);
    }
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
}
