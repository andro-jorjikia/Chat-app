import { Component, OnInit } from '@angular/core';
import { SignalingService } from '../../services/signaling.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {

  users$!: Observable<any[]>;   // აქ ინიციალიზაცია არ ხდება

  constructor(private signaling: SignalingService) {}

  ngOnInit(): void {
    // აქ ইতიმედია signaling შეიქმნა და უსაფრთხოა
    this.users$ = this.signaling.users$;
    
    // Debug output
    this.users$.subscribe(u => console.log("USERS:", u));
  }

  // ← აქ დაფიქსირდა შენი error: ეს ფუნქცია უნდა არსებობდეს
  connectToUser(peerId: string) {
    console.log("CONNECTING TO:", peerId);

    // აქ შემდეგ დავუმატებთ offer/answer peer-to-peer logic-ს
  }
}