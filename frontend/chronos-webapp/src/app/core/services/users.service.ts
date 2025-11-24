import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class UsersService {
  http = inject(HttpClient);
  apiUrl = 'http://localhost:3333/api/users';

  searchUsers(query: string) {
    return this.http.get<any[]>(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`, { withCredentials: true });
  }
}

