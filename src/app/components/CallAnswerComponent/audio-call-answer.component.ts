import { Component, ElementRef, OnDestroy, AfterViewInit, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PeerService } from '../../services/peer.service';

@Component({
  selector: 'app-audio-call-answer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audio-call-answer.html',
  styleUrls: ['./audio-call-answer.scss']
})
export class AudioCallAnswerComponent implements AfterViewInit, OnDestroy {
  pendingCallSub?: Subscription;
  remoteStreamSub?: Subscription;
  pendingCall: any = null;
  pendingKind: 'audio' | 'video' | null = null;

  // UI refs
  @ViewChild('remoteAudio') remoteAudioRef!: ElementRef<HTMLAudioElement>;
  @ViewChild('acceptBtn') acceptBtnRef!: ElementRef<HTMLButtonElement>;

  // WebAudio for ringtone
  private audioCtx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  constructor(public peer: PeerService, private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    // Subscribe to pending call
    this.pendingCallSub = this.peer.pendingCall$.subscribe((call) => {
      this.ngZone.run(() => {
        this.pendingCall = call;
        // play ringtone when a pending call appears
        console.log('[AudioCallAnswerComponent] pendingCall changed:', call);
        this.cdr.detectChanges();
        if (call) {
          this.startRingtone();
          // autofocus accept button after view updates
          setTimeout(() => this.acceptBtnRef?.nativeElement?.focus(), 50);
        } else {
          this.stopRingtone();
        }
      });
    });

    // Subscribe to kind
    this.peer.pendingCallKind$.subscribe((k) => (this.pendingKind = k));

    // Attach remote stream to audio element when remote stream emits
    this.remoteStreamSub = this.peer.remoteStream$.subscribe((stream) => {
      const el = this.remoteAudioRef?.nativeElement;
      if (!el) return;
      try {
        el.srcObject = stream ?? null;
        if (stream) {
          el.play().catch(() => {});
        }
      } catch (e) {
        console.warn('Failed to set audio srcObject', e);
      }
    });
  }

  async accept() {
    try {
      // Stop ringtone immediately when accepting
      this.stopRingtone();
      await this.peer.acceptCall();
    } catch (err) {
      console.error('Failed to accept call', err);
    }
  }

  reject() {
    this.peer.rejectCall();
  }

  ngOnDestroy(): void {
    this.pendingCallSub?.unsubscribe();
    this.remoteStreamSub?.unsubscribe();
    this.stopRingtone();
  }

  private startRingtone() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.oscillator) return; // already playing
      this.oscillator = this.audioCtx.createOscillator();
      this.gainNode = this.audioCtx.createGain();
      this.oscillator.type = 'sine';
      this.oscillator.frequency.value = 520; // Hz
      this.gainNode.gain.value = 0.02; // low volume
      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);
      this.oscillator.start();
    } catch (e) {
      // ignore audio errors
      console.warn('Ringtone error', e);
    }
  }

  private stopRingtone() {
    try {
      this.oscillator?.stop();
    } catch (_e) {}
    try { this.oscillator?.disconnect(); } catch (_e) {}
    try { this.gainNode?.disconnect(); } catch (_e) {}
    this.oscillator = null;
    this.gainNode = null;
    // Do not close AudioContext — keep it for reuse
  }
}
