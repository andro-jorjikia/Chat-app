import { Component, OnInit } from '@angular/core';
import { SignalingService } from '../../services/signaling.service';
import { PeerService } from '../../services/peer.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule],   // <-- აქ !
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})

export class UsersComponent implements OnInit {

  users$!: Observable<any[]>;

  constructor(
    private signaling: SignalingService,
    private peer: PeerService
  ) {}

  ngOnInit(): void {
    this.users$ = this.signaling.users$;
  }

  startChat(peerId: string) {
    console.log("CHAT →", peerId);
  }

  callAudio(peerId: string) {
    console.log("AUDIO CALL →", peerId);
    // Since PeerService does not have callAudio and callVideo, 
    // you need to implement the actual WebRTC logic or call a method that exists.
    // For now, we can log a message to avoid runtime errors.
    alert("Audio call requested to " + peerId + ". Feature not implemented.");
  }

  callVideo(peerId: string) {
    console.log("VIDEO CALL →", peerId);
    alert("Video call requested to " + peerId + ". Feature not implemented.");
  }
}
