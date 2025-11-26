import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private readonly socket: Socket;

  constructor() {
    this.socket = io('http://localhost:3333', {
      withCredentials: true,
      autoConnect: false,
    });
  }

  connect() {
    this.socket.connect();
  }

  disconnect() {
    this.socket.disconnect();
  }

  joinRoom(roomId: string) {
    this.socket.emit('join-room', roomId);
  }

  emit(event: string, data: unknown) {
    this.socket.emit(event, data);
  }

  on(event: string): Observable<unknown> {
    return new Observable((observer) => {
      this.socket.on(event, (data: unknown) => observer.next(data));
    });
  }

  authenticate(userId: number) {
    this.socket.emit('authenticate', userId);
  }
}
