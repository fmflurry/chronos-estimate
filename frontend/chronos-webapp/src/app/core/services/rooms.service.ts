import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class RoomsService {
  http = inject(HttpClient);
  apiUrl = 'http://localhost:3333/api/rooms';

  getRooms() {
    return this.http.get<any[]>(this.apiUrl, { withCredentials: true });
  }
  
  getRoom(id: string) {
    return this.http.get<any>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  createRoom(name?: string) {
    return this.http.post<any>(this.apiUrl, { name }, { withCredentials: true });
  }
  
  joinRoom(id: string) {
      return this.http.post<any>(`${this.apiUrl}/${id}/join`, {}, { withCredentials: true });
  }
}
