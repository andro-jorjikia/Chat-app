import { Component, OnInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PeerService } from '../../services/peer.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-call',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './call.component.html',
  styleUrls: ['./call.component.scss']
})
export class CallComponent implements OnInit, OnDestroy {

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  // UI state
  isCameraOn = true;
  isMicOn = true;
  callDuration = '00:00';
  private callStartTime?: Date;
  private timerInterval?: number;

  constructor(private peer: PeerService, private router: Router) {}

  ngOnInit(): void {
    this.callStartTime = new Date();
    this.startCallTimer();

    this.peer.localStream$.subscribe(stream => {
      if (stream && this.localVideo) {
        this.localVideo.nativeElement.srcObject = stream;
      }
    });

    this.peer.remoteStream$.subscribe(stream => {
      if (stream && this.remoteVideo) {
        this.remoteVideo.nativeElement.srcObject = stream;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  toggleCamera() {
    this.isCameraOn = !this.isCameraOn;

    const localStream = this.peer.localStream$.value;
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = this.isCameraOn;
      });
    }
  }

  toggleMic() {
    this.isMicOn = !this.isMicOn;

    const localStream = this.peer.localStream$.value;
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = this.isMicOn;
      });
    }
  }

  end() {
    this.peer.endCall();
    this.router.navigate(['/users']);
  }

  private startCallTimer(): void {
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
}
