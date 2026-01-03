# Chat App - დეტალური დოკუმენტაცია

## 📋 შინაარსი

1. [ზოგადი ინფორმაცია](#ზოგადი-ინფორმაცია)
2. [ტექნოლოგიები](#ტექნოლოგიები)
3. [აპლიკაციის არქიტექტურა](#აპლიკაციის-არქიტექტურა)
4. [კომპონენტები](#კომპონენტები)
5. [Services](#services)
6. [User Flow](#user-flow)
7. [როგორ მუშაობს](#როგორ-მუშაობს)
8. [როგორ გავუშვა](#როგორ-გავუშვა)

---

## 🎯 ზოგადი ინფორმაცია

ეს არის **Real-time Chat & Video/Audio Call Application** რომელიც იყენებს:
- **PeerJS** - WebRTC-სთვის peer-to-peer კავშირებისთვის
- **WebSocket** - Signaling server-თან კომუნიკაციისთვის
- **Angular 21** - Frontend framework

### მთავარი ფუნქციები:
- ✅ Real-time chat messaging
- ✅ Audio calls (აუდიო ზარები)
- ✅ Video calls (ვიდეო ზარები)
- ✅ User discovery (იუზერების ძიება)
- ✅ Online status (ონლაინ სტატუსი)

---

## 🛠 ტექნოლოგიები

### Frontend:
- **Angular 21** - Main framework
- **TypeScript** - Programming language
- **RxJS** - Reactive programming (Observables)
- **SCSS** - Styling

### Libraries:
- **PeerJS** (`peerjs@1.5.5`) - WebRTC wrapper
- **WebSocket** - Real-time communication

### Backend/Signaling:
- **WebSocket Server** - `https://angular-chat-server-1-itg3.onrender.com`
  - User registration
  - User list management
  - Signaling for WebRTC

---

## 🏗 აპლიკაციის არქიტექტურა

```
src/app/
├── pages/                    # UI Components
│   ├── login/               # Login page
│   ├── users/               # Users list page
│   ├── chat/                # Chat page
│   ├── audio-call/          # Audio call page
│   └── call/                # Video call page
├── services/                 # Business Logic
│   ├── peer.service.ts      # PeerJS & WebRTC logic
│   └── signaling.service.ts # WebSocket signaling
├── app.routes.ts            # Routing configuration
└── app.config.ts            # App configuration
```

### Routing Structure:
```
/ → redirects to /login
/login → LoginComponent
/users → UsersComponent
/chat → ChatComponent (lazy loaded)
/call → CallComponent (lazy loaded)
/audio-call → AudioCallComponent (lazy loaded)
```

---

## 📱 კომპონენტები

### 1. **LoginComponent** (`pages/login/`)

**რას აკეთებს:**
- იუზერი შედის username-ით
- ინიციალიზებს PeerJS peer connection
- რეგისტრირდება WebSocket signaling server-ზე
- გადაყავს `/users` გვერდზე

**როგორ მუშაობს:**
```typescript
login() {
  // 1. PeerJS peer-ის ინიციალიზაცია
  await this.peer.initPeer();
  
  // 2. peerId-ს მიღების მოლოდინი
  this.peer.peerId$.subscribe(peerId => {
    if (peerId) {
      // 3. WebSocket-ზე რეგისტრაცია
      this.signaling.connect(username, peerId);
      // 4. Navigation
      this.router.navigate(['/users']);
    }
  });
}
```

**Key Features:**
- Username input
- Peer initialization
- Auto-navigation after login

---

### 2. **UsersComponent** (`pages/users/`)

**რას აკეთებს:**
- აჩვენებს ყველა online იუზერს
- საშუალებას აძლევს:
  - Chat-ის დაწყებას
  - Audio call-ის დაწყებას
  - Video call-ის დაწყებას

**როგორ მუშაობს:**
```typescript
// Users list subscription
this.users$ = this.signaling.users$;

// Auto-navigation when call starts
this.peer.inCall$.subscribe(inCall => {
  if (inCall) {
    const callKind = this.peer.callKind$.value;
    if (callKind === 'audio') {
      this.router.navigate(['/audio-call']);
    } else if (callKind === 'video') {
      this.router.navigate(['/call']);
    }
  }
});
```

**Methods:**
- `startChat(peerId)` - Chat-ის დაწყება
- `callAudio(peerId)` - Audio call-ის დაწყება
- `callVideo(peerId)` - Video call-ის დაწყება

---

### 3. **ChatComponent** (`pages/chat/`)

**რას აკეთებს:**
- Real-time messaging
- Message history display
- Auto-scroll to latest message

**როგორ მუშაობს:**
```typescript
// Message subscription
this.peer.onMessage$.subscribe(msg => {
  if (msg) {
    this.messages.push({
      text: msg.message,
      time: new Date(msg.time),
      from: 'remote'
    });
  }
});

// Send message
send() {
  this.peer.sendMessage(this.text);
  this.messages.push({
    text: this.text,
    time: new Date(),
    from: 'me'
  });
}
```

**Key Features:**
- Bidirectional messaging
- Timestamp display
- Message bubbles (me vs remote)
- Auto-scroll

---

### 4. **AudioCallComponent** (`pages/audio-call/`)

**რას აკეთებს:**
- Audio call interface
- Remote audio playback
- Call controls (mute, video upgrade, end)
- Call timer

**როგორ მუშაობს:**
```typescript
// Remote stream subscription
this.peer.remoteStream$.subscribe(stream => {
  if (stream && this.remoteAudio?.nativeElement) {
    this.remoteAudio.nativeElement.srcObject = stream;
    this.remoteAudio.nativeElement.play();
  }
});

// Controls
toggleMute() {
  this.isMicOn = this.peer.toggleMicrophone();
}

enableVideo() {
  this.peer.upgradeToVideo().then(() => {
    this.router.navigate(["/call"]);
  });
}
```

**Key Features:**
- Audio stream handling
- Mute/unmute
- Upgrade to video
- Call duration timer
- Instagram-style UI

---

### 5. **CallComponent** (`pages/call/`)

**რას აკეთებს:**
- Video call interface
- Local & remote video display
- Call controls (mute, camera, end)
- Call timer

**როგორ მუშაობს:**
```typescript
// Local stream subscription
this.peer.localStream$.subscribe(stream => {
  if (stream && this.localVideo?.nativeElement) {
    this.localVideo.nativeElement.srcObject = stream;
  }
});

// Remote stream subscription
this.peer.remoteStream$.subscribe(stream => {
  if (stream && this.remoteVideo?.nativeElement) {
    this.remoteVideo.nativeElement.srcObject = stream;
  }
});

// Controls
toggleCamera() {
  this.isCameraOn = this.peer.toggleCamera();
}

toggleMic() {
  this.isMicOn = this.peer.toggleMicrophone();
}
```

**Key Features:**
- Full-screen remote video
- Picture-in-picture local video
- Camera on/off
- Microphone mute/unmute
- Instagram-style UI

---

## 🔧 Services

### 1. **PeerService** (`services/peer.service.ts`)

**რას აკეთებს:**
- PeerJS peer connection management
- WebRTC media streams handling
- Call state management
- Chat messaging

**Main Properties:**
```typescript
peerId$: BehaviorSubject<string | null>        // Current peer ID
inCall$: BehaviorSubject<boolean>              // Call status
callKind$: BehaviorSubject<CallKind | null>    // 'audio' | 'video' | null
localStream$: BehaviorSubject<MediaStream | null>   // Local media stream
remoteStream$: BehaviorSubject<MediaStream | null>   // Remote media stream
error$: BehaviorSubject<string | null>         // Error messages
```

**Main Methods:**

#### `initPeer(): Promise<string>`
- ინიციალიზებს PeerJS peer connection
- აბრუნებს peerId-ს
- აყენებს event listeners-ს:
  - `connection` - incoming chat connections
  - `call` - incoming calls

```typescript
initPeer() {
  this._peer = new Peer({ 
    debug: 2,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  });
  
  this.peer.on("open", (id) => {
    this.peerId$.next(id);
  });
  
  this.peer.on("call", async (call) => {
    // Handle incoming call
  });
}
```

#### `startAudioCall(peerId: string): Promise<void>`
- იწყებს audio call-ს
- ითხოვს microphone access
- ქმნის MediaConnection-ს

```typescript
async startAudioCall(peerId: string) {
  await this.startCall(peerId, "audio");
}

private async startCall(peerId: string, kind: CallKind) {
  // 1. Request media
  const stream = await this.getUserMedia(kind === "video");
  this.localStream$.next(stream);
  
  // 2. Create call
  const call = this._peer.call(peerId, stream, { 
    metadata: { kind } 
  });
  
  // 3. Handle remote stream
  call.on("stream", (remote) => {
    this.remoteStream$.next(remote);
  });
}
```

#### `startVideoCall(peerId: string): Promise<void>`
- იწყებს video call-ს
- ითხოვს camera + microphone access

#### `upgradeToVideo(): Promise<void>`
- Audio call-ს ადგენს video call-ად
- ითხოვს camera access
- ამატებს video track-ს existing stream-ში

#### `toggleMicrophone(): boolean`
- ანიჭებს/აკარგვებს microphone-ს
- აბრუნებს ახალ state-ს

#### `toggleCamera(): boolean`
- ანიჭებს/აკარგვებს camera-ს
- აბრუნებს ახალ state-ს

#### `endCall(): void`
- ასრულებს call-ს
- აჩერებს ყველა media track-ს
- ასუფთავებს state-ს

---

### 2. **SignalingService** (`services/signaling.service.ts`)

**რას აკეთებს:**
- WebSocket connection signaling server-თან
- User registration
- User list management

**Main Properties:**
```typescript
users$: BehaviorSubject<any[]>    // Online users list
offer$: BehaviorSubject<any>       // WebRTC offer (not used in current implementation)
answer$: BehaviorSubject<any>      // WebRTC answer (not used)
iceCandidate$: BehaviorSubject<any> // ICE candidates (not used)
```

**Main Methods:**

#### `connect(username: string, peerId: string)`
- ხსნის WebSocket connection-ს
- რეგისტრირდება server-ზე
- იღებს users list-ს

```typescript
connect(username: string, peerId: string) {
  this.ws = new WebSocket("https://angular-chat-server-1-itg3.onrender.com");
  
  this.ws.onopen = () => {
    this.send({
      type: "register",
      username,
      peerId
    });
  };
  
  this.ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    
    switch (data.type) {
      case "users":
        this.users$.next(data.users);
        break;
    }
  };
}
```

**WebSocket Messages:**
- `register` - User registration
- `users` - Users list update
- `offer` - WebRTC offer (future use)
- `answer` - WebRTC answer (future use)
- `ice-candidate` - ICE candidate (future use)

---

## 🔄 User Flow

### 1. **Login Flow:**
```
User → Enter username → Click Login
  ↓
PeerService.initPeer() → Get peerId
  ↓
SignalingService.connect(username, peerId)
  ↓
Register on WebSocket server
  ↓
Navigate to /users
```

### 2. **Users List Flow:**
```
Load UsersComponent
  ↓
Subscribe to signaling.users$
  ↓
Display online users
  ↓
User clicks action (Chat/Audio/Video)
  ↓
Call appropriate method
```

### 3. **Chat Flow:**
```
User clicks "Chat" button
  ↓
PeerService.connectToPeer(peerId)
  ↓
DataConnection established
  ↓
Navigate to /chat
  ↓
Send/receive messages via DataConnection
```

### 4. **Audio Call Flow:**
```
User clicks "Audio" button
  ↓
PeerService.startAudioCall(peerId)
  ↓
Request microphone access
  ↓
Create MediaConnection with metadata: { kind: "audio" }
  ↓
Navigate to /audio-call
  ↓
Remote user receives call
  ↓
Remote user answers with audio stream
  ↓
Both users hear each other
```

### 5. **Video Call Flow:**
```
User clicks "Video" button
  ↓
PeerService.startVideoCall(peerId)
  ↓
Request camera + microphone access
  ↓
Create MediaConnection with metadata: { kind: "video" }
  ↓
Navigate to /call
  ↓
Remote user receives call
  ↓
Remote user answers with video + audio stream
  ↓
Both users see and hear each other
```

### 6. **Incoming Call Flow:**
```
PeerService receives "call" event
  ↓
Check call.metadata.kind (default: "audio")
  ↓
Request appropriate media (audio or video)
  ↓
Answer call with local stream
  ↓
Auto-navigate based on call kind:
  - audio → /audio-call
  - video → /call
  ↓
Handle remote stream
```

---

## 🔍 როგორ მუშაობს

### WebRTC Architecture:

#### 1. **Initial Setup:**
```
User A                    Signaling Server              User B
  |                            |                          |
  |--- Register (peerId) ---->|                          |
  |<-- Users List ------------|                          |
  |                            |                          |
  |                            |<--- Register (peerId) ---|
  |                            |--- Users List ---------->|
```

#### 2. **Call Initiation:**
```
User A (Caller)                                    User B (Receiver)
  |                                                      |
  |--- PeerJS: peer.call(peerId, stream) -------------->|
  |                                                      |
  |                                                      |--- PeerJS: "call" event
  |                                                      |--- Request media
  |                                                      |--- call.answer(stream)
  |                                                      |
  |<--- Remote stream -----------------------------------|
  |                                                      |
  |<========= WebRTC Direct Connection ==========>        |
  |  (Audio/Video streams exchange directly)             |
```

#### 3. **Chat Messaging:**
```
User A                                              User B
  |                                                      |
  |--- PeerJS: peer.connect(peerId) ------------------->|
  |                                                      |
  |                                                      |--- PeerJS: "connection" event
  |                                                      |
  |--- DataConnection.send(message) ------------------->|
  |                                                      |--- Receive message
  |                                                      |--- Display in UI
  |<--- DataConnection.send(message) ------------------|
  |--- Receive message                                   |
  |--- Display in UI                                    |
```

### Key Concepts:

#### 1. **PeerJS Peer:**
- თითოეულ იუზერს აქვს unique peerId
- PeerJS server-ი (default) გამოიყენება peer discovery-სთვის
- Peer-to-peer connection-ები იქმნება WebRTC-ს გამოყენებით

#### 2. **MediaConnection:**
- WebRTC-ს გამოიყენებს audio/video streams-ის გადასაცემად
- Metadata-ში ინახება call type (audio/video)
- Streams გადაეცემა directly peer-to-peer

#### 3. **DataConnection:**
- Chat messages-ისთვის
- Text data-ს გადასაცემად
- არ საჭიროებს media permissions

#### 4. **Signaling:**
- WebSocket server-ი გამოიყენება:
  - User discovery-სთვის
  - PeerId exchange-ისთვის
- WebRTC-სთვის signaling (offer/answer/ICE) არ გამოიყენება ამ მომენტში
- PeerJS აკეთებს signaling-ს automatically

### State Management:

#### PeerService State:
```typescript
peerId$: string | null              // Current peer ID
inCall$: boolean                    // Is user in a call?
callKind$: 'audio' | 'video' | null // Call type
localStream$: MediaStream | null     // User's own media
remoteStream$: MediaStream | null   // Other user's media
currentCall: MediaConnection | null  // Active call object
connection: DataConnection | null    // Active chat connection
```

#### Component Subscriptions:
- Components subscribe to PeerService observables
- UI updates automatically when state changes
- Proper cleanup on component destroy

---

## 🚀 როგორ გავუშვა

### Prerequisites:
- Node.js (v18+)
- npm

### Installation:
```bash
# Install dependencies
npm install

# Start development server
npm start

# App will be available at http://localhost:4200
```

### Development:
```bash
# Watch mode
npm run watch

# Build for production
npm run build
```

### Testing:
1. გახსენი 2 browser tabs/windows
2. Login different usernames-ით
3. ერთმანეთს ნახავ users list-ში
4. დაიწყე chat/call

### Important Notes:

#### Browser Permissions:
- **Microphone** - Required for audio calls
- **Camera** - Required for video calls
- Browsers will prompt for permissions on first use

#### Network Requirements:
- **STUN servers** - Used for NAT traversal
- Default: Google STUN servers
- May need TURN servers for some networks

#### Signaling Server:
- Current: `https://angular-chat-server-1-itg3.onrender.com`
- Must be running for user discovery
- Handles WebSocket connections

---

## 📝 Technical Details

### Error Handling:
- All async operations have try-catch
- Error messages via `error$` observable
- User-friendly error messages
- Console logging for debugging

### Memory Management:
- Proper subscription cleanup in `ngOnDestroy`
- Media tracks stopped on call end
- Peer connections closed properly
- No memory leaks

### Performance:
- Lazy loading for call components
- Efficient stream handling
- Minimal re-renders with RxJS
- Optimized change detection

### Security:
- No authentication (for demo)
- PeerId is public
- WebRTC encryption (automatic)
- HTTPS recommended for production

### Browser Compatibility:
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 11+)
- Mobile browsers: ✅ Supported

---

## 🎯 Key Concepts Explained

### 1. **PeerJS vs WebRTC:**
- **WebRTC** - Browser API for peer-to-peer connections
- **PeerJS** - Wrapper library that simplifies WebRTC usage
- PeerJS handles signaling automatically (via PeerJS server)
- We use custom signaling server only for user discovery

### 2. **MediaStream API:**
```typescript
// Request microphone
navigator.mediaDevices.getUserMedia({ audio: true })

// Request camera + microphone
navigator.mediaDevices.getUserMedia({ 
  video: true, 
  audio: true 
})

// Access tracks
stream.getAudioTracks()  // Audio tracks
stream.getVideoTracks() // Video tracks

// Control tracks
track.enabled = false;  // Mute/disable
track.stop();           // Stop track
```

### 3. **RxJS Observables:**
```typescript
// BehaviorSubject - holds current value
peerId$ = new BehaviorSubject<string | null>(null);

// Subscribe to changes
this.peer.peerId$.subscribe(peerId => {
  console.log('Peer ID:', peerId);
});

// Emit new value
this.peerId$.next('new-peer-id');
```

### 4. **Angular Lifecycle:**
```typescript
ngOnInit() {
  // Component initialized
  // Subscribe to observables
}

ngAfterViewInit() {
  // View initialized
  // Access ViewChild elements
}

ngOnDestroy() {
  // Component destroyed
  // Cleanup subscriptions
}
```

---

## 🎨 UI/UX Features

### Design System:
- Consistent color scheme (#667eea purple)
- Solid colors (no gradients)
- Glassmorphism effects
- Instagram-style call interface

### Responsive:
- Mobile-friendly
- Safe area insets support
- Touch-optimized controls

### Animations:
- Smooth transitions
- Fade-in effects
- Hover states

---

## 🔮 Future Improvements

1. **Authentication** - User login system
2. **Message History** - Persist messages
3. **File Sharing** - Send images/files
4. **Group Calls** - Multiple participants
5. **Screen Sharing** - Share screen during calls
6. **Notifications** - Browser notifications
7. **TURN Servers** - Better connectivity

---

## 📚 როგორ ავხსნა სხვისთვის

### მოკლე ახსნა (2 წუთი):
"ეს არის real-time chat და video/audio call აპლიკაცია. იყენებს PeerJS-ს WebRTC-სთვის, რაც საშუალებას აძლევს იუზერებს პირდაპირ ერთმანეთთან დაკავშირებას browser-ში, server-ის გარეშე media streams-ისთვის. WebSocket server-ი გამოიყენება მხოლოდ იუზერების ძიებისთვის."

### დეტალური ახსნა (10 წუთი):
1. **Architecture** - ახსენი PeerJS, WebRTC, WebSocket roles
2. **Components** - აჩვენე თითოეული component-ის მიზანი
3. **Services** - ახსენი PeerService და SignalingService
4. **Flow** - აჩვენე user flow diagram-ით
5. **Code Walkthrough** - აჩვენე key methods

### Demo:
1. გაუშვი აპლიკაცია
2. გახსენი 2 tabs
3. Login different users-ით
4. აჩვენე chat
5. აჩვენე audio call
6. აჩვენე video call
7. აჩვენე controls (mute, camera)

---

## ❓ FAQ (ხშირად დასმული კითხვები)

### Q: რატომ არ მუშაობს call?
**A:** შეამოწმე:
1. Browser permissions (microphone/camera) - უნდა იყოს allowed
2. Network - ზოგიერთ network-ზე საჭიროა TURN servers
3. Browser console - შეამოწმე errors
4. PeerService error$ - შეამოწმე error messages

### Q: როგორ მუშაობს peer discovery?
**A:** 
- **PeerJS server** (default) - გამოიყენება peerId-ების exchange-ისთვის
- **Signaling server** (custom) - გამოიყენება users list-ისთვის
- PeerJS automatically handles WebRTC signaling
- Custom signaling server only for user discovery

### Q: შეიძლება თუ არა group calls?
**A:** არა, ამ მომენტში მხოლოდ **1-to-1 calls**. 
- Group calls-ისთვის საჭიროა **SFU** (Selective Forwarding Unit)
- ან **MCU** (Multipoint Control Unit)
- ან mesh topology (complex)

### Q: როგორ ინახება messages?
**A:** ამ მომენტში messages **არ ინახება**. 
- მხოლოდ real-time exchange
- Refresh-ის შემდეგ messages იკარგება
- Future: localStorage ან database

### Q: რა არის STUN/TURN servers?
**A:**
- **STUN** - NAT traversal (free, Google provides)
- **TURN** - Relay server (paid, needed for some networks)
- Current: Only STUN servers configured
- Production: May need TURN servers

### Q: როგორ მუშაობს upgradeToVideo?
**A:**
1. Audio call active
2. Request camera access
3. Get video track
4. Add video track to existing stream
5. Replace track in PeerConnection
6. Navigate to video call page

### Q: რატომ არის 2 signaling servers?
**A:**
- **PeerJS server** - WebRTC signaling (automatic)
- **Custom WebSocket server** - User discovery only
- PeerJS handles WebRTC, we handle user list

---

## 🐛 Debugging Guide

### Console Logs:
```typescript
// PeerService logs
console.log("[PeerService] Incoming call, kind:", kind);
console.log("[PeerService] Outgoing call started, kind:", kind);

// SignalingService logs
console.log("Connected to signaling server");
console.log("SIGNALING MESSAGE:", data);
```

### Common Issues:

#### 1. **"Peer not initialized"**
- **Cause:** `initPeer()` not called
- **Fix:** Ensure login flow completes

#### 2. **"Failed to get user media"**
- **Cause:** Permissions denied or no device
- **Fix:** Check browser permissions, ensure devices connected

#### 3. **"PeerConnection not available"**
- **Cause:** Call not fully established
- **Fix:** Wait for call to establish, check network

#### 4. **"WebSocket connection failed"**
- **Cause:** Signaling server down or network issue
- **Fix:** Check server status, network connection

#### 5. **No remote stream**
- **Cause:** Remote user didn't answer or network issue
- **Fix:** Check both users' connections, permissions

---

## 📞 Support

თუ რაიმე პრობლემა გაქვს:
1. შეამოწმე browser console-ში errors
2. შეამოწმე network tab-ში WebSocket connection
3. შეამოწმე browser permissions
4. შეამოწმე PeerService error$ observable

---

## 📖 Code Examples

### როგორ დავიწყო Call:

```typescript
// UsersComponent-ში
async callAudio(peerId: string) {
  try {
    // 1. Start audio call
    await this.peer.startAudioCall(peerId);
    
    // 2. Navigate to audio call page
    this.router.navigate(['/audio-call']);
  } catch (error) {
    console.error("Failed to start audio call:", error);
  }
}
```

### როგორ მივიღო Incoming Call:

```typescript
// PeerService-ში (automatic)
this._peer.on("call", async (call) => {
  // 1. Get call type from metadata
  const kind: CallKind = call.metadata?.kind ?? "audio";
  
  // 2. Request appropriate media
  const stream = await this.getUserMedia(kind === "video");
  
  // 3. Answer call
  call.answer(stream);
  
  // 4. Handle remote stream
  call.on("stream", (remote) => {
    this.remoteStream$.next(remote);
  });
});
```

### როგორ გავაგზავნო Message:

```typescript
// ChatComponent-ში
send() {
  // 1. Send via DataConnection
  this.peer.sendMessage(this.text);
  
  // 2. Add to local messages
  this.messages.push({
    from: "me",
    text: this.text,
    time: Date.now()
  });
}
```

---

## 🎓 Learning Resources

### WebRTC:
- [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [WebRTC Fundamentals](https://webrtc.org/getting-started/overview)

### PeerJS:
- [PeerJS Documentation](https://peerjs.com/docs)
- [PeerJS Examples](https://peerjs.com/examples)

### Angular:
- [Angular Documentation](https://angular.io/docs)
- [RxJS Documentation](https://rxjs.dev/)

---

## 🔧 Configuration

### PeerJS Configuration:
```typescript
new Peer({ 
  debug: 2,  // Debug level (0-3)
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }
})
```

### Signaling Server:
- Current: `https://angular-chat-server-1-itg3.onrender.com`
- To change: Edit `signaling.service.ts` line 18

### Media Constraints:
```typescript
// Audio only
{ audio: true, video: false }

// Video + Audio
{ 
  video: { width: 1280, height: 720 },
  audio: { echoCancellation: true }
}
```

---

## 📊 Data Flow Diagrams

### Message Flow:
```
User A types message
  ↓
ChatComponent.send()
  ↓
PeerService.sendMessage()
  ↓
DataConnection.send()
  ↓
WebRTC P2P Connection
  ↓
User B receives
  ↓
PeerService.onMessage$
  ↓
ChatComponent displays
```

### Call Flow:
```
User A clicks "Call"
  ↓
PeerService.startAudioCall(peerId)
  ↓
Request microphone
  ↓
Create MediaConnection
  ↓
PeerJS signaling (automatic)
  ↓
User B receives call
  ↓
User B answers
  ↓
WebRTC connection established
  ↓
Streams exchange
```

---

## 🎯 Best Practices

### 1. **Always Cleanup:**
```typescript
ngOnDestroy() {
  // Unsubscribe
  this.subscriptions.unsubscribe();
  
  // Stop tracks
  this.peer.endCall();
}
```

### 2. **Error Handling:**
```typescript
try {
  await this.peer.startAudioCall(peerId);
} catch (error) {
  // Show user-friendly message
  console.error("Call failed:", error);
}
```

### 3. **State Management:**
```typescript
// Use observables for reactive updates
this.peer.inCall$.subscribe(inCall => {
  this.isConnected = inCall;
});
```

### 4. **Permissions:**
```typescript
// Always check permissions before requesting
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  // Request media
}
```

---

## 🚨 Common Pitfalls

### 1. **Not Cleaning Up Subscriptions**
- ❌ Memory leaks
- ✅ Always unsubscribe in ngOnDestroy

### 2. **Not Stopping Media Tracks**
- ❌ Camera/mic stays on
- ✅ Always stop tracks on call end

### 3. **Not Handling Errors**
- ❌ Silent failures
- ✅ Always use try-catch and show errors

### 4. **Race Conditions**
- ❌ Accessing ViewChild before ready
- ✅ Use ngAfterViewInit or setTimeout

---

## 📝 Code Structure Summary

### Component Responsibilities:

| Component | Responsibility |
|-----------|---------------|
| **LoginComponent** | User authentication, peer initialization |
| **UsersComponent** | Display users, initiate calls/chats |
| **ChatComponent** | Real-time messaging |
| **AudioCallComponent** | Audio call interface |
| **CallComponent** | Video call interface |

### Service Responsibilities:

| Service | Responsibility |
|---------|---------------|
| **PeerService** | WebRTC, media streams, calls |
| **SignalingService** | WebSocket, user discovery |

### Key Files:

- `app.routes.ts` - Routing configuration
- `peer.service.ts` - Core WebRTC logic
- `signaling.service.ts` - WebSocket communication
- `styles.scss` - Global design system

---

## 🎬 Quick Start Guide

### For New Developers:

1. **Read this documentation** - Understand architecture
2. **Run the app** - `npm start`
3. **Open 2 browser tabs** - Test with 2 users
4. **Try all features** - Chat, audio, video
5. **Read code** - Start with services, then components
6. **Modify something** - Make a small change
7. **Test it** - Ensure it works

### For Presenters:

1. **Prepare demo** - 2 devices/tabs ready
2. **Show login** - Explain peer initialization
3. **Show users list** - Explain signaling
4. **Show chat** - Explain DataConnection
5. **Show audio call** - Explain MediaConnection
6. **Show video call** - Explain video streams
7. **Show controls** - Explain track management

---

## 🎤 როგორ ავხსნა სხვისთვის (Presentation Guide)

### მოკლე პრეზენტაცია (5 წუთი):

#### 1. **შესავალი (30 წამი)**
"ეს არის real-time chat და video/audio call აპლიკაცია. იყენებს WebRTC-ს peer-to-peer კავშირებისთვის, რაც ნიშნავს რომ media streams (audio/video) გადაეცემა პირდაპირ browser-ებს შორის, server-ის გარეშე."

#### 2. **ტექნოლოგიები (1 წუთი)**
- **Angular 21** - Frontend framework
- **PeerJS** - WebRTC wrapper (გაამარტივებს WebRTC-ს გამოყენებას)
- **WebSocket** - Signaling server (იუზერების ძიებისთვის)
- **WebRTC** - Browser API peer-to-peer connections-ისთვის

#### 3. **Live Demo (3 წუთი)**
1. **Login** (30 წამი)
   - გახსენი 2 browser tabs
   - Login different usernames-ით
   - ახსენი: "PeerJS იქმნის unique peerId-ს, რომელიც გამოიყენება connection-ისთვის"

2. **Users List** (30 წამი)
   - აჩვენე users list
   - ახსენი: "WebSocket server-ი აგვიგზავნის online users-ის list-ს"

3. **Chat** (1 წუთი)
   - დაიწყე chat
   - გაგზავნე message
   - ახსენი: "DataConnection გამოიყენება text messages-ისთვის, WebRTC P2P"

4. **Audio Call** (1 წუთი)
   - დაიწყე audio call
   - აჩვენე mute/unmute
   - ახსენი: "MediaConnection გამოიყენება audio streams-ისთვის"

5. **Video Call** (30 წამი)
   - upgrade to video
   - აჩვენე camera controls
   - ახსენი: "Video track-ები დამატებულია audio stream-ში"

#### 4. **დასკვნა (30 წამი)**
"ყველაფერი მუშაობს browser-ში, server-ი გამოიყენება მხოლოდ იუზერების ძიებისთვის. Actual media streams გადაეცემა პირდაპირ peer-to-peer."

---

### დეტალური პრეზენტაცია (15 წუთი):

#### 1. **არქიტექტურა (3 წუთი)**

**Components:**
- LoginComponent - Authentication
- UsersComponent - User discovery
- ChatComponent - Messaging
- AudioCallComponent - Audio calls
- CallComponent - Video calls

**Services:**
- PeerService - WebRTC logic
- SignalingService - WebSocket communication

**Flow:**
```
User → Login → Get PeerID → Register on Server → See Users → Connect
```

#### 2. **WebRTC ახსნა (5 წუთი)**

**რა არის WebRTC:**
- Browser API peer-to-peer connections-ისთვის
- Direct media stream exchange
- No server needed for media

**როგორ მუშაობს:**
1. **Signaling** - Peer discovery (PeerJS server)
2. **ICE** - Network traversal (STUN/TURN)
3. **Media** - Direct stream exchange

**PeerJS როლები:**
- გაამარტივებს WebRTC-ს
- აკეთებს signaling-ს automatically
- Provides simple API

#### 3. **Code Walkthrough (5 წუთი)**

**PeerService.initPeer():**
```typescript
// 1. Create Peer instance
this._peer = new Peer();

// 2. Get peer ID
this.peer.on("open", (id) => {
  this.peerId$.next(id);
});

// 3. Handle incoming calls
this.peer.on("call", async (call) => {
  // Answer call
});
```

**Starting a Call:**
```typescript
// 1. Request media
const stream = await getUserMedia({ audio: true });

// 2. Create call
const call = this.peer.call(peerId, stream);

// 3. Handle remote stream
call.on("stream", (remote) => {
  // Display remote stream
});
```

**Sending Messages:**
```typescript
// 1. Connect to peer
await this.peer.connectToPeer(peerId);

// 2. Send message
this.connection.send({ message: "Hello" });
```

#### 4. **Q&A (2 წუთი)**
- Common questions
- Technical details
- Future improvements

---

### სლაიდების სტრუქტურა (თუ პრეზენტაცია გჭირდება):

#### Slide 1: Title
- Chat App - Real-time Video/Audio Calls
- Tech: Angular + WebRTC

#### Slide 2: Features
- Audio Calls
- Video Calls
- Real-time Chat
- User Discovery

#### Slide 3: Architecture
- Components diagram
- Services diagram
- Data flow

#### Slide 4: WebRTC
- What is WebRTC
- How it works
- PeerJS role

#### Slide 5: Demo
- Live demonstration

#### Slide 6: Code
- Key code snippets
- Explanation

#### Slide 7: Q&A
- Questions welcome

---

### როგორ ვუპასუხო კითხვებს:

**Q: რატომ არ გამოიყენებს server-ი media streams-ისთვის?**
A: WebRTC საშუალებას აძლევს direct peer-to-peer connections-ს, რაც უფრო სწრაფია და server-ის load-ს ამცირებს.

**Q: რა არის PeerJS?**
A: Library რომელიც გაამარტივებს WebRTC-ს გამოყენებას. აკეთებს signaling-ს automatically.

**Q: როგორ მუშაობს user discovery?**
A: WebSocket server-ი ინახავს online users-ის list-ს. PeerJS server-ი გამოიყენება peerId exchange-ისთვის.

**Q: შეიძლება თუ არა group calls?**
A: ამ მომენტში მხოლოდ 1-to-1. Group calls-ისთვის საჭიროა SFU server.

**Q: რა არის STUN/TURN?**
A: STUN - NAT traversal (free). TURN - Relay server (paid, needed for some networks).

---

### Visual Aids (რეკომენდებული):

1. **Architecture Diagram:**
   - Draw components and services
   - Show data flow
   - Highlight WebRTC P2P

2. **Call Flow Diagram:**
   - Show call initiation
   - Show signaling
   - Show media exchange

3. **Code Snippets:**
   - Key methods
   - Highlight important parts
   - Explain step by step

---

### Tips for Presentation:

1. **Start with Demo** - Show it working first
2. **Explain as you go** - Don't wait until the end
3. **Use simple language** - Avoid too much jargon
4. **Show code** - But keep it simple
5. **Be ready for questions** - Have answers prepared
6. **Practice** - Run through it once before

---

### Common Questions & Answers:

**Q: რა browser-ები მხარს უჭერენ?**
A: Chrome, Firefox, Safari, Edge - ყველა modern browser.

**Q: რა permissions-ები საჭიროა?**
A: Microphone (audio calls), Camera (video calls).

**Q: როგორ მუშაობს NAT traversal?**
A: STUN servers გამოიყენება public IP-ის მისაღებად. TURN servers relay-სთვის.

**Q: შეიძლება თუ არა mobile-ზე?**
A: დიახ, mobile browsers-ზეც მუშაობს.

**Q: რა არის signaling?**
A: Process peer discovery-სთვის. PeerJS აკეთებს automatically, ჩვენ გამოვიყენებთ custom signaling user discovery-სთვის.

---

## 📞 Support & Contact

### Getting Help:
1. Check this documentation
2. Check browser console for errors
3. Check PeerService error$ observable
4. Review code comments

### Reporting Issues:
- Describe the problem
- Include browser/OS info
- Include console errors
- Include steps to reproduce

---

**გააკეთა:** Auto (Cursor AI)  
**თარიღი:** 2025  
**ვერსია:** 1.0  
**License:** MIT
