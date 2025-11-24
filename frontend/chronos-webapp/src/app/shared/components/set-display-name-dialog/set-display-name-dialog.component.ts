import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-set-display-name-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Set Your Display Name</h2>
    <mat-dialog-content>
      <div class="dialog-content">
        <p>Please set a display name to continue.</p>
        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Display Name</mat-label>
          <input matInput [(ngModel)]="displayName" placeholder="Enter your display name" required />
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!displayName || displayName.trim().length === 0">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        min-width: 400px;
        padding: 1rem 0;
      }
      .full-width {
        width: 100%;
      }
      p {
        margin: 0;
        color: var(--nord4);
      }
    `,
  ],
})
export class SetDisplayNameDialogComponent {
  dialogRef = inject(MatDialogRef<SetDisplayNameDialogComponent>);
  http = inject(HttpClient);
  authService = inject(AuthService);

  displayName = '';

  save() {
    if (!this.displayName || this.displayName.trim().length === 0) {
      return;
    }

    this.http
      .post(
        'http://localhost:3333/api/user/settings',
        { fullName: this.displayName.trim() },
        { withCredentials: true }
      )
      .subscribe({
        next: () => {
          this.authService.checkAuth().subscribe(() => {
            this.dialogRef.close(true);
          });
        },
        error: (err) => {
          alert('Failed to save display name: ' + (err.error?.message || 'Unknown error'));
        },
      });
  }
}

