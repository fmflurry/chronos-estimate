import { Component, inject, effect } from '@angular/core';
import { RouterLink, RouterOutlet, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule],
  template: `
    <div class="app-shell">
      <mat-toolbar color="primary" class="app-header">
        <span class="brand" routerLink="/dashboard">ChronosEstimate</span>
        <span class="spacer"></span>
        <nav class="nav">
          <a mat-button routerLink="/dashboard">Dashboard</a>
        </nav>
        <div class="user-actions">
          @if (currentUser()) {
          <img class="avatar" [src]="currentUser().avatarUrl || ''" alt="" />
          <span class="name">{{ currentUser().fullName || currentUser().email }}</span>
          <button mat-button (click)="logout()">Logout</button>
          } @else {
          <a mat-button routerLink="/login">Login</a>
          }
        </div>
      </mat-toolbar>
      <main class="app-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      .app-shell {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      .app-header {
        position: sticky;
        top: 0;
        z-index: 100;
      }
      .brand {
        font-weight: 600;
        cursor: pointer;
        margin-right: 2rem;
      }
      .spacer {
        flex: 1 1 auto;
      }
      .nav {
        display: flex;
        gap: 1rem;
      }
      .user-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-left: 1rem;
      }
      .avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--nord2);
      }
      .name {
        font-size: 0.9rem;
        margin-right: 0.5rem;
      }
      .app-content {
        flex: 1;
      }
    `,
  ],
})
export class App {
  auth = inject(AuthService);
  router = inject(Router);
  currentUser = this.auth.currentUser;

  constructor() {
    effect(() => {
      const user = this.currentUser();
      if (!user && this.router.url !== '/login') {
        this.router.navigate(['/login']);
      }
    });
  }

  logout() {
    this.auth.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
    });
  }
}
