import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class InvitationsService {
  http = inject(HttpClient);
  apiUrl = 'http://localhost:3333/api';

  acceptInvitation(teamId: string, token: string) {
    return this.http.post<any>(`${this.apiUrl}/teams/${teamId}/invite/${token}/accept`, {}, { withCredentials: true });
  }
}

