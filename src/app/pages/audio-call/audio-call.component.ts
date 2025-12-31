import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PeerService } from '../../services/peer.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-audio-call',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audio-call.component.html',
  styleUrls: ['./audio-call.component.scss']
})
export class AudioCallComponent implements OnInit, OnDestroy {

  @ViewChild('remoteAudio', { static: true })
  remoteAudio!: ElementRef<HTMLAudioElement>;

  isMicOn = true;
  private subs: Subscription[] = [];

  constructor(
    private peer: PeerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.peer.remoteStream$.subscribe(stream => {
        if (!stream) return;

        stream.getAudioTracks().forEach(track => {
          track.enabled = true;
        });

        const audioEl = this.remoteAudio.nativeElement;

        audioEl.srcObject = stream;

        audioEl.muted = false;
        audioEl.volume = 1;

        audioEl.play().catch(() => {
          console.warn('Autoplay blocked – user interaction required');
        });
      })
    );
  }

  toggleMic(): void {
    this.isMicOn = !this.isMicOn;

    const stream = this.peer.localStream$.value;
    if (!stream) return;

    // ✅ This part was already correct
    stream.getAudioTracks().forEach(track => {
      track.enabled = this.isMicOn;
    });
  }

  endCall(): void {
    this.peer.endCall();
    this.router.navigate(['/users']);
  }

  ngOnDestroy(): void {
    // ✅ cleanup subscriptions
    this.subs.forEach(s => s.unsubscribe());
  }
}
