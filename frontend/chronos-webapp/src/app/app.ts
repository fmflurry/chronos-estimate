import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="app-shell">
      <header class="app-header">
        <div class="brand" routerLink="/dashboard">ChronosEstimate</div>
        <nav class="nav">
          <a routerLink="/dashboard">Dashboard</a>
        </nav>
        <div class="user-actions">
          @if (currentUser()) {
          <img class="avatar" [src]="currentUser().avatarUrl || ''" alt="" />
          <span class="name">{{ currentUser().fullName || currentUser().email }}</span>
          <button class="btn" (click)="logout()">Logout</button>
          } @else {
          <a class="btn" routerLink="/login">Login</a>
          }
        </div>
      </header>
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
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        background: var(--nord1);
        border-bottom: 1px solid var(--nord2);
        position: sticky;
        top: 0;
        z-index: 100;
      }
      .brand {
        font-weight: 600;
        color: var(--nord6);
        cursor: pointer;
      }
      .nav {
        display: flex;
        gap: 1rem;
      }
      .nav a {
        color: var(--nord5);
      }
      .user-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--nord2);
      }
      .name {
        color: var(--nord5);
        font-size: 0.9rem;
      }
      .btn {
        background: var(--nord8);
        color: var(--nord0);
        border: none;
        border-radius: 4px;
        padding: 0.35rem 0.6rem;
        cursor: pointer;
      }
      .app-content {
        flex: 1;
      }
    `,
  ],
})
export class App {
  auth = inject(AuthService);
  currentUser = this.auth.currentUser;

  logout() {
    this.auth.logout().subscribe();
  }
}
