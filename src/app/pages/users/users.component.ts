import { Component, OnInit } from '@angular/core';
import { SignalingService } from '../../services/signaling.service';
import { PeerService } from '../../services/peer.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {

  users$!: Observable<any[]>;

  constructor(
    private signaling: SignalingService,
    private peer: PeerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.users$ = this.signaling.users$;
  }

  startChat(peerId: string) {
    console.log("CHAT →", peerId);

    this.peer.connectToPeer(peerId)
      .then(() => {
        console.log("🎉  Connected — navigating to chat");
        this.router.navigate(['/chat']);
      })
      .catch(err => {
        console.error("Connection failed:", err);
      });
  }

  callAudio(peerId: string) {
    alert("Audio feature coming soon!");
  }

  callVideo(peerId: string) {
    alert("Video feature coming soon!");
  }
}
