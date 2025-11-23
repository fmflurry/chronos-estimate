import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WebSocketService } from '../core/services/websocket.service';
import { RoomsService } from '../core/services/rooms.service';
import { AutocompleteComponent } from '../shared/components/autocomplete/autocomplete.component';
import { AuthService } from '../core/services/auth.service';
import { StateChangeData } from '../shared/models/room.models';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [
    CommonModule,
    AutocompleteComponent,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatListModule,
    MatCardModule,
    MatIconModule,
  ],
  template: `
    <mat-sidenav-container class="room-shell">
      <mat-sidenav #sidenav mode="side" opened class="participants-sidebar">
        <mat-toolbar>Participants</mat-toolbar>
        <mat-nav-list>
          @for (p of participants(); track p.id) {
          <mat-list-item>
            <span matListItemTitle>{{ p.name || 'User ' + p.id }}</span>
          </mat-list-item>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="room-main-content">
        <mat-toolbar color="primary">
          <span>{{ room()?.name || 'Loading...' }}</span>
          <span class="spacer"></span>
          <span class="status-badge">{{ roomState() | titlecase }}</span>
          <button mat-icon-button (click)="leaveRoom()">
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
              <mat-card-actions *ngIf="isHost()" align="end">
                <button mat-raised-button color="accent" (click)="startVoting()">
                  Start Voting
                </button>
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
          </div>
          }
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      .room-shell {
        height: calc(100vh - 64px); /* Adjust for main app toolbar if needed, or make it full screen */
        height: 100vh;
      }
      .participants-sidebar {
        width: 250px;
        background: var(--nord1);
        border-right: 1px solid var(--nord0);
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
        align-items: flex-start; /* Align to top */
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
        max-width: 800px;
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
  route = inject(ActivatedRoute);
  router = inject(Router);
  wsService = inject(WebSocketService);
  roomsService = inject(RoomsService);
  authService = inject(AuthService);

  room = signal<any>(null);
  participants = signal<any[]>([]);
  roomState = signal<'idle' | 'analysis' | 'deliberation' | 'reveal'>('idle');
  currentWorkItem = signal<any>(null);
  votes = signal<any[]>([]);
  myVote = signal<string | null>(null);
  roomId = '';

  deck = ['1', '2', '3', '5', '8', '13', '21', '?'];

  ngOnInit() {
    this.roomId = this.route.snapshot.paramMap.get('id')!;

    this.roomsService.getRoom(this.roomId).subscribe((room) => this.room.set(room));

    this.wsService.connect();
    this.wsService.joinRoom(this.roomId);

    this.wsService.on('participant-joined').subscribe((data) => {
      this.participants.update((prev) => [...prev, data]);
    });

    this.wsService.on('state-change').subscribe((data) => {
      const stateData = data as StateChangeData;
      this.roomState.set(stateData.state);
      if (stateData.workItem) {
        this.currentWorkItem.set(stateData.workItem);
      }
    });

    this.wsService.on('votes-revealed').subscribe((data) => {
      const votesData = data as { votes: Array<{ userId: string; vote: string }> };
      this.roomState.set('reveal');
      this.votes.set(votesData.votes);
    });
  }

  ngOnDestroy() {
    this.wsService.disconnect();
  }

  leaveRoom() {
    this.router.navigate(['/dashboard']);
  }

  isHost() {
    const user = this.authService.currentUser();
    const room = this.room();
    return user && room && user.id === room.ownerId;
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
}
