import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WebSocketService } from './websocket.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  http = inject(HttpClient);
  ws = inject(WebSocketService);
  apiUrl = 'http://localhost:3333/api/notifications';

  getNotifications() {
    return this.http.get<any[]>(this.apiUrl, { withCredentials: true });
  }

  markAsRead(id: number) {
    return this.http.put<any>(`${this.apiUrl}/${id}/read`, {}, { withCredentials: true });
  }

  markAllAsRead() {
    return this.http.put<any>(`${this.apiUrl}/read-all`, {}, { withCredentials: true });
  }

  delete(id: number) {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  onNewNotification(): Observable<unknown> {
    return this.ws.on('new-notification');
  }

  onNotificationDeleted(): Observable<unknown> {
    return this.ws.on('notification-deleted');
  }
}

