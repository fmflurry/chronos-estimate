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

  createRoom(name?: string, invitedEmails?: string[]) {
    return this.http.post<any>(this.apiUrl, { name, invitedEmails }, { withCredentials: true });
  }

  updateRoom(id: string, name: string) {
    return this.http.put<any>(`${this.apiUrl}/${id}`, { name }, { withCredentials: true });
  }
  
  joinRoom(id: string) {
    return this.http.post<any>(`${this.apiUrl}/${id}/join`, {}, { withCredentials: true });
  }

  leaveRoom(id: string) {
    return this.http.post<any>(`${this.apiUrl}/${id}/leave`, {}, { withCredentials: true });
  }

  inviteParticipant(roomId: string, emailOrUserId: string | number) {
    const body = typeof emailOrUserId === 'number' 
      ? { userId: emailOrUserId }
      : { email: emailOrUserId };
    return this.http.post<any>(`${this.apiUrl}/${roomId}/invite`, body, { withCredentials: true });
  }

  removeParticipant(roomId: string, participantId: number) {
    return this.http.delete<any>(`${this.apiUrl}/${roomId}/participants/${participantId}`, { withCredentials: true });
  }

  cancelInvitation(roomId: string, invitationId: number) {
    return this.http.delete<any>(`${this.apiUrl}/${roomId}/invitations/${invitationId}`, { withCredentials: true });
  }
}
