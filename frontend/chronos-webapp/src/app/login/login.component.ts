import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h2>Welcome to ChronosEstimate</h2>
        <p>Please sign in to continue</p>
        <div class="auth-buttons">
          <button (click)="signInWithGoogle()" class="auth-btn google-btn">Sign in with Google</button>
          <button (click)="signInWithMicrosoft()" class="auth-btn microsoft-btn">Sign in with Microsoft</button>
        </div>
      </div>
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
        background: var(--nord1);
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        text-align: center;
        max-width: 400px;
        width: 100%;
      }
      h2 {
        color: var(--nord4);
        margin-bottom: 1rem;
      }
      p {
        color: var(--nord4);
        margin-bottom: 2rem;
      }
      .auth-buttons {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .auth-btn {
        display: inline-block;
        color: var(--nord6);
        padding: 0.75rem 1.5rem;
        border-radius: 4px;
        text-decoration: none;
        font-weight: 500;
        transition: background 0.2s;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        font-family: inherit;
        width: 100%;
      }
      .google-btn {
        background: var(--nord10);
        &:hover {
          background: var(--nord9);
        }
      }
      .microsoft-btn {
        background: var(--nord12);
        &:hover {
          background: var(--nord11);
        }
      }
    `,
  ],
})
export class LoginComponent {
  private readonly authService = inject(AuthService);

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
