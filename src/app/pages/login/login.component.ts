import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PeerService } from '../../services/peer.service';
import { SignalingService } from '../../services/signaling.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { filter, take } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username = '';
  errorMessage = '';
  loading = false;

  constructor(
    private peer: PeerService,
    private signaling: SignalingService,
    private router: Router
  ) {}

  async login(): Promise<void> {
    if (!this.username.trim()) return;

    this.errorMessage = '';
    this.loading = true;

    try {
      await this.peer.initPeer();

      this.peer.peerId$.pipe(
        filter((id): id is string => !!id),
        take(1)
      ).subscribe(peerId => {
        this.signaling.connect(this.username.trim(), peerId);
        this.router.navigate(['/users']);
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to connect. Please try again.';
      this.errorMessage = msg;
      this.loading = false;
    }
  }
}
