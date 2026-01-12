import { Injectable, NgZone } from "@angular/core";
import { Router } from '@angular/router';
import Peer, { DataConnection, MediaConnection } from "peerjs";
import { BehaviorSubject, Observable } from "rxjs";

type CallKind = "audio" | "video";

export interface CallState {
  isActive: boolean;
  kind: CallKind | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

@Injectable({ providedIn: "root" })
export class PeerService {
  private _peer!: Peer;
  peerId$ = new BehaviorSubject<string | null>(null);
  error$ = new BehaviorSubject<string | null>(null);

  // ===== CHAT  =====
  connection: DataConnection | null = null;
  onMessage$ = new BehaviorSubject<any>(null);

  // ===== CALL =====
  private _currentCall: MediaConnection | null = null;
  callKind$ = new BehaviorSubject<CallKind | null>(null);

  // Pending incoming call (UI should show accept/reject)
  pendingCall$ = new BehaviorSubject<MediaConnection | null>(null);
  pendingCallKind$ = new BehaviorSubject<CallKind | null>(null);

  localStream$ = new BehaviorSubject<MediaStream | null>(null);
  remoteStream$ = new BehaviorSubject<MediaStream | null>(null);
  inCall$ = new BehaviorSubject<boolean>(false);
  callDeclined$ = new BehaviorSubject<boolean>(false);

  get peer(): Peer | undefined {
    return this._peer;
  }

  get isPeerInitialized(): boolean {
    return !!this._peer && !this._peer.destroyed;
  }

  get currentCall(): MediaConnection | null {
    return this._currentCall;
  }

  constructor(private zone: NgZone, private router: Router) {}

  private emitMessage(msg: any) {
    this.zone.run(() => this.onMessage$.next(msg));
  }

  private emitError(error: string) {
    this.zone.run(() => this.error$.next(error));
    console.error("[PeerService]", error);
  }

  initPeer(): Promise<string> {
    // If peer is already initialized and open, return existing peerId
    if (this._peer && !this._peer.destroyed && this._peer.open) {
      const existingId = this._peer.id;
      if (existingId) {
        return Promise.resolve(existingId);
      }
    }

    return new Promise((resolve, reject) => {
      try {
        // Destroy existing peer if any
        if (this._peer && !this._peer.destroyed) {
          this._peer.destroy();
        }

        this._peer = new Peer({ 
          debug: 2,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          }
        });

        this._peer.on("open", (id) => {
          this.zone.run(() => {
            this.peerId$.next(id);
            this.error$.next(null);
          });
          resolve(id);
        });

        this._peer.on("error", (err) => {
          const errorMsg = `Peer error: ${err.message || err.type}`;
          this.emitError(errorMsg);
          // Don't reject if peer is already open
          if (!this._peer?.open) {
            reject(err);
          }
        });

        // -------- CHAT CONNECTION --------
        this._peer.on("connection", (conn) => {
          if (this.connection?.open) {
            this.connection.close();
          }
          this.connection = conn;

          conn.on("data", (msg) => this.emitMessage(msg));
          conn.on("close", () => {
            this.connection = null;
          });
          conn.on("error", (err) => {
            this.emitError(`Connection error: ${err.message || err.type}`);
          });
        });

        // -------- INCOMING CALL --------
        // Do NOT auto-answer incoming calls. Mark them as pending so the UI
        // can prompt the user to Accept or Reject.
        this._peer.on("call", (call) => {
          const kind: CallKind = call.metadata?.kind ?? "audio";

          console.log("[PeerService] Incoming call (pending), kind:", kind, "metadata:", call.metadata);

          // If already in a call or there is already a pending call, reject
          if (this._currentCall || this.pendingCall$.value) {
            call.close();
            return;
          }

          // Store as pending - run inside Angular zone so UI updates
          this.zone.run(() => {
            this.pendingCall$.next(call);
            this.pendingCallKind$.next(kind);
          });
        });
      } catch (error: any) {
        const errorMsg = `Failed to initialize peer: ${error.message || "Unknown error"}`;
        this.emitError(errorMsg);
        reject(error);
      }
    });
  }

  // -------- CHAT --------
  connectToPeer(peerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this._peer || this._peer.destroyed) {
        reject(new Error("Peer not initialized"));
        return;
      }

      if (this.connection?.open) {
        resolve();
        return;
      }

      try {
        const conn = this._peer.connect(peerId);
        this.connection = conn;

        conn.on("open", () => {
          resolve();
        });

        conn.on("data", (msg) => this.emitMessage(msg));

        conn.on("error", (err) => {
          this.emitError(`Connection error: ${err.message || err.type}`);
          reject(err);
        });

        conn.on("close", () => {
          this.connection = null;
        });
      } catch (error: any) {
        const errorMsg = `Failed to connect: ${error.message || "Unknown error"}`;
        this.emitError(errorMsg);
        reject(error);
      }
    });
  }

  sendMessage(text: string) {
    if (!this.connection?.open) {
      this.emitError("Cannot send message: connection not open");
      return;
    }
    try {
      this.connection.send({ type: "text", message: text, time: Date.now() });
    } catch (error: any) {
      this.emitError(`Failed to send message: ${error.message || "Unknown error"}`);
    }
  }

  // -------- CALL --------
  private async getUserMedia(video: boolean): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error: any) {
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        throw new Error("Camera/microphone permission denied");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        throw new Error("No camera/microphone found");
      } else {
        throw new Error(`Failed to access media devices: ${error.message || "Unknown error"}`);
      }
    }
  }

  async startAudioCall(peerId: string): Promise<void> {
    if (!this._peer || this._peer.destroyed) {
      throw new Error("Peer not initialized");
    }
    if (this._currentCall) {
      throw new Error("Already in a call");
    }
    await this.startCall(peerId, "audio");
  }

  async startVideoCall(peerId: string): Promise<void> {
    if (!this._peer || this._peer.destroyed) {
      throw new Error("Peer not initialized");
    }
    if (this._currentCall) {
      throw new Error("Already in a call");
    }
    await this.startCall(peerId, "video");
  }

  private async startCall(peerId: string, kind: CallKind): Promise<void> {
    try {
      this.callKind$.next(kind);
      this.inCall$.next(true);

      const stream = await this.getUserMedia(kind === "video");
      this.localStream$.next(stream);

      if (!this._peer || this._peer.destroyed) {
        throw new Error("Peer not initialized");
      }
      const call = this._peer.call(peerId, stream, { metadata: { kind } });
      this._currentCall = call;
      
      console.log("[PeerService] Outgoing call started, kind:", kind, "metadata:", { kind });

      call.on("stream", (remote) => {
        this.zone.run(() => this.remoteStream$.next(remote));
      });

      // Handle call close (callee rejected or ended)
      call.on("close", () => {
        console.log('[PeerService] Outgoing call closed (callee may have rejected or ended)');
        this.callDeclined$.next(true);
        this.cleanup();
        this.router.navigate(['/users']);
      });

      call.on("error", (err) => {
        this.emitError(`Call error: ${err.message || err.type}`);
        this.cleanup();
      });
    } catch (error: any) {
      this.emitError(`Failed to start call: ${error.message || "Unknown error"}`);
      this.cleanup();
      throw error;
    }
  }

  async acceptCall(): Promise<void> {
    const call = this.pendingCall$.value;
    const kind = this.pendingCallKind$.value ?? "audio";
    if (!call) {
      throw new Error("No pending call to accept");
    }

    try {
      const needsVideo = kind === "video";
      const stream = await this.getUserMedia(needsVideo);
      this.localStream$.next(stream);

      // clear pending state before answering
      this.pendingCall$.next(null);
      this.pendingCallKind$.next(null);

      // answer and become current call
      call.answer(stream);
      this._currentCall = call;
      this.callKind$.next(kind);
      this.inCall$.next(true);

      call.on("stream", (remote) => {
        this.zone.run(() => this.remoteStream$.next(remote));
      });

      call.on("close", () => {
        this.cleanup();
      });

      call.on("error", (err) => {
        this.emitError(`Call error: ${err.message || err.type}`);
        this.cleanup();
      });
    } catch (error: any) {
      this.emitError(`Failed to accept call: ${error.message || "Unknown error"}`);
      try {
        call.close();
      } catch (_e) {
        // ignore
      }
      this.pendingCall$.next(null);
      this.pendingCallKind$.next(null);
      throw error;
    }
  }

  /**
   * Reject a pending incoming call.
   */
  rejectCall(): void {
    const call = this.pendingCall$.value;
    if (!call) return;
    try {
      call.close();
    } catch (_e) {
      // ignore
    }
    this.pendingCall$.next(null);
    this.pendingCallKind$.next(null);
  }

  async upgradeToVideo(): Promise<void> {
    if (!this._currentCall) {
      throw new Error("No active call to upgrade");
    }

    // Wait for peerConnection to be available (with timeout)
    let pc = this._currentCall.peerConnection;
    if (!pc) {
      // Wait up to 2 seconds for peerConnection
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        pc = this._currentCall?.peerConnection;
        if (pc) break;
      }
    }

    if (!pc) {
      throw new Error("PeerConnection not available - call may not be fully established");
    }

    try {
      const oldStream = this.localStream$.value;
      if (!oldStream) {
        throw new Error("No local stream available");
      }

      // Get new stream with video
      const newStream = await this.getUserMedia(true);
      const videoTrack = newStream.getVideoTracks()[0];
      
      if (!videoTrack) {
        throw new Error("Failed to get video track");
      }

      // Stop old video tracks if any (but keep audio)
      oldStream.getVideoTracks().forEach(track => track.stop());

      // Add new video track to existing stream (preserving audio)
      oldStream.addTrack(videoTrack);
      this.localStream$.next(oldStream);

      // Stop the new stream's audio track since we're using the old one
      newStream.getAudioTracks().forEach(track => track.stop());

      this.callKind$.next("video");

      const senders = pc.getSenders();
      const sender = senders.find(s => s.track?.kind === "video");

      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      } else if (videoTrack) {
        // Add video track if sender doesn't exist
        try {
          pc.addTrack(videoTrack, oldStream);
        } catch (addTrackError: any) {
          // If addTrack fails, try using replaceTrack on first sender
          if (senders.length > 0) {
            const firstSender = senders[0];
            if (firstSender.track) {
              await firstSender.replaceTrack(videoTrack);
            } else {
              throw new Error("No suitable sender found for video track");
            }
          } else {
            throw new Error("No senders available");
          }
        }
      }
    } catch (error: any) {
      this.emitError(`Failed to upgrade to video: ${error.message || "Unknown error"}`);
      throw error;
    }
  }

  downgradeToAudio(): void {
    if (!this._currentCall) {
      return;
    }

    const pc = this._currentCall.peerConnection;
    if (!pc) {
      console.warn("PeerConnection not available for downgrade");
      return;
    }

    this.callKind$.next("audio");

    // Stop and remove video tracks
    const localStream = this.localStream$.value;
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.stop();
        localStream.removeTrack(track);
      });
    }

    // Remove video senders from peer connection
    try {
      pc.getSenders()
        .filter(s => s.track?.kind === "video")
        .forEach(s => {
          pc.removeTrack(s);
        });
    } catch (error: any) {
      console.warn("Failed to remove video tracks:", error);
    }
  }

  toggleMicrophone(): boolean {
    const stream = this.localStream$.value;
    if (!stream) {
      return false;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      return false;
    }

    const isEnabled = audioTracks[0].enabled;
    audioTracks.forEach(track => {
      track.enabled = !isEnabled;
    });

    return !isEnabled;
  }

  toggleCamera(): boolean {
    const stream = this.localStream$.value;
    if (!stream) {
      return false;
    }

    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) {
      return false;
    }

    const isEnabled = videoTracks[0].enabled;
    videoTracks.forEach(track => {
      track.enabled = !isEnabled;
    });

    return !isEnabled;
  }

  endCall(): void {
    if (this._currentCall) {
      this._currentCall.close();
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.callDeclined$.next(false);
    // Stop all local media tracks
    const localStream = this.localStream$.value;
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
      });
    }

    // Clear all state
    this.zone.run(() => {
      this.localStream$.next(null);
      this.remoteStream$.next(null);
      this.inCall$.next(false);
      this.callKind$.next(null);
    });

    this._currentCall = null;
  }

  // Cleanup method - call this when app is closing
  destroy(): void {
    this.endCall();
    if (this._peer && !this._peer.destroyed) {
      this._peer.destroy();
    }
  }
}
