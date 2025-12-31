import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SignalingService {

  private ws!: WebSocket;

  users$ = new BehaviorSubject<any[]>([]);

  offer$ = new BehaviorSubject<any>(null);
  answer$ = new BehaviorSubject<any>(null);
  iceCandidate$ = new BehaviorSubject<any>(null);

  connect(username: string, peerId: string) {
    this.ws = new WebSocket("wss://angular-chat-server-1.onrender.com");

    this.ws.onopen = () => {
      console.log("Connected to signaling server");

      this.send({
        type: "register",
        username,
        peerId
      });
    };

    this.ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      console.log("SIGNALING MESSAGE:", data);

      switch (data.type) {

        case "users":
          this.users$.next(data.users);
          break;

        case "offer":
          this.offer$.next(data);
          break;

        case "answer":
          this.answer$.next(data);
          break;

        case "ice-candidate":
          this.iceCandidate$.next(data);
          break;

      }
    };

    this.ws.onerror = (err) => console.error("WebSocket Error:", err);
    this.ws.onclose = () => console.warn("WebSocket Closed");
  }

  send(data: any) {
    this.ws.send(JSON.stringify(data));
  }
}