import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  http = inject(HttpClient);
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
}

