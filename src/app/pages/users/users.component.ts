import { Component, OnDestroy, OnInit } from '@angular/core';
import { SignalingService } from '../../services/signaling.service';
import { PeerService } from '../../services/peer.service';
import { Observable, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit, OnDestroy {

  users$!: Observable<any[]>;
  private callSub?: Subscription;

  constructor(
    private signaling: SignalingService,
    private peer: PeerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.users$ = this.signaling.users$;

    // თუ ვიდეო ზარი დაიწყება (incoming/outgoing), ავტომატურად გადავა call გვერდზე
    this.callSub = this.peer.inCall$.subscribe(inCall => {
      if (inCall) {
        this.router.navigate(['/call']);
      }
    });
  }

  ngOnDestroy(): void {
    this.callSub?.unsubscribe();
  }

  startChat(peerId: string) {
    console.log("CHAT →", peerId);

    this.peer.connectToPeer(peerId)
      .then(() => {
        console.log("Connected — navigating to chat");
        this.router.navigate(['/chat']);
      })
      .catch(err => {
        console.error("Connection failed:", err);
      });
  }

  callAudio(peerId: string) {
    this.peer.startAudioCall(peerId);
    this.router.navigate(['/audio-call']);
  }

  callVideo(peerId: string) {
    console.log("Video call clicked:", peerId);
    this.peer.startVideoCall(peerId);
    // inCall$ subscription ავტომატურად გადაგვიყვანს /call-ზე
  }

  trackByUserId(index: number, user: any): string {
    return user.peerId;
  }

  refreshUsers() {
    // Force refresh of users observable
    this.users$ = this.signaling.users$;
  }
}
