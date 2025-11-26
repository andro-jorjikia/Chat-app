import { Injectable } from "@angular/core";
import Peer from 'peerjs';
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: 'root',
})

export class PeerService {
  peer!: Peer;
  peerId$ = new BehaviorSubject<string | null>(null);

  initPeer() {
    this.peer = new Peer({
      debug: 2,
    });

    this.peer.on('open', (id) => {
      console.log('My Peer ID:', id);
      this.peerId$.next(id);
    });

    this.peer.on('error', (err) => {
      console.error('PeerJS Error:', err);
    });
  }
}