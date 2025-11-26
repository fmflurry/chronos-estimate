import { Component, inject, effect, signal, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from './core/services/auth.service';
import { NotificationsService } from './core/services/notifications.service';
import { WebSocketService } from './core/services/websocket.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule, MatBadgeModule, MatMenuModule, MatDividerModule, MatTooltipModule],
  template: `
    <div class="app-shell">
      <mat-toolbar color="primary" class="app-header">
        <div class="brand-container" routerLink="/dashboard">
          <img src="logo.svg" alt="Chronos" class="brand-logo" />
          <span class="brand">ChronosEstimate</span>
        </div>
        <span class="spacer"></span>
        <nav class="nav">
          <a mat-button routerLink="/dashboard">Dashboard</a>
        </nav>
        <div class="user-actions">
          @if (currentUser()) {
          <button mat-icon-button [matMenuTriggerFor]="notificationMenu" matTooltip="Notifications">
            <mat-icon [matBadge]="unreadCount()" [matBadgeHidden]="unreadCount() === 0" matBadgeColor="warn">notifications</mat-icon>
          </button>
          <mat-menu #notificationMenu="matMenu" class="notification-menu">
            <div class="notification-header" (click)="$event.stopPropagation()">
              <div class="header-content">
                <mat-icon class="header-icon">notifications</mat-icon>
                <span class="header-title">Notifications</span>
              </div>
              @if (unreadCount() > 0) {
              <button mat-icon-button (click)="markAllAsRead(); $event.stopPropagation()" [matTooltip]="'Mark all as read'" class="mark-all-btn">
                <mat-icon>done_all</mat-icon>
              </button>
              }
            </div>
            <mat-divider></mat-divider>
            <div class="notifications-list">
              @if (notifications().length === 0) {
              <div class="no-notifications">
                <mat-icon class="empty-icon">notifications_none</mat-icon>
                <span class="empty-text">No notifications</span>
              </div>
              } @else {
              @for (notification of notifications(); track notification.id) {
              <div class="notification-item" [class.unread]="!notification.read">
                <div class="notification-icon">
                  @if (notification.type === 'team_invite') {
                  <mat-icon>group_add</mat-icon>
                  } @else if (notification.type === 'room_invite') {
                  <mat-icon>meeting_room</mat-icon>
                  } @else {
                  <mat-icon>info</mat-icon>
                  }
                </div>
                <div class="notification-body" (click)="handleNotification(notification)">
                  <div class="notification-message">{{ notification.message }}</div>
                  <div class="notification-time">{{ notification.createdAt | date: 'short' }}</div>
                </div>
                <div class="notification-actions">
                  @if (!notification.read) {
                  <button mat-icon-button (click)="markNotificationAsRead(notification.id); $event.stopPropagation()" [matTooltip]="'Mark as read'" class="action-btn">
                    <mat-icon>done</mat-icon>
                  </button>
                  <div class="unread-indicator"></div>
                  }
                  <button mat-icon-button (click)="deleteNotification(notification.id); $event.stopPropagation()" [matTooltip]="'Delete'" class="action-btn">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
              }
              }
            </div>
          </mat-menu>
          <img class="avatar" [src]="currentUser().avatarUrl || ''" alt="" />
          <span class="name">{{ currentUser().fullName || currentUser().email }}</span>
          <button mat-button (click)="logout()">Logout</button>
          } @else {
          <a mat-button routerLink="/login">Login</a>
          }
        </div>
      </mat-toolbar>
      <main class="app-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      .app-shell {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      .app-header {
        position: sticky;
        top: 0;
        z-index: 100;
      }
      .brand-container {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        cursor: pointer;
        margin-right: 2rem;
        transition: opacity 0.2s;
      }
      .brand-container:hover {
        opacity: 0.8;
      }
      .brand-logo {
        height: 36px;
        width: auto;
      }
      .brand {
        font-weight: 600;
        font-size: 1.1rem;
      }
      .spacer {
        flex: 1 1 auto;
      }
      .nav {
        display: flex;
        gap: 1rem;
      }
      .user-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-left: 1rem;
      }
      .avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--nord2);
      }
      .name {
        font-size: 0.9rem;
        margin-right: 0.5rem;
      }
      .app-content {
        flex: 1;
      }
      ::ng-deep .notification-menu {
        min-width: 400px;
        max-width: 450px;
        max-height: 600px;
        padding: 0 !important;
      }
      ::ng-deep .notification-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.25rem;
        background: var(--nord1);
        border-bottom: 1px solid var(--nord3);
        position: sticky;
        top: 0;
        z-index: 1;
      }
      ::ng-deep .header-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      ::ng-deep .header-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: var(--nord10);
      }
      ::ng-deep .header-title {
        font-weight: 600;
        font-size: 1.125rem;
        color: var(--nord6);
      }
      ::ng-deep .mark-all-btn {
        width: 36px;
        height: 36px;
        line-height: 36px;
      }
      ::ng-deep .mark-all-btn mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      ::ng-deep .notifications-list {
        max-height: 500px;
        overflow-y: auto;
      }
      ::ng-deep .notification-item {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        padding: 1rem 1.25rem;
        position: relative;
        border-bottom: 1px solid var(--nord2);
      }
      ::ng-deep .notification-item:hover {
        background-color: var(--nord2);
      }
      ::ng-deep .notification-item.unread {
        background-color: rgba(136, 192, 208, 0.08);
      }
      ::ng-deep .notification-item.unread:hover {
        background-color: rgba(136, 192, 208, 0.15);
      }
      ::ng-deep .notification-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--nord3);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      ::ng-deep .notification-icon mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
        color: var(--nord10);
      }
      ::ng-deep .notification-body {
        flex: 1;
        min-width: 0;
        padding-top: 0.25rem;
        cursor: pointer;
      }
      ::ng-deep .notification-message {
        font-size: 0.9375rem;
        color: var(--nord6);
        line-height: 1.5;
        margin-bottom: 0.375rem;
      }
      ::ng-deep .notification-time {
        font-size: 0.8125rem;
        color: var(--nord4);
      }
      ::ng-deep .notification-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
      }
      ::ng-deep .action-btn {
        width: 32px;
        height: 32px;
        line-height: 32px;
      }
      ::ng-deep .action-btn mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      ::ng-deep .unread-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--nord10);
        flex-shrink: 0;
      }
      ::ng-deep .no-notifications {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 2rem;
        gap: 1rem;
        color: var(--nord4);
      }
      ::ng-deep .empty-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        opacity: 0.4;
      }
      ::ng-deep .empty-text {
        font-size: 1rem;
        font-weight: 500;
      }
    `,
  ],
})
export class App implements OnInit {
  auth = inject(AuthService);
  router = inject(Router);
  notificationsService = inject(NotificationsService);
  ws = inject(WebSocketService);
  currentUser = this.auth.currentUser;
  
  notifications = signal<any[]>([]);
  unreadCount = signal(0);

  constructor() {
    effect(() => {
      const user = this.currentUser();
      if (!user && this.router.url !== '/login') {
        this.router.navigate(['/login']);
      }
      if (user) {
        this.ws.connect();
        this.ws.authenticate(user.id);
        this.loadNotifications();
        
        this.notificationsService.onNewNotification().subscribe((notification: any) => {
          this.notifications.update(current => [notification, ...current]);
          this.unreadCount.update(count => count + 1);
        });

        this.notificationsService.onNotificationDeleted().subscribe((data: any) => {
          this.notifications.update(current => current.filter(n => n.id !== data.id));
          this.unreadCount.update(count => {
            const deletedNotification = this.notifications().find(n => n.id === data.id);
            return deletedNotification && !deletedNotification.read ? count - 1 : count;
          });
        });
      }
    });
  }

  ngOnInit() {
    this.loadNotifications();
    setInterval(() => {
      if (this.currentUser()) {
        this.loadNotifications();
      }
    }, 30000);
  }

  loadNotifications() {
    this.notificationsService.getNotifications().subscribe({
      next: (notifications) => {
        this.notifications.set(notifications);
        this.unreadCount.set(notifications.filter((n: any) => !n.read).length);
      },
      error: () => {}
    });
  }

  handleNotification(notification: any) {
    if (!notification.read) {
      this.notificationsService.markAsRead(notification.id).subscribe(() => {
        this.loadNotifications();
      });
    }
    
    if (notification.link) {
      this.router.navigateByUrl(notification.link);
    }
  }

  markNotificationAsRead(notificationId: number) {
    this.notificationsService.markAsRead(notificationId).subscribe({
      next: () => {
        this.loadNotifications();
      },
      error: (err) => {
        console.error('Failed to mark notification as read:', err);
      }
    });
  }

  markAllAsRead() {
    this.notificationsService.markAllAsRead().subscribe({
      next: () => {
        this.loadNotifications();
      },
      error: (err) => {
        console.error('Failed to mark all as read:', err);
      }
    });
  }

  deleteNotification(notificationId: number) {
    this.notificationsService.delete(notificationId).subscribe({
      next: () => {
        this.loadNotifications();
      },
      error: (err) => {
        console.error('Failed to delete notification:', err);
      }
    });
  }

  logout() {
    this.auth.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
    });
  }
}
