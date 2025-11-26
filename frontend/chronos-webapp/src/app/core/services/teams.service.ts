import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class TeamsService {
  http = inject(HttpClient);
  apiUrl = 'http://localhost:3333/api/teams';

  getTeams() {
    return this.http.get<any[]>(this.apiUrl, { withCredentials: true });
  }

  searchTeams(query: string) {
    return this.http.get<any[]>(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`, { withCredentials: true });
  }

  getTeam(id: string) {
    return this.http.get<any>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  createTeam(name?: string, invitedEmails?: string[]) {
    return this.http.post<any>(this.apiUrl, { name, invitedEmails }, { withCredentials: true });
  }

  joinTeam(id: string) {
    return this.http.post<any>(`${this.apiUrl}/${id}/join`, {}, { withCredentials: true });
  }

  leaveTeam(id: string) {
    return this.http.post<any>(`${this.apiUrl}/${id}/leave`, {}, { withCredentials: true });
  }

  deleteTeam(id: string) {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  inviteMember(teamId: string, emailOrUserId: string | number) {
    const body = typeof emailOrUserId === 'number' 
      ? { userId: emailOrUserId }
      : { email: emailOrUserId };
    return this.http.post<any>(`${this.apiUrl}/${teamId}/invite`, body, { withCredentials: true });
  }

  updateMemberRole(teamId: string, memberId: number, role: string) {
    return this.http.put<any>(`${this.apiUrl}/${teamId}`, { memberId, role }, { withCredentials: true });
  }

  removeMember(teamId: string, memberId: number) {
    return this.http.delete<any>(`${this.apiUrl}/${teamId}/members/${memberId}`, { withCredentials: true });
  }

  cancelInvitation(teamId: string, invitationId: number) {
    return this.http.delete<any>(`${this.apiUrl}/${teamId}/invitations/${invitationId}`, { withCredentials: true });
  }
}

