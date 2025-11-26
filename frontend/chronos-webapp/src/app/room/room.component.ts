import { Component, inject, OnInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WebSocketService } from '../core/services/websocket.service';
import { RoomsService } from '../core/services/rooms.service';
import { UsersService } from '../core/services/users.service';
import { InvitationsService } from '../core/services/invitations.service';
import { AutocompleteComponent } from '../shared/components/autocomplete/autocomplete.component';
import { AuthService } from '../core/services/auth.service';
import { StateChangeData } from '../shared/models/room.models';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { AlertDialogComponent } from '../shared/components/alert-dialog/alert-dialog.component';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AutocompleteComponent,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatListModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatSnackBarModule,
  ],
  template: `
    <mat-sidenav-container class="room-shell">
      <mat-sidenav #sidenav mode="side" opened class="participants-sidebar">
        <mat-toolbar>
          <span>Participants</span>
          @if (isHost()) {
          <button mat-icon-button (click)="openInviteDialog()" matTooltip="Invite Participant" class="toolbar-btn">
            <mat-icon>person_add</mat-icon>
          </button>
          }
        </mat-toolbar>
        <mat-nav-list>
          @for (p of room()?.participants || []; track p.id) {
          <mat-list-item>
            <div class="participant-item">
              <div class="participant-info">
                <span matListItemTitle>{{ p.user?.fullName || p.user?.email || 'User ' + p.id }}</span>
                <span class="role-badge">{{ p.role | titlecase }}</span>
              </div>
              @if (isHost() && p.userId !== currentUserId()) {
              <button 
                mat-icon-button 
                color="warn" 
                (click)="removeParticipant(p.id)"
                matTooltip="Remove participant"
                class="remove-btn"
              >
                <mat-icon>person_remove</mat-icon>
              </button>
              }
            </div>
          </mat-list-item>
          }
          @for (invitation of room()?.invitations || []; track invitation.id) {
          <mat-list-item>
            <div class="participant-item pending">
              <div class="participant-info">
                <span matListItemTitle>{{ invitation.invitedUser?.fullName || invitation.invitedUserEmail }}</span>
                <span class="role-badge pending-badge">Pending</span>
              </div>
              @if (isHost()) {
              <button 
                mat-icon-button 
                color="warn" 
                (click)="cancelInvitation(invitation.id)"
                matTooltip="Cancel invitation"
                class="remove-btn"
              >
                <mat-icon>cancel</mat-icon>
              </button>
              }
            </div>
          </mat-list-item>
          }
        </mat-nav-list>
        
        @if (showInviteDialog && isHost()) {
        <div class="invite-panel">
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
              (optionSelected)="inviteParticipant($event.option.value)"
              [displayWith]="displayUser"
            >
              @if (inviteSearchQuery().length >= 2) { 
                @for (user of inviteSearchResults(); track user.id) {
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
          <button mat-button (click)="showInviteDialog = false">Cancel</button>
        </div>
        }
      </mat-sidenav>

      <mat-sidenav-content class="room-main-content">
        <mat-toolbar color="primary">
          <div class="room-name-container">
            @if (isEditingRoomName && isHost()) {
            <input 
              #roomNameInput
              class="room-name-input"
              [value]="room()?.name || ''"
              (blur)="saveRoomName(roomNameInput.value)"
              (keyup.enter)="saveRoomName(roomNameInput.value)"
              (keyup.escape)="cancelEditRoomName()"
            />
            } @else {
            <span class="room-name" (click)="isHost() ? startEditRoomName() : null">
              {{ room()?.name || 'Loading...' }}
            </span>
            @if (isHost()) {
            <button mat-icon-button (click)="startEditRoomName()" matTooltip="Rename Room" class="edit-room-btn">
              <mat-icon>edit</mat-icon>
            </button>
            }
            }
          </div>
          <span class="spacer"></span>
          <span class="status-badge">{{ roomState() | titlecase }}</span>
          <button mat-icon-button (click)="leaveRoom()" matTooltip="Leave Room">
            <mat-icon>exit_to_app</mat-icon>
          </button>
          <button mat-icon-button (click)="closeRoom()" matTooltip="Close">
            <mat-icon>close</mat-icon>
          </button>
        </mat-toolbar>

        <div class="room-content-wrapper">
          @if (roomState() === 'idle') {
          <div class="state-idle" *ngIf="isHost()">
            <h3>Select a Work Item to Estimate</h3>
            <app-autocomplete (selected)="onWorkItemSelected($event)"></app-autocomplete>
          </div>
          <div class="state-idle" *ngIf="!isHost()">
            <h3>Waiting for Host...</h3>
          </div>
          } @else if (roomState() === 'analysis') {
          <div class="state-analysis">
            <mat-card class="work-item-card">
              <mat-card-header>
                <mat-card-title>{{ currentWorkItem()?.fields['System.Title'] }}</mat-card-title>
                <mat-card-subtitle>#{{ currentWorkItem()?.id }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Review the work item details.</p>
              </mat-card-content>
              <mat-card-actions align="end">
                @if (isHost()) {
                <button mat-button color="warn" (click)="cancelWorkItem()">
                  Cancel
                </button>
                <button mat-raised-button color="accent" (click)="startVoting()">
                  Start Voting
                </button>
                }
              </mat-card-actions>
            </mat-card>
          </div>
          } @else if (roomState() === 'deliberation') {
          <div class="state-deliberation">
            <h3>Voting in progress...</h3>
            <div class="deck">
              @for (card of deck; track card) {
              <button
                mat-stroked-button
                class="card-btn"
                [class.selected]="myVote() === card"
                (click)="submitVote(card)"
              >
                {{ card }}
              </button>
              }
            </div>
            <button
              mat-raised-button
              color="accent"
              *ngIf="isHost()"
              (click)="revealVotes()"
              class="reveal-btn"
            >
              Reveal Cards
            </button>
          </div>
          } @else if (roomState() === 'reveal') {
          <div class="state-reveal">
            <h3>Results</h3>
            <div class="results-grid">
              @for (v of votes(); track v.userId) {
              <mat-card class="vote-card">
                <mat-card-content class="vote-content">
                  <div class="vote-value">{{ v.vote }}</div>
                  <div class="vote-user">User {{ v.userId }}</div>
                </mat-card-content>
              </mat-card>
              }
            </div>
            @if (isHost()) {
            <button mat-raised-button color="primary" (click)="startNewSession()" class="new-session-btn">
              Start New Session
            </button>
            }
          </div>
          }
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      .room-shell {
        height: calc(100vh - 64px);
        height: 100vh;
      }
      .participants-sidebar {
        width: 280px;
        background: var(--nord1);
        border-right: 1px solid var(--nord0);
      }
      .participants-sidebar mat-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .participant-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 0.5rem;
      }
      .participant-item.pending {
        opacity: 0.7;
      }
      .participant-info {
        display: flex;
        flex-direction: column;
        flex: 1;
      }
      .role-badge {
        font-size: 0.75rem;
        padding: 0.125rem 0.5rem;
        border-radius: 4px;
        background: var(--nord3);
        color: var(--nord6);
        margin-top: 0.25rem;
        width: fit-content;
      }
      .pending-badge {
        background: var(--nord9);
        color: var(--nord0);
      }
      .remove-btn {
        opacity: 0;
        transition: opacity 0.2s;
      }
      .participant-item:hover .remove-btn {
        opacity: 1;
      }
      .invite-panel {
        padding: 1rem;
        border-top: 1px solid var(--nord3);
      }
      .full-width {
        width: 100%;
      }
      .email {
        font-size: 0.875rem;
        color: var(--nord4);
      }
      .room-name-container {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .room-name {
        font-size: 1.25rem;
        font-weight: 500;
        cursor: pointer;
      }
      .room-name:hover {
        opacity: 0.8;
      }
      .edit-room-btn {
        opacity: 0.7;
        transition: opacity 0.2s;
      }
      .edit-room-btn:hover {
        opacity: 1;
      }
      .room-name-input {
        background: transparent;
        border: none;
        border-bottom: 2px solid var(--nord8);
        color: var(--nord6);
        font-size: 1.25rem;
        font-weight: 500;
        padding: 0.25rem 0.5rem;
        outline: none;
        min-width: 300px;
      }
      .room-name-input:focus {
        border-bottom-color: var(--nord10);
      }
      .room-main-content {
        display: flex;
        flex-direction: column;
      }
      .spacer {
        flex: 1 1 auto;
      }
      .status-badge {
        margin-right: 1rem;
        background: var(--nord3);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
      }
      .room-content-wrapper {
        flex: 1;
        padding: 2rem;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        overflow-y: auto;
      }
      .state-idle,
      .state-analysis,
      .state-deliberation,
      .state-reveal {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
        width: 100%;
        max-width: 90%;
      }

      .state-idle {
        max-width: 95%;
      }

      .state-idle h3 {
        font-size: 2rem;
        margin-bottom: 1rem;
      }

      .state-idle app-autocomplete {
        width: 100%;
        font-size: 1.5rem;
      }

      .state-idle app-autocomplete ::ng-deep .work-item-search {
        font-size: 1.5rem;
      }

      .state-idle app-autocomplete ::ng-deep input {
        font-size: 1.5rem;
        min-height: 70px;
      }

      .state-idle app-autocomplete ::ng-deep .mat-mdc-form-field-infix {
        min-height: 70px;
        padding-top: 20px;
        padding-bottom: 20px;
      }

      .state-idle app-autocomplete ::ng-deep .mat-mdc-option {
        min-height: 70px;
        font-size: 1.25rem;
      }

      .state-idle app-autocomplete ::ng-deep .work-item-id {
        font-size: 1.25rem;
        min-width: 110px;
      }

      .state-idle app-autocomplete ::ng-deep .work-item-title {
        font-size: 1.25rem;
      }

      .work-item-card {
        width: 100%;
      }

      .deck {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        justify-content: center;
      }
      
      .card-btn {
        height: 90px !important;
        width: 60px !important;
        font-size: 1.5rem !important;
        border-width: 2px !important;
        
        &.selected {
          background-color: var(--nord8) !important;
          color: var(--nord0) !important;
          border-color: var(--nord8) !important;
        }
      }

      .reveal-btn {
        margin-top: 1rem;
      }

      .new-session-btn {
        margin-top: 1.5rem;
      }

      .results-grid {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        justify-content: center;
      }
      .vote-card {
        width: 100px;
        text-align: center;
      }
      .vote-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }
      .vote-value {
        font-size: 2rem;
        font-weight: bold;
        color: var(--nord8);
      }
      .vote-user {
        font-size: 0.8rem;
        color: var(--nord4);
      }
    `,
  ],
})
export class RoomComponent implements OnInit, OnDestroy {
  @ViewChild('inviteInput') inviteInput?: ElementRef;
  @ViewChild('roomNameInput') roomNameInput?: ElementRef;

  route = inject(ActivatedRoute);
  router = inject(Router);
  wsService = inject(WebSocketService);
  roomsService = inject(RoomsService);
  usersService = inject(UsersService);
  invitationsService = inject(InvitationsService);
  authService = inject(AuthService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);

  room = signal<any>(null);
  participants = signal<any[]>([]);
  roomState = signal<'idle' | 'analysis' | 'deliberation' | 'reveal'>('idle');
  currentWorkItem = signal<any>(null);
  votes = signal<any[]>([]);
  myVote = signal<string | null>(null);
  roomId = '';
  showInviteDialog = false;
  isEditingRoomName = false;
  inviteSearchQuery = signal('');
  inviteSearchResults = signal<any[]>([]);
  private inviteSearchSubject = new Subject<string>();

  deck = ['1', '2', '3', '5', '8', '13', '21', '?'];

  constructor() {
    this.inviteSearchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          if (term.length < 2) {
            return of([]);
          }
          return this.usersService.searchUsers(term).pipe(
            catchError(() => of([]))
          );
        })
      )
      .subscribe((users) => {
        const currentUserId = this.currentUserId();
        const currentRoom = this.room();
        
        const filteredUsers = users.filter((user) => {
          if (user.id === currentUserId) return false;
          
          const isParticipant = currentRoom?.participants?.some((p: any) => p.userId === user.id);
          if (isParticipant) return false;
          
          const hasPendingInvitation = currentRoom?.invitations?.some(
            (inv: any) => inv.invitedUserId === user.id || inv.invitedUserEmail === user.email
          );
          if (hasPendingInvitation) return false;
          
          return true;
        });
        
        this.inviteSearchResults.set(filteredUsers);
      });

    this.invitationsService.onRoomParticipantJoined().subscribe((data: any) => {
      const currentRoom = this.room();
      if (currentRoom && currentRoom.id === data.roomId) {
        this.room.update(room => ({
          ...room,
          participants: [...(room.participants || []), data.participant],
          invitations: (room.invitations || []).filter((inv: any) => inv.id !== data.invitationId),
        }));
      }
    });

    this.invitationsService.onRoomParticipantLeft().subscribe((data: any) => {
      const currentRoom = this.room();
      const currentUserId = this.authService.currentUser()?.id;
      
      if (currentRoom && currentRoom.id === data.roomId) {
        const leftParticipant = currentRoom.participants?.find((p: any) => p.id === data.participantId);
        
        if (leftParticipant?.userId === currentUserId) {
          this.snackBar.open('You have been removed from this room', 'Close', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
          });
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 500);
        } else {
          this.room.update(room => ({
            ...room,
            participants: (room.participants || []).filter((p: any) => p.id !== data.participantId),
          }));
        }
      }
    });
  }

  ngOnInit() {
    this.roomId = this.route.snapshot.paramMap.get('id')!;
    const token = this.route.snapshot.paramMap.get('token');

    if (token && this.roomId) {
      this.showInvitationDialog(this.roomId, token);
    } else if (this.roomId) {
      this.loadRoom(this.roomId);
    }
  }

  showInvitationDialog(roomId: string, token: string) {
    this.invitationsService.getRoomInvitationDetails(roomId, token).subscribe({
      next: (invitation) => {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
          data: {
            title: 'Room Invitation',
            message: `You have been invited to join "${invitation.roomName}".\n\nDo you want to accept this invitation?`,
            confirmText: 'Accept',
            cancelText: 'Decline',
          },
        });

        dialogRef.afterClosed().subscribe((confirmed: boolean) => {
          if (confirmed) {
            this.acceptInvitation(roomId, token);
          } else {
            this.declineInvitation(roomId, token);
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

  declineInvitation(roomId: string, token: string) {
    this.invitationsService.declineRoomInvitation(roomId, token).subscribe({
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

  acceptInvitation(roomId: string, token: string) {
    this.invitationsService.acceptRoomInvitation(roomId, token).subscribe({
      next: () => {
        this.loadRoom(roomId);
        this.dialog.open(AlertDialogComponent, {
          data: { message: 'You have successfully joined the room!' },
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

  loadRoom(id: string) {
    this.roomsService.getRoom(id).subscribe({
      next: (room) => {
        this.room.set(room);
        this.wsService.connect();
        this.wsService.joinRoom(id);

        this.wsService.on('participant-joined').subscribe((data) => {
          this.participants.update((prev) => [...prev, data]);
        });

        this.wsService.on('state-change').subscribe((data) => {
          const stateData = data as StateChangeData;
          this.roomState.set(stateData.state);
          if (stateData.workItem) {
            this.currentWorkItem.set(stateData.workItem);
          } else if (stateData.state === 'idle') {
            this.currentWorkItem.set(null);
            this.votes.set([]);
            this.myVote.set(null);
          }
        });

        this.wsService.on('votes-revealed').subscribe((data) => {
          const votesData = data as { votes: Array<{ userId: string; vote: string }> };
          this.roomState.set('reveal');
          this.votes.set(votesData.votes);
        });
      },
      error: () => {
        this.dialog.open(AlertDialogComponent, {
          data: { message: 'Room not found' },
        });
        this.goBack();
      },
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  ngOnDestroy() {
    this.wsService.disconnect();
  }

  currentUserId() {
    return this.authService.currentUser()?.id;
  }

  isHost() {
    const user = this.authService.currentUser();
    const room = this.room();
    if (!user || !room) return false;
    const participant = room.participants?.find((p: any) => p.userId === user.id);
    return participant && participant.role === 'host';
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

  inviteParticipant(user: any) {
    if (!user) return;

    this.roomsService.inviteParticipant(this.roomId, user.id).subscribe({
      next: () => {
        this.showInviteDialog = false;
        this.inviteSearchQuery.set('');
        this.inviteSearchResults.set([]);
        this.roomsService.getRoom(this.roomId).subscribe((room) => this.room.set(room));
      },
      error: (err) => {
        this.dialog.open(AlertDialogComponent, {
          data: {
            message: 'Failed to invite participant: ' + (err.error?.message || 'Unknown error'),
          },
        });
      },
    });
  }

  removeParticipant(participantId: number) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: 'Are you sure you want to remove this participant?',
        confirmText: 'Remove',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      const currentUserId = this.currentUserId();
      const removedParticipant = this.room()?.participants?.find((p: any) => p.id === participantId);

      this.roomsService.removeParticipant(this.roomId, participantId).subscribe({
        next: () => {
          if (removedParticipant?.userId === currentUserId) {
            this.router.navigate(['/dashboard']);
          } else {
            this.room.update(room => ({
              ...room,
              participants: (room.participants || []).filter((p: any) => p.id !== participantId),
            }));
          }
        },
        error: (err) => {
          this.dialog.open(AlertDialogComponent, {
            data: {
              message: 'Failed to remove participant: ' + (err.error?.message || 'Unknown error'),
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

      this.roomsService.cancelInvitation(this.roomId, invitationId).subscribe({
        next: () => {
          this.room.update(room => ({
            ...room,
            invitations: (room.invitations || []).filter((inv: any) => inv.id !== invitationId),
          }));
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

  leaveRoom() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: 'Are you sure you want to leave this room?',
        confirmText: 'Leave',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.roomsService.leaveRoom(this.roomId).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.dialog.open(AlertDialogComponent, {
            data: {
              message: 'Failed to leave room: ' + (err.error?.message || 'Unknown error'),
            },
          });
          this.router.navigate(['/dashboard']);
        },
      });
    });
  }

  closeRoom() {
    this.router.navigate(['/dashboard']);
  }

  startEditRoomName() {
    this.isEditingRoomName = true;
    setTimeout(() => {
      this.roomNameInput?.nativeElement.focus();
      this.roomNameInput?.nativeElement.select();
    }, 0);
  }

  cancelEditRoomName() {
    this.isEditingRoomName = false;
  }

  saveRoomName(newName: string) {
    if (!newName || newName.trim() === '') {
      this.isEditingRoomName = false;
      return;
    }

    const trimmedName = newName.trim();
    if (trimmedName === this.room()?.name) {
      this.isEditingRoomName = false;
      return;
    }

    this.roomsService.updateRoom(this.roomId, trimmedName).subscribe({
      next: () => {
        this.room.update(room => ({ ...room, name: trimmedName }));
        this.isEditingRoomName = false;
      },
      error: (err) => {
        this.dialog.open(AlertDialogComponent, {
          data: {
            message: 'Failed to rename room: ' + (err.error?.message || 'Unknown error'),
          },
        });
        this.isEditingRoomName = false;
      },
    });
  }

  onWorkItemSelected(item: any) {
    this.wsService.emit('start-analysis', { roomId: this.roomId, workItem: item });
  }

  startVoting() {
    this.wsService.emit('start-voting', { roomId: this.roomId });
  }

  submitVote(card: string) {
    this.myVote.set(card);
    this.wsService.emit('submit-vote', { roomId: this.roomId, vote: card });
  }

  revealVotes() {
    this.wsService.emit('reveal-votes', { roomId: this.roomId });
  }

  cancelWorkItem() {
    this.roomState.set('idle');
    this.currentWorkItem.set(null);
    this.votes.set([]);
    this.myVote.set(null);
    this.wsService.emit('reset-session', { roomId: this.roomId });
  }

  startNewSession() {
    this.roomState.set('idle');
    this.currentWorkItem.set(null);
    this.votes.set([]);
    this.myVote.set(null);
    this.wsService.emit('reset-session', { roomId: this.roomId });
  }
}
