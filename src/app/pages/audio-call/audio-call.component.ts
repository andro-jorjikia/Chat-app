import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PeerService } from '../../services/peer.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-audio-call',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audio-call.component.html',
  styleUrls: ['./audio-call.component.scss']
})

export class AudioCallComponent implements OnInit{

    @ViewChild('remoteAudio', { static: true })
    remoteAudio!: ElementRef<HTMLAudioElement>;

    @ViewChild('remoteVideo', { static: false })
    remoteVideo!: ElementRef<HTMLVideoElement>;

    @ViewChild('localVideo', { static: false })
    localVideo!: ElementRef<HTMLVideoElement>;

    // UI state
    isCameraOn = false;
    isMicOn = true;
    showLocalVideo = false;
    showRemoteVideo = false;

    constructor(
        public peer: PeerService,
        private router: Router
    ) {} 

    ngOnInit(): void {
        // Handle remote stream
        this.peer.remoteStream$.subscribe(stream => {
            if (stream) {
                const hasVideo = stream.getVideoTracks().length > 0;
                this.showRemoteVideo = hasVideo;

                if (hasVideo && this.remoteVideo?.nativeElement) {
                    this.remoteVideo.nativeElement.srcObject = stream;
                } else if (this.remoteAudio?.nativeElement) {
                    this.remoteAudio.nativeElement.srcObject = stream;
                    this.remoteAudio.nativeElement.play();
                }
            }
        });

        // Handle local stream
        this.peer.localStream$.subscribe(stream => {
            if (stream && this.localVideo?.nativeElement) {
                this.localVideo.nativeElement.srcObject = stream;
            }
        });
    }

    toggleCamera() {
        this.isCameraOn = !this.isCameraOn;
        this.showLocalVideo = this.isCameraOn;

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
}