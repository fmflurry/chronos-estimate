import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  http = inject(HttpClient);
  currentUser = signal<any>(null);

  constructor() {
    this.checkAuth().subscribe();
  }

  getGoogleAuthUrl() {
    return this.http.get<{ url: string }>('http://localhost:3333/auth/google/url');
  }

  checkAuth() {
    return this.http.get('http://localhost:3333/auth/me', { withCredentials: true }).pipe(
      tap((user) => this.currentUser.set(user)),
      catchError(() => {
        this.currentUser.set(null);
        return of(null);
      })
    );
  }

  logout() {
    return this.http
      .post('http://localhost:3333/auth/logout', {}, { withCredentials: true })
      .pipe(tap(() => this.currentUser.set(null)));
  }
}
