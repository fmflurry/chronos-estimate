import { Component, inject, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WebSocketService } from '../core/services/websocket.service';
import { RoomsService } from '../core/services/rooms.service';
import { AutocompleteComponent } from '../shared/components/autocomplete/autocomplete.component';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [CommonModule, AutocompleteComponent],
  template: `
    <div class="room-shell">
      <header class="room-header">
        <div class="room-info">
          <h2>{{ room()?.name || 'Loading...' }}</h2>
          <span class="status">{{ roomState() | titlecase }}</span>
        </div>
        <button (click)="leaveRoom()" class="btn-danger">Exit</button>
      </header>
      
      <div class="room-body">
        <aside class="participants-sidebar">
          <h3>Participants</h3>
          <ul>
            @for (p of participants(); track p.id) {
              <li>{{ p.name || 'User ' + p.id }}</li>
            }
          </ul>
        </aside>
        
        <main class="room-content">
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
              <h3>{{ currentWorkItem()?.fields['System.Title'] }}</h3>
              <p>Review the work item details.</p>
              <button *ngIf="isHost()" (click)="startVoting()" class="btn-primary">Start Voting</button>
            </div>
          } @else if (roomState() === 'deliberation') {
            <div class="state-deliberation">
              <h3>Voting in progress...</h3>
              <div class="deck">
                @for (card of deck; track card) {
                  <button 
                    class="card-btn" 
                    [class.selected]="myVote() === card"
                    (click)="submitVote(card)">
                    {{ card }}
                  </button>
                }
              </div>
              <button *ngIf="isHost()" (click)="revealVotes()" class="btn-primary">Reveal Cards</button>
            </div>
          } @else if (roomState() === 'reveal') {
            <div class="state-reveal">
              <h3>Results</h3>
              <div class="results-grid">
                @for (v of votes(); track v.userId) {
                  <div class="vote-card">
                    <span>User {{ v.userId }}</span>
                    <strong>{{ v.vote }}</strong>
                  </div>
                }
              </div>
            </div>
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    .room-shell { display: flex; flex-direction: column; height: 100vh; }
    .room-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1rem 2rem; background: var(--nord1); border-bottom: 1px solid var(--nord0);
    }
    .room-body { display: flex; flex: 1; }
    .participants-sidebar {
      width: 250px; background: var(--nord1); border-right: 1px solid var(--nord0); padding: 1rem;
    }
    .room-content { flex: 1; padding: 2rem; display: flex; justify-content: center; align-items: center; flex-direction: column; }
    .btn-danger { background: var(--nord11); color: var(--nord6); padding: 0.5rem 1rem; border: none; border-radius: 4px; }
    .btn-primary { background: var(--nord8); color: var(--nord0); padding: 0.5rem 1rem; border: none; border-radius: 4px; margin-top: 1rem; }
    .state-idle, .state-analysis, .state-deliberation, .state-reveal { display: flex; flex-direction: column; align-items: center; gap: 1rem; width: 100%; }
    
    .deck { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
    .card-btn {
      width: 60px; height: 90px; border: 2px solid var(--nord3); background: var(--nord0); color: var(--nord4);
      border-radius: 8px; font-size: 1.2rem; font-weight: bold; transition: all 0.2s;
      &:hover { transform: translateY(-5px); border-color: var(--nord8); }
      &.selected { background: var(--nord8); color: var(--nord0); border-color: var(--nord8); transform: translateY(-10px); }
    }
    
    .results-grid { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
    .vote-card {
      background: var(--nord1); padding: 1rem; border-radius: 8px; border: 1px solid var(--nord3);
      display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
      strong { font-size: 1.5rem; color: var(--nord8); }
    }
  `]
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
    
    this.roomsService.getRoom(this.roomId).subscribe(room => this.room.set(room));
    
    this.wsService.connect();
    this.wsService.joinRoom(this.roomId);
    
    this.wsService.on('participant-joined').subscribe(data => {
      this.participants.update(prev => [...prev, data]);
    });
    
    this.wsService.on('state-change').subscribe(data => {
      this.roomState.set(data.state);
      if (data.workItem) {
        this.currentWorkItem.set(data.workItem);
      }
    });
    
    this.wsService.on('votes-revealed').subscribe(data => {
      this.roomState.set('reveal');
      this.votes.set(data.votes);
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
