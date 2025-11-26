import { Component, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface AlertDialogData {
  title?: string;
  message: string;
  okText?: string;
}

@Component({
  selector: 'app-alert-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title || 'Alert' }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" (click)="onOk()">{{ data.okText || 'OK' }}</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      p {
        margin: 0;
        color: var(--nord4);
      }
    `,
  ],
})
export class AlertDialogComponent {
  dialogRef = inject(MatDialogRef<AlertDialogComponent>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: AlertDialogData) {}

  onOk() {
    this.dialogRef.close();
  }
}
