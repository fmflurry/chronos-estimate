import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsComponent } from '../settings/settings.component';
import { RoomsService } from '../core/services/rooms.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LeaderboardComponent } from './leaderboard/leaderboard.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    SettingsComponent,
    FormsModule,
    LeaderboardComponent,
    MatCardModule,
    MatButtonModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <div class="dashboard-container">
      <h2>Dashboard</h2>
      <div class="dashboard-grid">
        <mat-card class="card leaderboards">
          <mat-card-header>
            <mat-card-title>Leaderboards</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-leaderboard></app-leaderboard>
          </mat-card-content>
        </mat-card>
        <mat-card class="card team">
          <mat-card-header>
            <mat-card-title>Team Members</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Coming soon...</p>
          </mat-card-content>
        </mat-card>
        <mat-card class="card rooms">
          <mat-card-header>
            <mat-card-title>Rooms</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="rooms-actions">
              <button mat-raised-button color="primary" (click)="createRoom()">Create Room</button>
              <div class="join-room">
                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Room ID</mat-label>
                  <input matInput [(ngModel)]="joinRoomId" placeholder="Enter ID" />
                </mat-form-field>
                <button mat-stroked-button (click)="joinRoom()">Join</button>
              </div>
            </div>
            <mat-nav-list class="rooms-list">
              @for (room of rooms(); track room.id) {
              <a mat-list-item (click)="enterRoom(room.id)">
                <span matListItemTitle>{{ room.name }}</span>
                <span matListItemLine>{{ room.updatedAt | date : 'short' }}</span>
              </a>
              } @empty {
              <mat-list-item>No rooms yet. Create one!</mat-list-item>
              }
            </mat-nav-list>
          </mat-card-content>
        </mat-card>
        <mat-card class="card settings">
          <mat-card-header>
            <mat-card-title>Settings</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-settings></app-settings>
          </mat-card-content>
        </mat-card>
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
        height: 100%;
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
        align-items: center;
      }
      .full-width {
        flex: 1;
      }
      .rooms-list {
        max-height: 300px;
        overflow-y: auto;
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
