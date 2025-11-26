import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PeerService } from '../../services/peer.service';
import { SignalingService } from '../../services/signaling.service';

@Component({ 
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})

export class LoginComponent {
  username = '';

  constructor(
    private peer: PeerService,
    private signaling: SignalingService,
    private router: Router
  ) {}
    login() {
          if (!this.username.trim()) return;

        // PeerJS peer init
          this.peer.initPeer();

        // როცა peerId გახსდება → რეგისტრაცია WebSocket სერვერზე
        this.peer.peerId$.subscribe(peerId => { 
            if (peerId) {
                this.signaling.connect(this.username, peerId);
                this.router.navigate(['/users']);
            } 
        });
    }
}