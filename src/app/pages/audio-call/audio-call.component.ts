import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
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
export class AudioCallComponent implements OnInit, AfterViewInit, OnDestroy {
  callDeclined = false;
  private callDeclinedSub?: Subscription;
  @ViewChild("remoteAudio") remoteAudio!: ElementRef<HTMLAudioElement>;

  // UI State
  isMicOn = true;
  callDuration = '00:00';
  isConnected = false;

  private subscriptions = new Subscription();
  private callStartTime?: Date;
  private timerInterval?: number;

  constructor(
    public peer: PeerService,
    private router: Router
  ) {}

  ngOnInit() {
    this.callDeclinedSub = this.peer.callDeclined$.subscribe(declined => {
      if (declined) {
        this.callDeclined = true;
        setTimeout(() => {
          this.callDeclined = false;
          this.peer.resetCallDeclinedState();
          this.router.navigate(["/users"]);
        }, 1800);
      }
    });
    this.subscriptions.add(
      this.peer.inCall$.subscribe(inCall => {
        this.isConnected = inCall;
        if (inCall && !this.callStartTime) {
          this.callStartTime = new Date();
          this.startCallTimer();
        } else if (!inCall) {
          this.stopCallTimer();
        }
      })
    );

    this.subscriptions.add(
      this.peer.remoteStream$.subscribe(stream => {
        if (stream) {
          setTimeout(() => {
            if (this.remoteAudio?.nativeElement) {
              const audio = this.remoteAudio.nativeElement;
              audio.srcObject = stream;
              audio.play().catch(err => {
                console.error('Failed to play remote audio:', err);
              });
            }
          }, 100);
        } else {
          if (this.remoteAudio?.nativeElement) {
            this.remoteAudio.nativeElement.srcObject = null;
          }
        }
      })
    );

    this.subscriptions.add(
      this.peer.error$.subscribe(error => {
        if (error) {
          console.error('PeerService error:', error);
        }
      })
    );
  }

  ngAfterViewInit() {
    if (this.remoteAudio?.nativeElement) {
      const audio = this.remoteAudio.nativeElement;
      audio.onloadedmetadata = () => {
        audio.play().catch(err => {
          console.error('Failed to play audio:', err);
        });
      };
    }
  }

  ngOnDestroy() {
  this.callDeclinedSub?.unsubscribe();
    this.stopCallTimer();
    this.subscriptions.unsubscribe();
  }

  toggleMute() {
    this.isMicOn = this.peer.toggleMicrophone();
  }

  enableVideo() {
    if (!this.peer.currentCall) {
      console.error('No active call to upgrade');
      return;
    }

    this.peer.upgradeToVideo()
      .then(() => {
        this.router.navigate(["/call"]);
      })
      .catch(error => {
        console.error('Failed to upgrade to video:', error);
      });
  }

  end() {
    this.peer.endCall();
    this.router.navigate(["/users"]);
  }

  private startCallTimer(): void {
    this.stopCallTimer(); 
    this.timerInterval = window.setInterval(() => {
      if (this.callStartTime) {
        const now = new Date();
        const diff = now.getTime() - this.callStartTime.getTime();
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        this.callDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }

  private stopCallTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
    this.callDuration = '00:00';
    this.callStartTime = undefined;
  }
}
