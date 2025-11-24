import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsComponent } from '../settings/settings.component';
import { RoomsService } from '../core/services/rooms.service';
import { TeamsService } from '../core/services/teams.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { Subject } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { LeaderboardComponent } from './leaderboard/leaderboard.component';
import { CreateTeamDialogComponent } from './create-team-dialog/create-team-dialog.component';
import { SetDisplayNameDialogComponent } from '../shared/components/set-display-name-dialog/set-display-name-dialog.component';
import { AuthService } from '../core/services/auth.service';

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
    MatAutocompleteModule,
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
            <mat-card-title>Teams</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="teams-actions">
              <button mat-raised-button color="primary" (click)="createTeam()">Create Team</button>
              <div class="join-team">
                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Search Team</mat-label>
                  <input
                    matInput
                    [ngModel]="joinTeamSearchQuery()"
                    (ngModelChange)="onJoinTeamSearch($event)"
                    (focus)="onJoinTeamFieldFocus()"
                    placeholder="Search by team name"
                    [matAutocomplete]="joinTeamAuto"
                  />
                  <mat-autocomplete #joinTeamAuto="matAutocomplete" (optionSelected)="selectTeamToJoin($event.option.value)">
                    @for (team of joinTeamSearchResults(); track team.id) {
                      <mat-option [value]="team">
                        {{ team.name }}
                      </mat-option>
                    }
                  </mat-autocomplete>
                </mat-form-field>
              </div>
            </div>
            <mat-nav-list class="teams-list">
              @for (team of teams(); track team.id) {
              <a mat-list-item (click)="enterTeam(team.id)">
                <span matListItemTitle>{{ team.name }}</span>
                <span matListItemLine>{{ team.updatedAt | date : 'short' }}</span>
              </a>
              } @empty {
              <mat-list-item>No teams yet. Create one!</mat-list-item>
              }
            </mat-nav-list>
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
      .teams-actions {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .join-team {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }
      .teams-list {
        max-height: 300px;
        overflow-y: auto;
      }
    `,
  ],
})
export class DashboardComponent {
  roomsService = inject(RoomsService);
  teamsService = inject(TeamsService);
  router = inject(Router);
  dialog = inject(MatDialog);
  authService = inject(AuthService);

  rooms = signal<any[]>([]);
  joinRoomId = '';
  teams = signal<any[]>([]);
  joinTeamSearchQuery = signal('');
  joinTeamSearchResults = signal<any[]>([]);
  private joinTeamSearchSubject = new Subject<string>();

  constructor() {
    this.loadRooms();
    this.loadTeams();

    this.joinTeamSearchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          return this.teamsService.searchTeams(term || '').pipe(catchError(() => of([])));
        })
      )
      .subscribe((teams) => this.joinTeamSearchResults.set(teams));

    effect(() => {
      const user = this.authService.currentUser();
      if (user && !user.fullName) {
        this.checkDisplayName();
      }
    });
  }

  private checkDisplayName() {
    const user = this.authService.currentUser();
    if (!user || user.fullName) {
      return;
    }

    const dialogRef = this.dialog.open(SetDisplayNameDialogComponent, {
      width: '500px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(() => {
      const updatedUser = this.authService.currentUser();
      if (updatedUser && !updatedUser.fullName) {
        this.checkDisplayName();
      }
    });
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

  loadTeams() {
    this.teamsService.getTeams().subscribe((teams) => this.teams.set(teams));
  }

  createTeam() {
    const dialogRef = this.dialog.open(CreateTeamDialogComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe((team) => {
      if (team) {
        this.loadTeams();
      }
    });
  }

  onJoinTeamSearch(term: string) {
    this.joinTeamSearchQuery.set(term);
    this.joinTeamSearchSubject.next(term || '');
  }

  onJoinTeamFieldFocus() {
    if (this.joinTeamSearchResults().length === 0) {
      this.joinTeamSearchSubject.next('');
    }
  }

  selectTeamToJoin(team: any) {
    if (!team || !team.id) return;
    this.teamsService.joinTeam(team.id.toString()).subscribe({
      next: () => {
        this.loadTeams();
        this.joinTeamSearchQuery.set('');
        this.joinTeamSearchResults.set([]);
      },
      error: () => alert('Failed to join team'),
    });
  }

  enterTeam(id: number) {
    this.router.navigate(['/team', id]);
  }
}
