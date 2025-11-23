import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { AdoService } from '../core/services/ado.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatAutocompleteModule,
  ],
  template: `
    <div class="settings-form">
      <mat-form-field appearance="fill">
        <mat-label>Display Name</mat-label>
        <input
          matInput
          [ngModel]="displayName()"
          (ngModelChange)="displayName.set($event)"
          placeholder="Display Name"
        />
      </mat-form-field>

      <mat-form-field appearance="fill">
        <mat-label>Azure DevOps PAT</mat-label>
        <input
          matInput
          type="password"
          [ngModel]="adoPat()"
          (ngModelChange)="onPatChange($event)"
          placeholder="Personal Access Token"
        />
        <mat-hint>Stored securely</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="fill">
        <mat-label>ADO Organization</mat-label>
        <input
          matInput
          type="text"
          [ngModel]="adoOrg()"
          (ngModelChange)="onOrgInput($event)"
          (focus)="loadOrganizations()"
          [matAutocomplete]="autoOrg"
          placeholder="Organization"
        />
        <mat-autocomplete #autoOrg="matAutocomplete" (optionSelected)="selectOrg($event.option.value)">
          @for (org of filteredAdoOrgs(); track org) {
          <mat-option [value]="org">{{ org }}</mat-option>
          }
        </mat-autocomplete>
      </mat-form-field>

      <mat-form-field appearance="fill">
        <mat-label>ADO Project</mat-label>
        <input
          matInput
          type="text"
          [ngModel]="adoProject()"
          (ngModelChange)="onProjectInput($event)"
          (focus)="loadProjects()"
          [matAutocomplete]="autoProject"
          placeholder="Project"
        />
        <mat-autocomplete #autoProject="matAutocomplete" (optionSelected)="selectProject($event.option.value)">
          @for (project of filteredAdoProjects(); track project) {
          <mat-option [value]="project">{{ project }}</mat-option>
          }
        </mat-autocomplete>
      </mat-form-field>

      <button mat-raised-button color="primary" (click)="saveSettings()">Save Settings</button>
    </div>
  `,
  styles: [
    `
      .settings-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      mat-form-field {
        width: 100%;
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
        next: () => {
          this.authService.checkAuth().subscribe();
          alert('Settings saved!');
        },
        error: () => alert('Error saving settings'),
      });
  }
}
