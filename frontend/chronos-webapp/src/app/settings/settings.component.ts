import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { AdoService } from '../core/services/ado.service';

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
          (ngModelChange)="onPatChange($event)"
          placeholder="Personal Access Token"
        />
        <small>Stored securely</small>
      </div>
      <div class="form-group autocomplete-group">
        <label>ADO Organization</label>
        <input
          [ngModel]="adoOrg()"
          (ngModelChange)="onOrgInput($event)"
          (focus)="loadOrganizations()"
          placeholder="Organization"
          autocomplete="off"
        />
        @if (filteredAdoOrgs().length > 0) {
        <ul class="options">
          @for (org of filteredAdoOrgs(); track org) {
          <li (click)="selectOrg(org)">{{ org }}</li>
          }
        </ul>
        }
      </div>
      <div class="form-group autocomplete-group">
        <label>ADO Project</label>
        <input
          [ngModel]="adoProject()"
          (ngModelChange)="onProjectInput($event)"
          (focus)="loadProjects()"
          placeholder="Project"
          autocomplete="off"
        />
        @if (filteredAdoProjects().length > 0) {
        <ul class="options">
          @for (project of filteredAdoProjects(); track project) {
          <li (click)="selectProject(project)">{{ project }}</li>
          }
        </ul>
        }
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
        position: relative;
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
      .autocomplete-group .options {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--nord1);
        border: 1px solid var(--nord3);
        list-style: none;
        padding: 0;
        margin: 0.25rem 0 0;
        max-height: 200px;
        overflow-y: auto;
        z-index: 10;
      }
      .autocomplete-group .options li {
        padding: 0.5rem;
        cursor: pointer;
      }
      .autocomplete-group .options li:hover {
        background: var(--nord2);
      }
    `,
  ],
})
export class SettingsComponent {
  authService = inject(AuthService);
  http = inject(HttpClient);
  adoService = inject(AdoService);

  displayName = signal('');
  adoPat = signal('');
  adoOrg = signal('');
  adoProject = signal('');

  private patPlaceholder = '********';
  hasExistingPat = signal(false);

  adoOrgs = signal<string[]>([]);
  filteredAdoOrgs = signal<string[]>([]);

  adoProjects = signal<string[]>([]);
  filteredAdoProjects = signal<string[]>([]);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.displayName.set(user.fullName || '');
        const hasPat = !!user.adoPat;
        this.hasExistingPat.set(hasPat);
        this.adoPat.set(hasPat ? this.patPlaceholder : '');
        const org = user.adoOrg || '';
        const project = user.adoProject || '';
        this.adoOrg.set(org);
        this.adoProject.set(project);
      }
    });
  }

  onPatChange(value: string) {
    this.adoPat.set(value);
  }

  loadOrganizations() {
    if (this.adoOrgs().length > 0 || !this.hasExistingPat()) {
      return;
    }

    this.adoService.getOrganizations().subscribe((orgs) => {
      this.adoOrgs.set(orgs);
      this.filteredAdoOrgs.set(orgs);
    });
  }

  onOrgInput(value: string) {
    this.adoOrg.set(value);
    if (!this.adoOrgs().length) {
      this.loadOrganizations();
    }
    const term = value.toLowerCase();
    this.filteredAdoOrgs.set(this.adoOrgs().filter((org) => org.toLowerCase().includes(term)));
  }

  selectOrg(org: string) {
    this.adoOrg.set(org);
    this.filteredAdoOrgs.set([]);
  }

  loadProjects() {
    if (!this.hasExistingPat() || !this.adoOrg()) {
      return;
    }

    this.adoService.getProjects(this.adoOrg()).subscribe((projects) => {
      this.adoProjects.set(projects);
      this.filteredAdoProjects.set(projects);
    });
  }

  onProjectInput(value: string) {
    this.adoProject.set(value);
    if (!this.adoProjects().length) {
      this.loadProjects();
    }
    const term = value.toLowerCase();
    this.filteredAdoProjects.set(
      this.adoProjects().filter((project) => project.toLowerCase().includes(term))
    );
  }

  selectProject(project: string) {
    this.adoProject.set(project);
    this.filteredAdoProjects.set([]);
  }

  saveSettings() {
    const payload: any = {
      fullName: this.displayName(),
      adoOrg: this.adoOrg(),
      adoProject: this.adoProject(),
    };

    const pat = this.adoPat().trim();
    if (!this.hasExistingPat() || pat !== this.patPlaceholder) {
      if (pat) {
        payload.adoPat = pat;
      }
    }

    this.http
      .post('http://localhost:3333/api/user/settings', payload, {
        withCredentials: true,
      })
      .subscribe({
        next: () => alert('Settings saved!'),
        error: () => alert('Error saving settings'),
      });
  }
}
