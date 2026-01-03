import { Component, OnInit, ElementRef, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PeerService } from '../../services/peer.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-call',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './call.component.html',
  styleUrls: ['./call.component.scss']
})
export class CallComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  // UI state
  isCameraOn = true;
  isMicOn = true;
  callDuration = '00:00';
  isConnected = false;

  private subscriptions = new Subscription();
  private callStartTime?: Date;
  private timerInterval?: number;

  constructor(private peer: PeerService, private router: Router) {}

  ngOnInit(): void {
    // Subscribe to call state
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

    // Subscribe to local stream
    this.subscriptions.add(
      this.peer.localStream$.subscribe(stream => {
        if (stream) {
          // Use setTimeout to ensure ViewChild is ready
          setTimeout(() => {
            if (this.localVideo?.nativeElement) {
              const video = this.localVideo.nativeElement;
              video.srcObject = stream;
              video.play().catch(err => {
                console.error('Failed to play local video:', err);
              });
              // Update camera state based on video tracks
              const videoTracks = stream.getVideoTracks();
              if (videoTracks.length > 0) {
                this.isCameraOn = videoTracks[0].enabled;
              } else {
                this.isCameraOn = false;
              }
            }
          }, 100);
        } else {
          // Clear stream when disconnected
          if (this.localVideo?.nativeElement) {
            this.localVideo.nativeElement.srcObject = null;
          }
        }
      })
    );

    // Subscribe to remote stream
    this.subscriptions.add(
      this.peer.remoteStream$.subscribe(stream => {
        if (stream) {
          // Use setTimeout to ensure ViewChild is ready
          setTimeout(() => {
            if (this.remoteVideo?.nativeElement) {
              const video = this.remoteVideo.nativeElement;
              video.srcObject = stream;
              video.play().catch(err => {
                console.error('Failed to play remote video:', err);
              });
            }
          }, 100);
        } else {
          // Clear stream when disconnected
          if (this.remoteVideo?.nativeElement) {
            this.remoteVideo.nativeElement.srcObject = null;
          }
        }
      })
    );

    // Subscribe to errors
    this.subscriptions.add(
      this.peer.error$.subscribe(error => {
        if (error) {
          console.error('PeerService error:', error);
          // You can add toast notification here if needed
        }
      })
    );
  }

  ngAfterViewInit(): void {
    // Ensure video elements are set up properly
    if (this.localVideo?.nativeElement) {
      const video = this.localVideo.nativeElement;
      video.onloadedmetadata = () => {
        video.play().catch(err => {
          console.error('Failed to play local video:', err);
        });
      };
    }

    if (this.remoteVideo?.nativeElement) {
      const video = this.remoteVideo.nativeElement;
      video.onloadedmetadata = () => {
        video.play().catch(err => {
          console.error('Failed to play remote video:', err);
        });
      };
    }
  }

  ngOnDestroy(): void {
    this.stopCallTimer();
    this.subscriptions.unsubscribe();
  }

  toggleCamera(): void {
    this.isCameraOn = this.peer.toggleCamera();
  }

  toggleMic(): void {
    this.isMicOn = this.peer.toggleMicrophone();
  }

  end(): void {
    this.peer.endCall();
    this.router.navigate(['/users']);
  }

  private startCallTimer(): void {
    this.stopCallTimer(); // Clear any existing timer
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
