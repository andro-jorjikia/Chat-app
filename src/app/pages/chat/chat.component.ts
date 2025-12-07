import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { PeerService } from '../../services/peer.service';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy {

  messages: any[] = [];
  text = "";
  private subscription?: Subscription;

  constructor(
    private peer: PeerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.subscription = this.peer.onMessage$.subscribe(msg => {
      if (!msg) return;

      this.messages = [...this.messages, {
        from: "remote",
        text: msg.message,
        time: msg.time
      }];
      
      // Force change detection
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  send() {
    if (!this.text.trim()) return;

    this.peer.sendMessage(this.text);

    this.messages = [...this.messages, {
      from: "me",
      text: this.text,
      time: Date.now()
    }];

    this.text = "";
    this.cdr.detectChanges();
  }
}
