import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AudioCallAnswerComponent } from './components/CallAnswerComponent/audio-call-answer.component';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet, AudioCallAnswerComponent],
  template: `
    <router-outlet></router-outlet>
    <!-- გლობალური answer კომპონენტის UI -->
    <app-audio-call-answer></app-audio-call-answer>
  `,
  styleUrls: ['./app.scss']
})
export class App {
  protected readonly title = signal('chat-app');
}


