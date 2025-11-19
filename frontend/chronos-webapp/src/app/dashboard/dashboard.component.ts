import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsComponent } from '../settings/settings.component';
import { RoomsService } from '../core/services/rooms.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LeaderboardComponent } from './leaderboard/leaderboard.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SettingsComponent, FormsModule, LeaderboardComponent],
  template: `
    <div class="dashboard-container">
      <h2>Dashboard</h2>
      <div class="dashboard-grid">
        <div class="card leaderboards">
          <h3>Leaderboards</h3>
          <app-leaderboard></app-leaderboard>
        </div>
        <div class="card team">
          <h3>Team Members</h3>
          <p>Coming soon...</p>
        </div>
        <div class="card rooms">
          <h3>Rooms</h3>
          <div class="rooms-actions">
            <button (click)="createRoom()" class="btn-primary">Create Room</button>
            <div class="join-room">
              <input [(ngModel)]="joinRoomId" placeholder="Room ID" />
              <button (click)="joinRoom()" class="btn-secondary">Join</button>
            </div>
          </div>
          <ul class="rooms-list">
            @for (room of rooms(); track room.id) {
            <li (click)="enterRoom(room.id)">
              <span class="room-name">{{ room.name }}</span>
              <span class="room-date">{{ room.updatedAt | date : 'short' }}</span>
            </li>
            } @empty {
            <li>No rooms yet. Create one!</li>
            }
          </ul>
        </div>
        <div class="card settings">
          <h3>Settings</h3>
          <app-settings></app-settings>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        padding: 1rem;
      }
      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
        margin-top: 1.5rem;
      }
      .card {
        background: var(--nord1);
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      h3 {
        color: var(--nord8);
        margin-bottom: 1rem;
      }

      .rooms-actions {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .join-room {
        display: flex;
        gap: 0.5rem;
      }
      input {
        padding: 0.5rem;
        border: 1px solid var(--nord3);
        background: var(--nord0);
        color: var(--nord4);
        border-radius: 4px;
        flex: 1;
      }

      .btn-primary {
        background: var(--nord8);
        color: var(--nord0);
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
      }
      .btn-secondary {
        background: var(--nord3);
        color: var(--nord6);
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
      }

      .rooms-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .rooms-list li {
        padding: 0.75rem;
        border-bottom: 1px solid var(--nord0);
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        &:hover {
          background: var(--nord2);
        }
      }
      .room-date {
        font-size: 0.8rem;
        color: var(--nord3);
      }
    `,
  ],
})
export class DashboardComponent {
  roomsService = inject(RoomsService);
  router = inject(Router);

  rooms = signal<any[]>([]);
  joinRoomId = '';

  constructor() {
    this.loadRooms();
  }

  loadRooms() {
    this.roomsService.getRooms().subscribe((rooms) => this.rooms.set(rooms));
  }

  createRoom() {
    this.roomsService.createRoom().subscribe((room) => {
      this.loadRooms();
      this.enterRoom(room.id);
    });
  }

  joinRoom() {
    if (!this.joinRoomId) return;
    this.roomsService.joinRoom(this.joinRoomId).subscribe({
      next: (room) => {
        this.enterRoom(room.id);
      },
      error: () => alert('Room not found'),
    });
  }

  enterRoom(id: number) {
    this.router.navigate(['/room', id]);
  }
}
