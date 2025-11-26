import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UsersService } from '../../core/services/users.service';
import { TeamsService } from '../../core/services/teams.service';
import { AuthService } from '../../core/services/auth.service';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { Subject } from 'rxjs';
import { AlertDialogComponent } from '../../shared/components/alert-dialog/alert-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-create-team-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>Create Team</h2>
    <mat-dialog-content>
      <div class="dialog-content">
        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Team Name</mat-label>
          <input matInput [(ngModel)]="teamName" placeholder="Enter team name" />
        </mat-form-field>

        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Invite Members</mat-label>
          <input
            matInput
            [ngModel]="searchQuery()"
            (ngModelChange)="onSearch($event)"
            placeholder="Search by email or name, or enter email"
            [matAutocomplete]="auto"
          />
          <mat-autocomplete #auto="matAutocomplete" (optionSelected)="addMember($event.option.value)" [displayWith]="displayUser">
            @if (searchQuery().length >= 2) {
              @for (user of searchResults(); track user.id) {
                <mat-option [value]="user">
                  <span>{{ user.fullName || user.email }}</span>
                  @if (user.email && user.fullName) {
                  <span class="email"> - {{ user.email }}</span>
                  }
                </mat-option>
              }
            }
          </mat-autocomplete>
        </mat-form-field>

        @if (invitedMembers().length > 0) {
          <div class="invited-members">
            <h3>Invited Members:</h3>
            <mat-chip-set>
              @for (member of invitedMembers(); track member.email) {
                <mat-chip>
                  {{ member.fullName || member.email }}
                  <button matChipRemove (click)="removeMember(member)">
                    <mat-icon>cancel</mat-icon>
                  </button>
                </mat-chip>
              }
            </mat-chip-set>
          </div>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="create()" [disabled]="!teamName">Create</button>
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
      .email {
        color: var(--nord4);
        font-size: 0.9em;
      }
      .invited-members {
        margin-top: 1rem;
      }
      .invited-members h3 {
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
        color: var(--nord4);
      }
      mat-chip-set {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
    `,
  ],
})
export class CreateTeamDialogComponent {
  usersService = inject(UsersService);
  teamsService = inject(TeamsService);
  authService = inject(AuthService);
  dialogRef = inject(MatDialogRef<CreateTeamDialogComponent>);
  dialog = inject(MatDialog);

  teamName = '';
  searchQuery = signal('');
  searchResults = signal<any[]>([]);
  invitedMembers = signal<Array<{ email: string; fullName?: string; id?: number; isNew?: boolean }>>([]);
  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          if (!term || term.length < 2) return of([]);
          return this.usersService.searchUsers(term).pipe(catchError(() => of([])));
        })
      )
      .subscribe((users) => {
        const currentUserId = this.authService.currentUser()?.id;
        const filteredUsers = users.filter((user) => user.id !== currentUserId);
        this.searchResults.set(filteredUsers);
      });
  }

  onSearch(term: string) {
    this.searchQuery.set(term);
    this.searchSubject.next(term);
  }

  displayUser(user: any): string {
    return user ? user.fullName || user.email : '';
  }

  addMember(member: any) {
    if (!member || !member.email) return;

    const exists = this.invitedMembers().some((m) => m.email === member.email);
    if (exists) {
      this.searchQuery.set('');
      return;
    }

    this.invitedMembers.set([...this.invitedMembers(), member]);
    this.searchQuery.set('');
  }

  removeMember(member: { email: string }) {
    this.invitedMembers.set(this.invitedMembers().filter((m) => m.email !== member.email));
  }

  create() {
    const invitedEmails = this.invitedMembers().map((m) => m.email);
    this.teamsService.createTeam(this.teamName, invitedEmails).subscribe({
      next: (team) => {
        this.dialogRef.close(team);
      },
      error: (err) => {
        this.dialog.open(AlertDialogComponent, {
          data: {
            message: 'Failed to create team: ' + (err.error?.message || 'Unknown error'),
          },
        });
      },
    });
  }

  cancel() {
    this.dialogRef.close();
  }
}

