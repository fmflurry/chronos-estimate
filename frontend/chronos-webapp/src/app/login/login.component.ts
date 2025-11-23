import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Welcome to ChronosEstimate</mat-card-title>
          <mat-card-subtitle>Please sign in to continue</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="auth-buttons">
            <button mat-raised-button (click)="signInWithGoogle()" class="google-btn">
              Sign in with Google
            </button>
            <button mat-raised-button (click)="signInWithMicrosoft()" class="microsoft-btn">
              Sign in with Microsoft
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .login-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        min-height: 60vh;
      }
      .login-card {
        max-width: 400px;
        width: 100%;
        padding: 1rem;
      }
      mat-card-header {
        justify-content: center;
        margin-bottom: 1.5rem;
      }
      mat-card-title {
        text-align: center;
        font-size: 1.5rem;
        margin-bottom: 0.5rem;
      }
      mat-card-subtitle {
        text-align: center;
      }
      .auth-buttons {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .google-btn {
        background-color: var(--nord10) !important;
        color: var(--nord6) !important;
      }
      .microsoft-btn {
        background-color: var(--nord12) !important;
        color: var(--nord6) !important;
      }
    `,
  ],
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  signInWithGoogle() {
    this.authService.getGoogleAuthUrl().subscribe({
      next: ({ url }) => {
        globalThis.location.href = url;
      },
      error: (err) => console.error('Error initiating login:', err),
    });
  }

  signInWithMicrosoft() {
    this.authService.getMicrosoftAuthUrl().subscribe({
      next: ({ url }) => {
        globalThis.location.href = url;
      },
      error: (err) => console.error('Error initiating login:', err),
    });
  }
}
