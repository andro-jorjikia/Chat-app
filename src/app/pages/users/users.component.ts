import { Component, OnDestroy, OnInit } from '@angular/core';
import { SignalingService } from '../../services/signaling.service';
import { PeerService } from '../../services/peer.service';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { filter } from 'rxjs/operators';

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

    // თუ ზარი დაიწყება (incoming/outgoing), ავტომატურად გადავა შესაბამის გვერდზე
    // Combine inCall$ and callKind$ to ensure both are available when navigating
    this.callSub = combineLatest([
      this.peer.inCall$,
      this.peer.callKind$
    ]).pipe(
      filter(([inCall, callKind]) => inCall && callKind !== null)
    ).subscribe(([inCall, callKind]) => {
      if (inCall && callKind) {
        console.log("[UsersComponent] Call started, navigating to:", callKind);
        if (callKind === 'audio') {
          this.router.navigate(['/audio-call']);
        } else if (callKind === 'video') {
          this.router.navigate(['/call']);
        }
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

  async callAudio(peerId: string) {
    try {
      await this.peer.startAudioCall(peerId);
      this.router.navigate(['/audio-call']);
    } catch (error) {
      console.error("Failed to start audio call:", error);
      // You can show error message to user here
    }
  }

  async callVideo(peerId: string) {
    console.log("Video call clicked:", peerId);
    try {
      await this.peer.startVideoCall(peerId);
      // inCall$ subscription ავტომატურად გადაგვიყვანს /call-ზე
    } catch (error) {
      console.error("Failed to start video call:", error);
      // You can show error message to user here
    }
  }

  trackByUserId(index: number, user: any): string {
    return user.peerId;
  }

  refreshUsers() {
    // Force refresh of users observable
    this.users$ = this.signaling.users$;
  }
}
