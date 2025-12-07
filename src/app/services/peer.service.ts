import { Injectable, NgZone } from "@angular/core";
import Peer, { DataConnection } from 'peerjs';
import { BehaviorSubject } from "rxjs";

@Injectable({ providedIn: 'root' })
export class PeerService {

  peer!: Peer;
  peerId$ = new BehaviorSubject<string | null>(null);

  connection: DataConnection | null = null;

  // auto-refresh
  onMessage$ = new BehaviorSubject<any>(null);

  constructor(private zone: NgZone) {}

  private safeEmit(msg: any) {
    this.zone.run(() => {
      this.onMessage$.next(msg);
    });
  }

  initPeer() {
    this.peer = new Peer({ debug: 2 });

    this.peer.on('open', id => {
      this.zone.run(() => this.peerId$.next(id));
    });

    // When someone connects to US
    this.peer.on("connection", conn => {
      console.log("🔥 Incoming connection from", conn.peer);
      
      // If we already have a connection to this peer, close the old one
      if (this.connection && this.connection.peer === conn.peer) {
        console.log("Replacing existing connection to", conn.peer);
        this.connection.close();
      }
      
      this.connection = conn;

      conn.on("open", () => {
        console.log("🔗 Incoming connection OPEN from", conn.peer);
      });

      conn.on("data", msg => {
        console.log("📥 RECEIVED:", msg);
        this.safeEmit(msg);
      });

      conn.on("close", () => {
        console.log("Incoming connection closed");
        if (this.connection === conn) {
          this.connection = null;
        }
      });

      conn.on("error", err => {
        console.error("Incoming connection error:", err);
      });
    });

    this.peer.on("error", err => console.error("PeerJS Error:", err));
  }

  // We connect to THEM
  connectToPeer(targetPeerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log("Connecting to", targetPeerId);

      // Check if already connected to this peer
      if (this.connection && this.connection.peer === targetPeerId && this.connection.open) {
        console.log("Already connected to", targetPeerId);
        this.zone.run(() => resolve());
        return;
      }

      const conn = this.peer.connect(targetPeerId, {
        reliable: true
      });
      this.connection = conn;

      conn.on("open", () => {
        console.log("🔗 Connection OPEN to", targetPeerId);
        this.zone.run(() => resolve());
      });

      conn.on("error", err => {
        console.error("Connection error:", err);
        reject(err);
      });
      
      conn.on("data", msg => {
        console.log("📥 RECEIVED via connect:", msg);
        this.safeEmit(msg);
      });

      conn.on("close", () => {
        console.log("Connection closed");
      });
    });
  }

  sendMessage(text: string) {
    if (!this.connection) {
      console.error("No connection available");
      return;
    }
    
    if (this.connection.open) {
      this.connection.send({
        type: "text",
        message: text,
        time: Date.now()
      });
    } else {
      console.warn("Connection not open yet, waiting...");
      this.connection.on('open', () => {
        this.connection?.send({
          type: "text",
          message: text,
          time: Date.now()
        });
      });
    }
  }
}
