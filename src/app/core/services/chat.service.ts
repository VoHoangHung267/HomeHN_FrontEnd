import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import { ApiResponse, ChatRoom, Message } from '../models';
import { AuthService } from './auth.service';
import SockJS from 'sockjs-client';

export interface ChatAssistantResult {
  answer: string;
  note?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly API = '/api/chat';

  readonly connected = signal(false);
  readonly unreadTotal = signal(0);

  private stompClient: Client | null = null;
  private handlers = new Map<number, (msg: Message) => void>();

  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  connect(): void {
    if (this.stompClient?.active) return;

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/api/ws') as any,
      connectHeaders: { Authorization: `Bearer ${this.auth.token()}` },

      onConnect: () => {
        this.connected.set(true);
        this.stompClient!.subscribe('/user/queue/messages', (frame: IMessage) => {
          const msg: Message = JSON.parse(frame.body);
          this.handlers.get(msg.chatRoomId)?.(msg);
          if (!this.handlers.has(msg.chatRoomId)) {
            this.unreadTotal.update(n => n + 1);
          }
        });
      },

      onDisconnect: () => this.connected.set(false),
      onStompError: f => console.error('STOMP error', f),
      reconnectDelay: 5000
    });

    this.stompClient.activate();
  }

  disconnect(): void {
    this.stompClient?.deactivate();
    this.connected.set(false);
  }

  send(chatRoomId: number, content: string): void {
    this.stompClient?.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({ chatRoomId, content })
    });
  }

  onMessage(chatRoomId: number, handler: (msg: Message) => void): void {
    this.handlers.set(chatRoomId, handler);
  }

  offMessage(chatRoomId: number): void {
    this.handlers.delete(chatRoomId);
  }

  resetUnread(): void {
    this.unreadTotal.set(0);
  }

  openChat(roomId: number): Observable<ApiResponse<ChatRoom>> {
    return this.http.post<ApiResponse<ChatRoom>>(`${this.API}/rooms/${roomId}/open`, {});
  }

  getMyChats(): Observable<ApiResponse<ChatRoom[]>> {
    return this.http.get<ApiResponse<ChatRoom[]>>(`${this.API}/my-chats`);
  }

  getMessages(chatRoomId: number): Observable<ApiResponse<Message[]>> {
    return this.http.get<ApiResponse<Message[]>>(`${this.API}/${chatRoomId}/messages`);
  }

  askAssistant(chatRoomId: number, question: string): Observable<ApiResponse<ChatAssistantResult>> {
    return this.http.post<ApiResponse<ChatAssistantResult>>(
      `${this.API}/${chatRoomId}/assistant`,
      { question }
    );
  }
}
