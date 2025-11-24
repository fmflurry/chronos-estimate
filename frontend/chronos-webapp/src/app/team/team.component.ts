import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TeamsService } from '../core/services/teams.service';
import { UsersService } from '../core/services/users.service';
import { AuthService } from '../core/services/auth.service';
import { InvitationsService } from '../core/services/invitations.service';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatListModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatDialogModule,
  ],
  template: `
    <div class="team-container">
      <mat-toolbar color="primary">
        <span>{{ team()?.name || 'Loading...' }}</span>
        <span class="spacer"></span>
        @if (isAdmin()) {
        <button mat-icon-button (click)="showInviteDialog = true" matTooltip="Invite Member">
          <mat-icon>person_add</mat-icon>
        </button>
        } @if (isOwner()) {
        <button mat-icon-button (click)="deleteTeam()" matTooltip="Delete Team" color="warn">
          <mat-icon>delete</mat-icon>
        </button>
        } @if (canLeave()) {
        <button mat-icon-button (click)="leaveTeam()" matTooltip="Leave Team">
          <mat-icon>exit_to_app</mat-icon>
        </button>
        }
        <button mat-icon-button (click)="goBack()">
          <mat-icon>close</mat-icon>
        </button>
      </mat-toolbar>

      <div class="team-content">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Team Members</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-nav-list>
              @for (member of team()?.members || []; track member.id) {
              <mat-list-item>
                <span matListItemTitle>{{
                  member.user?.fullName || member.user?.email || 'Unknown'
                }}</span>
                <span matListItemLine>{{ member.user?.email }}</span>
                @if (isAdmin() && member.userId !== currentUserId()) {
                <mat-form-field appearance="fill" class="role-select">
                  <mat-label>Role</mat-label>
                  <mat-select
                    [value]="member.role"
                    (selectionChange)="updateRole(member.id, $event.value)"
                  >
                    <mat-option value="member">Member</mat-option>
                    <mat-option value="admin">Admin</mat-option>
                  </mat-select>
                </mat-form-field>
                } @else {
                <span class="role-badge">{{ member.role | titlecase }}</span>
                }
              </mat-list-item>
              }
            </mat-nav-list>
          </mat-card-content>
        </mat-card>

        @if (showInviteDialog && isAdmin()) {
        <mat-card class="invite-card">
          <mat-card-header>
            <mat-card-title>Invite Member</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Email or Name</mat-label>
              <input
                matInput
                [ngModel]="inviteSearchQuery()"
                (ngModelChange)="onInviteSearch($event)"
                placeholder="Search by email or name"
                [matAutocomplete]="auto"
              />
              <mat-autocomplete
                #auto="matAutocomplete"
                (optionSelected)="inviteMember($event.option.value)"
              >
                @if (inviteSearchQuery().length >= 2) { @for (user of inviteSearchResults(); track
                user.id) {
                <mat-option [value]="user">
                  <span>{{ user.fullName || user.email }}</span>
                  <span class="email"> - {{ user.email }}</span>
                </mat-option>
                }
                <mat-option [value]="{ email: inviteSearchQuery(), isNew: true }">
                  <span>Invite {{ inviteSearchQuery() }} (new user)</span>
                </mat-option>
                }
              </mat-autocomplete>
            </mat-form-field>
            <div class="invite-actions">
              <button mat-button (click)="showInviteDialog = false">Cancel</button>
            </div>
          </mat-card-content>
        </mat-card>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .team-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
      }
      .spacer {
        flex: 1 1 auto;
      }
      .team-content {
        flex: 1;
        padding: 2rem;
        overflow-y: auto;
      }
      mat-list-item {
        height: 100% !important;
      }
      .role-select {
        margin-left: auto;
      }
      .role-badge {
        margin-left: auto;
        padding: 0.25rem 0.5rem;
        background: var(--nord3);
        border-radius: 4px;
        font-size: 0.8rem;
      }
      .invite-card {
        margin-top: 1rem;
      }
      .full-width {
        width: 100%;
      }
      .email {
        color: var(--nord4);
        font-size: 0.9em;
      }
      .invite-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1rem;
      }
    `,
  ],
})
export class TeamComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  teamsService = inject(TeamsService);
  usersService = inject(UsersService);
  authService = inject(AuthService);
  invitationsService = inject(InvitationsService);

  team = signal<any>(null);
  showInviteDialog = false;
  inviteSearchQuery = signal('');
  inviteSearchResults = signal<any[]>([]);
  private inviteSearchSubject = new Subject<string>();

  constructor() {
    this.inviteSearchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          if (!term || term.length < 2) return of([]);
          return this.usersService.searchUsers(term).pipe(catchError(() => of([])));
        })
      )
      .subscribe((users) => this.inviteSearchResults.set(users));
  }

  ngOnInit() {
    const teamId = this.route.snapshot.paramMap.get('id');
    const token = this.route.snapshot.paramMap.get('token');

    if (token && teamId) {
      this.acceptInvitation(teamId, token);
    } else if (teamId) {
      this.loadTeam(teamId);
    }
  }

  acceptInvitation(teamId: string, token: string) {
    this.invitationsService.acceptInvitation(teamId, token).subscribe({
      next: (team) => {
        this.team.set(team);
        alert('You have successfully joined the team!');
      },
      error: (err) => {
        alert('Failed to accept invitation: ' + (err.error?.message || 'Unknown error'));
        this.goBack();
      },
    });
  }

  loadTeam(id: string) {
    this.teamsService.getTeam(id).subscribe({
      next: (team) => {
        this.team.set(team);
      },
      error: () => {
        alert('Team not found');
        this.goBack();
      },
    });
  }

  currentUserId() {
    return this.authService.currentUser()?.id;
  }

  isOwner() {
    const user = this.authService.currentUser();
    const team = this.team();
    return user && team && team.ownerId === user.id;
  }

  isAdmin() {
    const user = this.authService.currentUser();
    const team = this.team();
    if (!user || !team) return false;
    const member = team.members?.find((m: any) => m.userId === user.id);
    return member && (member.role === 'owner' || member.role === 'admin');
  }

  canLeave() {
    const user = this.authService.currentUser();
    const team = this.team();
    if (!user || !team) return false;
    const member = team.members?.find((m: any) => m.userId === user.id);
    if (!member) return false;
    if (member.role !== 'owner' && member.role !== 'admin') return true;
    const otherAdmins = team.members?.filter(
      (m: any) => m.userId !== user.id && (m.role === 'owner' || m.role === 'admin')
    );
    return otherAdmins && otherAdmins.length > 0;
  }

  onInviteSearch(term: string) {
    this.inviteSearchQuery.set(term);
    this.inviteSearchSubject.next(term);
  }

  inviteMember(member: any) {
    const email = member.email || member;
    if (!email) return;

    const teamId = this.route.snapshot.paramMap.get('id');
    if (!teamId) return;

    this.teamsService.inviteMember(teamId, email).subscribe({
      next: () => {
        this.loadTeam(teamId);
        this.showInviteDialog = false;
        this.inviteSearchQuery.set('');
        alert('Invitation sent!');
      },
      error: (err) => {
        alert('Failed to send invitation: ' + (err.error?.message || 'Unknown error'));
      },
    });
  }

  updateRole(memberId: number, role: string) {
    const teamId = this.route.snapshot.paramMap.get('id');
    if (!teamId) return;

    this.teamsService.updateMemberRole(teamId, memberId, role).subscribe({
      next: () => {
        this.loadTeam(teamId);
      },
      error: (err) => {
        alert('Failed to update role: ' + (err.error?.message || 'Unknown error'));
        this.loadTeam(teamId);
      },
    });
  }

  deleteTeam() {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    const teamId = this.route.snapshot.paramMap.get('id');
    if (!teamId) return;

    this.teamsService.deleteTeam(teamId).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        alert('Failed to delete team: ' + (err.error?.message || 'Unknown error'));
      },
    });
  }

  leaveTeam() {
    if (!confirm('Are you sure you want to leave this team?')) {
      return;
    }

    const teamId = this.route.snapshot.paramMap.get('id');
    if (!teamId) return;

    this.teamsService.leaveTeam(teamId).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        alert('Failed to leave team: ' + (err.error?.message || 'Unknown error'));
      },
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
