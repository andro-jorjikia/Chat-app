import { Injectable, NgZone } from "@angular/core";
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { BehaviorSubject } from "rxjs";

@Injectable({ providedIn: 'root' })
export class PeerService {

  peer!: Peer;
  peerId$ = new BehaviorSubject<string | null>(null);

  // CHAT connection
  connection: DataConnection | null = null;
  onMessage$ = new BehaviorSubject<any>(null);

  // VIDEO CALL
  currentCall: MediaConnection | null = null;
  localStream$ = new BehaviorSubject<MediaStream | null>(null);
  remoteStream$ = new BehaviorSubject<MediaStream | null>(null);
  inCall$ = new BehaviorSubject<boolean>(false);

  constructor(private zone: NgZone) {}

  private safeEmit(msg: any) {
    this.zone.run(() => this.onMessage$.next(msg));
  }

  initPeer() {
    this.peer = new Peer({ debug: 2 });

    // My own peer ID
    this.peer.on('open', id => {
      this.zone.run(() => this.peerId$.next(id));
    });

    // Incoming DATA connection (chat)
    this.peer.on("connection", conn => {
      console.log("Incoming connection from", conn.peer);

      if (this.connection && this.connection.peer === conn.peer) {
        console.log("Replacing existing connection to", conn.peer);
        this.connection.close();
      }

      this.connection = conn;

      conn.on("open", () => console.log("Incoming DataConnection open"));

      conn.on("data", msg => {
        console.log("📥 TEXT RECEIVE:", msg);
        this.safeEmit(msg);
      });

      conn.on("close", () => {
        if (this.connection === conn) this.connection = null;
      });
    });

    // Incoming MEDIA call (video/audio)
    this.peer.on("call", async (call: MediaConnection) => {
      console.log(" Incoming call", call.peer);
      this.currentCall = call;

      try {
        // Always get both video and audio for now - UI will control what's displayed
        const localStream = await this.getUserMedia(true, true);
        this.localStream$.next(localStream);
        this.inCall$.next(true);

        call.answer(localStream);

        call.on("stream", remote => {
          console.log(" Remote stream received");
          this.zone.run(() => this.remoteStream$.next(remote));
        });

        call.on("close", () => this.cleanupCall());
      } catch (err) {
        console.error("Error answering call:", err);
      }
    });

    this.peer.on("error", err => console.error("PeerJS Error:", err));
  }

  // Connect to peer (chat)
  connectToPeer(targetPeerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log("Connecting to", targetPeerId);

      if (this.connection && this.connection.peer === targetPeerId && this.connection.open) {
        console.log("Already connected");
        resolve();
        return;
      }

      const conn = this.peer.connect(targetPeerId, { reliable: true });
      this.connection = conn;

      conn.on("open", () => {
        console.log("Connection OPEN");
        resolve();
      });

      conn.on("data", msg => {
        console.log("📥 TEXT via connect:", msg);
        this.safeEmit(msg);
      });

      conn.on("error", err => reject(err));
    });
  }

  sendMessage(text: string) {
    if (!this.connection) {
      console.error("No connection available");
      return;
    }

    this.connection.send({
      type: "text",
      message: text,
      time: Date.now()
    });
  }

  // --- VIDEO CALL LOGIC ---

  private async getUserMedia(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
    return await navigator.mediaDevices.getUserMedia({
      video: video,
      audio: audio
    });
  }

  async startCall(targetPeerId: string, withVideo: boolean = false) {
    console.log("Calling", targetPeerId, withVideo ? "with video" : "audio only");

    try {
      const localStream = await this.getUserMedia(withVideo, true);
      this.localStream$.next(localStream);
      this.inCall$.next(true);

      const call = this.peer.call(targetPeerId, localStream);
      this.currentCall = call;

      call.on("stream", remoteStream => {
        console.log("Remote stream received");
        this.zone.run(() => this.remoteStream$.next(remoteStream));
      });

      call.on("close", () => this.cleanupCall());
      call.on("error", () => this.cleanupCall());

    } catch (err) {
      console.error("startCall error:", err);
      this.cleanupCall();
    }
  }

  async startVideoCall(targetPeerId: string) {
    return this.startCall(targetPeerId, true);
  }

  async startAudioCall(targetPeerId: string) {
    return this.startCall(targetPeerId, false);
  }

  endCall() {
    if (this.currentCall) {
      this.currentCall.close();
    }
    this.cleanupCall();
  }

  private cleanupCall() {
    console.log("Ending call");

    // Stop local tracks
    const stream = this.localStream$.value;
    if (stream) stream.getTracks().forEach(t => t.stop());

    this.localStream$.next(null);
    this.remoteStream$.next(null);
    this.inCall$.next(false);
    this.currentCall = null;
  }
}



