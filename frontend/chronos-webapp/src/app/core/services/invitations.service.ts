import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WebSocketService } from './websocket.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InvitationsService {
  http = inject(HttpClient);
  ws = inject(WebSocketService);
  apiUrl = 'http://localhost:3333/api';

  getInvitationDetails(teamId: string, token: string) {
    return this.http.get<any>(`${this.apiUrl}/teams/${teamId}/invite/${token}`, { withCredentials: true });
  }

  acceptInvitation(teamId: string, token: string) {
    return this.http.post<any>(`${this.apiUrl}/teams/${teamId}/invite/${token}/accept`, {}, { withCredentials: true });
  }

  declineInvitation(teamId: string, token: string) {
    return this.http.post<any>(`${this.apiUrl}/teams/${teamId}/invite/${token}/decline`, {}, { withCredentials: true });
  }

  getRoomInvitationDetails(roomId: string, token: string) {
    return this.http.get<any>(`${this.apiUrl}/rooms/${roomId}/invite/${token}`, { withCredentials: true });
  }

  acceptRoomInvitation(roomId: string, token: string) {
    return this.http.post<any>(`${this.apiUrl}/rooms/${roomId}/invite/${token}/accept`, {}, { withCredentials: true });
  }

  declineRoomInvitation(roomId: string, token: string) {
    return this.http.post<any>(`${this.apiUrl}/rooms/${roomId}/invite/${token}/decline`, {}, { withCredentials: true });
  }

  onTeamMemberJoined(): Observable<unknown> {
    return this.ws.on('team-member-joined');
  }

  onTeamMemberLeft(): Observable<unknown> {
    return this.ws.on('team-member-left');
  }

  onRoomParticipantJoined(): Observable<unknown> {
    return this.ws.on('room-participant-joined');
  }

  onRoomParticipantLeft(): Observable<unknown> {
    return this.ws.on('room-participant-left');
  }
}

