import { Injectable, NgZone } from "@angular/core";
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { BehaviorSubject } from "rxjs";

@Injectable({ providedIn: 'root' })
export class PeerService {

  peer!: Peer;
  peerId$ = new BehaviorSubject<string | null>(null);

  // CHAT
  connection: DataConnection | null = null;
  onMessage$ = new BehaviorSubject<any>(null);

  // CALL
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

    this.peer.on('open', id => {
      this.zone.run(() => this.peerId$.next(id));
    });

    // CHAT
    this.peer.on("connection", conn => {
      this.connection = conn;

      conn.on("data", msg => this.safeEmit(msg));
      conn.on("close", () => {
        if (this.connection === conn) this.connection = null;
      });
    });

    // 📞 INCOMING CALL
    this.peer.on("call", async (call: MediaConnection) => {
      console.log("📞 Incoming call:", call.metadata);

      this.currentCall = call;

      const isVideoCall = call.metadata?.type === 'video';

      try {
        // ✅ audio call = mic only | video call = camera + mic
        const localStream = await this.getUserMedia(isVideoCall, true);

        this.localStream$.next(localStream);
        this.inCall$.next(true);

        call.answer(localStream);

        call.on("stream", remote => {
          // ✅ force audio enabled
          remote.getAudioTracks().forEach(t => t.enabled = true);

          this.zone.run(() => this.remoteStream$.next(remote));
        });

        call.on("close", () => this.cleanupCall());
      } catch (err) {
        console.error("Error answering call:", err);
      }
    });

    this.peer.on("error", err => console.error("PeerJS Error:", err));
  }

  // CHAT
  connectToPeer(targetPeerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const conn = this.peer.connect(targetPeerId, { reliable: true });
      this.connection = conn;

      conn.on("open", resolve);
      conn.on("data", msg => this.safeEmit(msg));
      conn.on("error", err => reject(err));
    });
  }

  sendMessage(text: string) {
    if (!this.connection) return;

    this.connection.send({
      type: "text",
      message: text,
      time: Date.now()
    });
  }

  // 🎥 / 🎧 CALLS
  private async getUserMedia(video: boolean, audio: boolean): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({ video, audio });
  }

  async startCall(targetPeerId: string, withVideo: boolean) {
    console.log("📞 Calling", targetPeerId, withVideo ? 'VIDEO' : 'AUDIO');

    const localStream = await this.getUserMedia(withVideo, true);
    this.localStream$.next(localStream);
    this.inCall$.next(true);

    const call = this.peer.call(targetPeerId, localStream, {
      metadata: {
        type: withVideo ? 'video' : 'audio'
      }
    });

    this.currentCall = call;

    call.on("stream", remote => {
      remote.getAudioTracks().forEach(t => t.enabled = true);
      this.zone.run(() => this.remoteStream$.next(remote));
    });

    call.on("close", () => this.cleanupCall());
    call.on("error", () => this.cleanupCall());
  }

  startVideoCall(peerId: string) {
    return this.startCall(peerId, true);
  }

  startAudioCall(peerId: string) {
    return this.startCall(peerId, false);
  }

  endCall() {
    this.currentCall?.close();
    this.cleanupCall();
  }

  private cleanupCall() {
    const stream = this.localStream$.value;
    stream?.getTracks().forEach(t => t.stop());

    this.localStream$.next(null);
    this.remoteStream$.next(null);
    this.inCall$.next(false);
    this.currentCall = null;
  }
}
