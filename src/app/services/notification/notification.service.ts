import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService extends ApiService {
  unreadCount = signal<number>(0);

  getNotifications(page = 1): Observable<any> {
    return this.get('/notifications', { page });
  }

  getUnreadCount(): Observable<any> {
    return this.get<any>('/notifications/unread-count').pipe(
      tap((res: any) => this.unreadCount.set(res.count ?? 0))
    );
  }

  markAsRead(id: number): Observable<any> {
    return this.post(`/notifications/${id}/read`).pipe(
      tap(() => {
        const current = this.unreadCount();
        if (current > 0) this.unreadCount.set(current - 1);
      })
    );
  }

  markAllAsRead(): Observable<any> {
    return this.post('/notifications/read-all').pipe(
      tap(() => this.unreadCount.set(0))
    );
  }

  deleteNotification(id: number): Observable<any> {
    return this.delete(`/notifications/${id}`);
  }
}
