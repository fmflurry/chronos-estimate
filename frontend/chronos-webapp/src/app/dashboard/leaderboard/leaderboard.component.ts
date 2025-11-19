import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-grid">
      <div class="stat-item">
        <span class="label">Total Votes</span>
        <span class="value">{{ stats()?.totalVotes || 0 }}</span>
      </div>
      <div class="stat-item">
        <span class="label">Correct Predictions</span>
        <span class="value">{{ stats()?.correctPredictions || 0 }}</span>
      </div>
      <div class="stat-item">
        <span class="label">Accuracy</span>
        <span class="value">{{ stats()?.accuracy || 0 }}%</span>
      </div>
    </div>
  `,
  styles: [
    `
      .stats-grid {
        display: flex;
        gap: 1rem;
        justify-content: space-around;
      }
      .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .label {
        color: var(--nord3);
        font-size: 0.9rem;
      }
      .value {
        color: var(--nord8);
        font-size: 1.5rem;
        font-weight: bold;
      }
    `,
  ],
})
export class LeaderboardComponent {
  http = inject(HttpClient);
  stats = signal<any>(null);

  constructor() {
    this.http
      .get('http://localhost:3333/api/statistics', { withCredentials: true })
      .subscribe((data) => this.stats.set(data));
  }
}
