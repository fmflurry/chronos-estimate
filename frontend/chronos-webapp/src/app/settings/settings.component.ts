import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-form">
      <div class="form-group">
        <label>Display Name</label>
        <input
          [ngModel]="displayName()"
          (ngModelChange)="displayName.set($event)"
          placeholder="Display Name"
        />
      </div>
      <div class="form-group">
        <label>Azure DevOps PAT</label>
        <input
          type="password"
          [ngModel]="adoPat()"
          (ngModelChange)="adoPat.set($event)"
          placeholder="Personal Access Token"
        />
        <small>Stored securely</small>
      </div>
      <div class="form-group">
        <label>ADO Organization</label>
        <input
          [ngModel]="adoOrg()"
          (ngModelChange)="adoOrg.set($event)"
          placeholder="Organization"
        />
      </div>
      <div class="form-group">
        <label>ADO Project</label>
        <input
          [ngModel]="adoProject()"
          (ngModelChange)="adoProject.set($event)"
          placeholder="Project"
        />
      </div>
      <button (click)="saveSettings()" class="btn-primary">Save Settings</button>
    </div>
  `,
  styles: [
    `
      .settings-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      input {
        padding: 0.5rem;
        border: 1px solid var(--nord3);
        background: var(--nord0);
        color: var(--nord4);
        border-radius: 4px;
      }
      .btn-primary {
        background: var(--nord8);
        color: var(--nord0);
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
      }
      small {
        color: var(--nord3);
        font-size: 0.8rem;
      }
    `,
  ],
})
export class SettingsComponent {
  authService = inject(AuthService);
  http = inject(HttpClient);

  displayName = signal('');
  adoPat = signal('');
  adoOrg = signal('');
  adoProject = signal('');

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.displayName.set(user.fullName || '');
        this.adoOrg.set(user.adoOrg || '');
        this.adoProject.set(user.adoProject || '');
      }
    });
  }

  saveSettings() {
    this.http
      .post(
        'http://localhost:3333/api/user/settings',
        {
          fullName: this.displayName(),
          adoPat: this.adoPat(),
          adoOrg: this.adoOrg(),
          adoProject: this.adoProject(),
        },
        { withCredentials: true }
      )
      .subscribe({
        next: () => alert('Settings saved!'),
        error: () => alert('Error saving settings'),
      });
  }
}
