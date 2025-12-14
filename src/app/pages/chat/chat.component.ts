import { Component, OnInit, ChangeDetectorRef, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
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
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {

  messages: any[] = [];
  text = "";
  private subscription?: Subscription;

  private shouldScrollToBottom = false;

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

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

      this.shouldScrollToBottom = true;
      this.cdr.detectChanges();
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  trackByMessage(index: number, message: any): any {
    return message.time + message.from + message.text;
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
    this.shouldScrollToBottom = true;
    this.cdr.detectChanges();
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
}