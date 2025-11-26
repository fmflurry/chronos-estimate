import { Component, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TeamsService } from '../core/services/teams.service';
import { UsersService } from '../core/services/users.service';
import { AuthService } from '../core/services/auth.service';
import { InvitationsService } from '../core/services/invitations.service';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { Subject } from 'rxjs';
import { AlertDialogComponent } from '../shared/components/alert-dialog/alert-dialog.component';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';

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
    MatTooltipModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="team-container">
      <mat-toolbar color="primary" class="team-toolbar">
        <div class="toolbar-content">
          <div class="team-info">
            <mat-icon class="team-icon">groups</mat-icon>
            <span class="team-name">{{ team()?.name || 'Loading...' }}</span>
          </div>
          <div class="toolbar-actions">
            @if (isAdmin()) {
            <button mat-icon-button (click)="openInviteDialog()" matTooltip="Invite Member" class="toolbar-btn">
              <mat-icon>person_add</mat-icon>
            </button>
            } @if (isOwner()) {
            <button mat-icon-button (click)="deleteTeam()" matTooltip="Delete Team" class="toolbar-btn warn-btn">
              <mat-icon>delete</mat-icon>
            </button>
            } @if (canLeave()) {
            <button mat-icon-button (click)="leaveTeam()" matTooltip="Leave Team" class="toolbar-btn">
              <mat-icon>exit_to_app</mat-icon>
            </button>
            }
            <button mat-icon-button (click)="goBack()" matTooltip="Close" class="toolbar-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>
      </mat-toolbar>

      <div class="team-content">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Team Members</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="members-grid">
              @for (member of team()?.members || []; track member.id) {
              <mat-card class="member-card">
                <mat-card-content>
                  <div class="member-info">
                    <div class="member-avatar">
                      <mat-icon>person</mat-icon>
                    </div>
                    <div class="member-details">
                      <div class="member-name">{{
                        member.user?.fullName || member.user?.email || 'Unknown'
                      }}</div>
                      <div class="member-email">{{ member.user?.email }}</div>
                    </div>
                  </div>
                  <div class="member-role">
                    @if (isAdmin() && member.userId !== currentUserId()) {
                    <mat-form-field appearance="outline" class="role-select">
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
                  </div>
                  @if (isAdmin() && member.userId !== currentUserId()) {
                  <div class="member-actions">
                    <button 
                      mat-icon-button 
                      color="warn" 
                      (click)="removeMember(member.id)"
                      matTooltip="Remove member"
                      class="remove-btn"
                    >
                      <mat-icon>person_remove</mat-icon>
                    </button>
                  </div>
                  }
                </mat-card-content>
              </mat-card>
              }
              @for (invitation of team()?.invitations || []; track invitation.id) {
              <mat-card class="member-card pending-card">
                <mat-card-content>
                  <div class="member-info">
                    <div class="member-avatar pending-avatar">
                      <mat-icon>schedule</mat-icon>
                    </div>
                    <div class="member-details">
                      <div class="member-name">{{ invitation.invitedUser?.fullName || invitation.invitedUserEmail }}</div>
                      <div class="member-email">Invited by {{ invitation.invitedBy?.fullName || invitation.invitedBy?.email }}</div>
                    </div>
                  </div>
                  <div class="member-role">
                    <span class="role-badge pending-badge">Pending</span>
                  </div>
                  @if (isAdmin()) {
                  <div class="member-actions">
                    <button 
                      mat-icon-button 
                      color="warn" 
                      (click)="cancelInvitation(invitation.id)"
                      matTooltip="Cancel invitation"
                      class="remove-btn"
                    >
                      <mat-icon>cancel</mat-icon>
                    </button>
                  </div>
                  }
                </mat-card-content>
              </mat-card>
              }
            </div>
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
                #inviteInput
                matInput
                [ngModel]="inviteSearchQuery()"
                (ngModelChange)="onInviteSearch($event)"
                placeholder="Search by email or name"
                [matAutocomplete]="auto"
              />
              <mat-autocomplete
                #auto="matAutocomplete"
                (optionSelected)="inviteMember($event.option.value)"
                [displayWith]="displayUser"
              >
                @if (inviteSearchQuery().length >= 2) { @for (user of inviteSearchResults(); track
                user.id) {
                <mat-option [value]="user">
                  <span>{{ user.fullName || user.email }}</span>
                  @if (user.email && user.fullName) {
                  <span class="email"> - {{ user.email }}</span>
                  }
                </mat-option>
                } }
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
      .team-toolbar {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .toolbar-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 1rem;
      }
      .team-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .team-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
      .team-name {
        font-size: 1.25rem;
        font-weight: 500;
        letter-spacing: 0.5px;
      }
      .toolbar-actions {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
      .toolbar-btn {
        transition: background-color 0.2s, transform 0.1s;
      }
      .toolbar-btn:hover {
        transform: scale(1.1);
      }
      .warn-btn:hover {
        background-color: rgba(244, 67, 54, 0.2);
      }
      .spacer {
        flex: 1 1 auto;
      }
      .team-content {
        flex: 1;
        padding: 2rem;
        overflow-y: auto;
      }
      .members-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
      }
      .member-card {
        background: var(--nord1);
        border: 1px solid var(--nord3);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .member-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }
      .member-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .member-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--nord3);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .member-avatar mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: var(--nord6);
      }
      .member-details {
        flex: 1;
        min-width: 0;
      }
      .member-name {
        font-weight: 500;
        font-size: 1rem;
        color: var(--nord6);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .member-email {
        font-size: 0.875rem;
        color: var(--nord4);
        margin-top: 0.25rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .member-role {
        display: flex;
        justify-content: flex-end;
      }
      .role-select {
        width: 150px;
      }
      .role-badge {
        padding: 0.5rem 1rem;
        background: var(--nord3);
        border-radius: 16px;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--nord6);
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
      .member-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 0.5rem;
      }
      .remove-btn {
        transition: transform 0.2s;
      }
      .remove-btn:hover {
        transform: scale(1.1);
      }
      .pending-card {
        opacity: 0.85;
        border-left: 3px solid var(--nord13);
      }
      .pending-avatar {
        background: rgba(235, 203, 139, 0.2);
      }
      .pending-avatar mat-icon {
        color: var(--nord13);
      }
      .pending-badge {
        background: rgba(235, 203, 139, 0.2);
        color: var(--nord13);
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
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);

  @ViewChild('inviteInput') inviteInput!: ElementRef<HTMLInputElement>;

  team = signal<any>(null);
  showInviteDialog = false;
  inviteSearchQuery = signal('');
  inviteSearchResults = signal<any[]>([]);
  private readonly inviteSearchSubject = new Subject<string>();

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
      .subscribe((users) => {
        const currentUserId = this.authService.currentUser()?.id;
        const currentTeam = this.team();
        
        const filteredUsers = users.filter((user) => {
          if (user.id === currentUserId) return false;
          
          const isMember = currentTeam?.members?.some((m: any) => m.userId === user.id);
          if (isMember) return false;
          
          const hasPendingInvitation = currentTeam?.invitations?.some(
            (inv: any) => inv.invitedUserId === user.id || inv.invitedUserEmail === user.email
          );
          if (hasPendingInvitation) return false;
          
          return true;
        });
        
        this.inviteSearchResults.set(filteredUsers);
      });

    this.invitationsService.onTeamMemberJoined().subscribe((data: any) => {
      const currentTeam = this.team();
      if (currentTeam && currentTeam.id === data.teamId) {
        this.team.update(team => ({
          ...team,
          members: [...(team.members || []), data.member],
          invitations: (team.invitations || []).filter((inv: any) => inv.id !== data.invitationId),
        }));
      }
    });

    this.invitationsService.onTeamMemberLeft().subscribe((data: any) => {
      const currentTeam = this.team();
      const currentUserId = this.authService.currentUser()?.id;
      
      if (currentTeam && currentTeam.id === data.teamId) {
        const leftMember = currentTeam.members?.find((m: any) => m.id === data.memberId);
        
        if (leftMember?.userId === currentUserId) {
          this.snackBar.open('You have been removed from this team', 'Close', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
          });
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 500);
        } else {
          this.team.update(team => ({
            ...team,
            members: (team.members || []).filter((m: any) => m.id !== data.memberId),
          }));
        }
      }
    });
  }

  ngOnInit() {
    const teamId = this.route.snapshot.paramMap.get('id');
    const token = this.route.snapshot.paramMap.get('token');

    if (token && teamId) {
      this.showInvitationDialog(teamId, token);
    } else if (teamId) {
      this.loadTeam(teamId);
    }
  }

  showInvitationDialog(teamId: string, token: string) {
    this.invitationsService.getInvitationDetails(teamId, token).subscribe({
      next: (invitation) => {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
          data: {
            title: 'Team Invitation',
            message: `You have been invited to join "${invitation.teamName}".\n\nDo you want to accept this invitation?`,
            confirmText: 'Accept',
            cancelText: 'Decline',
          },
        });

        dialogRef.afterClosed().subscribe((confirmed: boolean) => {
          if (confirmed) {
            this.acceptInvitation(teamId, token);
          } else {
            this.declineInvitation(teamId, token);
          }
        });
      },
      error: (err) => {
        this.dialog.open(AlertDialogComponent, {
          data: {
            message: 'Failed to load invitation: ' + (err.error?.message || 'Unknown error'),
          },
        });
        this.goBack();
      },
    });
  }

  declineInvitation(teamId: string, token: string) {
    this.invitationsService.declineInvitation(teamId, token).subscribe({
      next: () => {
        this.dialog.open(AlertDialogComponent, {
          data: { message: 'You have declined the invitation.' },
        });
        this.goBack();
      },
      error: (err) => {
        this.dialog.open(AlertDialogComponent, {
          data: {
            message: 'Failed to decline invitation: ' + (err.error?.message || 'Unknown error'),
          },
        });
        this.goBack();
      },
    });
  }

  acceptInvitation(teamId: string, token: string) {
    this.invitationsService.acceptInvitation(teamId, token).subscribe({
      next: () => {
        this.loadTeam(teamId);
        this.dialog.open(AlertDialogComponent, {
          data: { message: 'You have successfully joined the team!' },
        });
      },
      error: (err) => {
        this.dialog.open(AlertDialogComponent, {
          data: {
            message: 'Failed to accept invitation: ' + (err.error?.message || 'Unknown error'),
          },
        });
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
        this.dialog.open(AlertDialogComponent, {
          data: { message: 'Team not found' },
        });
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

  openInviteDialog() {
    this.showInviteDialog = true;
    setTimeout(() => {
      this.inviteInput?.nativeElement.focus();
    }, 100);
  }

  displayUser(user: any): string {
    return user ? user.fullName || user.email : '';
  }

  inviteMember(member: any) {
    if (!member || !member.id) {
      console.error('Invalid member:', member);
      this.dialog.open(AlertDialogComponent, {
        data: { message: 'Please select a valid user' },
      });
      return;
    }

    const teamId = this.route.snapshot.paramMap.get('id');
    if (!teamId) return;

    const inviteParam = member.email || member.id;
    console.log('Inviting member:', member.fullName || member.email || member.id);

    this.teamsService.inviteMember(teamId, inviteParam).subscribe({
      next: () => {
        this.loadTeam(teamId);
        this.showInviteDialog = false;
        this.inviteSearchQuery.set('');
        this.inviteSearchResults.set([]);
        this.dialog.open(AlertDialogComponent, {
          data: { message: 'Invitation sent!' },
        });
      },
      error: (err) => {
        console.error('Invitation error:', err);
        console.error('Full error object:', JSON.stringify(err, null, 2));
        const errorMessage = err.error?.message || err.message || 'Unknown error';
        this.dialog.open(AlertDialogComponent, {
          data: { message: 'Failed to send invitation: ' + errorMessage },
        });
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
        this.dialog.open(AlertDialogComponent, {
          data: {
            message: 'Failed to update role: ' + (err.error?.message || 'Unknown error'),
          },
        });
        this.loadTeam(teamId);
      },
    });
  }

  removeMember(memberId: number) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: 'Are you sure you want to remove this member from the team?',
        confirmText: 'Remove',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      const teamId = this.route.snapshot.paramMap.get('id');
      if (!teamId) return;

      const currentUserId = this.currentUserId();
      const removedUser = this.team()?.members?.find((m: any) => m.id === memberId);

      this.teamsService.removeMember(teamId, memberId).subscribe({
        next: () => {
          if (removedUser?.userId === currentUserId) {
            this.router.navigate(['/dashboard']);
          } else {
            this.loadTeam(teamId);
          }
        },
        error: (err) => {
          this.dialog.open(AlertDialogComponent, {
            data: {
              message: 'Failed to remove member: ' + (err.error?.message || 'Unknown error'),
            },
          });
        },
      });
    });
  }

  cancelInvitation(invitationId: number) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: 'Are you sure you want to cancel this invitation?',
        confirmText: 'Cancel Invitation',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      const teamId = this.route.snapshot.paramMap.get('id');
      if (!teamId) return;

      this.teamsService.cancelInvitation(teamId, invitationId).subscribe({
        next: () => {
          this.loadTeam(teamId);
        },
        error: (err) => {
          this.dialog.open(AlertDialogComponent, {
            data: {
              message: 'Failed to cancel invitation: ' + (err.error?.message || 'Unknown error'),
            },
          });
        },
      });
    });
  }

  deleteTeam() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: 'Are you sure you want to delete this team? This action cannot be undone.',
        confirmText: 'Delete',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      const teamId = this.route.snapshot.paramMap.get('id');
      if (!teamId) return;

      this.teamsService.deleteTeam(teamId).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.dialog.open(AlertDialogComponent, {
            data: {
              message: 'Failed to delete team: ' + (err.error?.message || 'Unknown error'),
            },
          });
        },
      });
    });
  }

  leaveTeam() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: 'Are you sure you want to leave this team?',
        confirmText: 'Leave',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      const teamId = this.route.snapshot.paramMap.get('id');
      if (!teamId) return;

      this.teamsService.leaveTeam(teamId).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.dialog.open(AlertDialogComponent, {
            data: {
              message: 'Failed to leave team: ' + (err.error?.message || 'Unknown error'),
            },
          });
        },
      });
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
