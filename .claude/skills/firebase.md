# Skill: Firebase

## Config
Hardcode trực tiếp trong `js/firebase.js` (không dùng `process.env`, không GitHub Secrets):
```js
const firebaseConfig = {
  apiKey: 'AIzaSyA8l_Vf1z2voh-VEamdppShi61kubaQZnY',
  authDomain: 'survival-game-4c7b4.firebaseapp.com',
  projectId: 'survival-game-4c7b4',
  storageBucket: 'survival-game-4c7b4.firebasestorage.app',
  messagingSenderId: '273751153126',
  appId: '1:273751153126:web:6b73c7267cc98960601e27',
};
```
- Key đã rotate ngày 18/6/2026
- KHÔNG restrict domain Google Cloud (block internal Firebase auth calls)
- Firebase web key thiết kế để public — bảo mật qua Firestore rules + Auth

## Firestore schema
```
players/{uid}                        — profile, displayNameLower
players/{uid}/friends/{uid}          — friend list
players/{uid}/requests/{uid}         — friend requests
players/{uid}/roomInvites/{fromUid}  — room invite notifications
rooms/{code}                         — { status: 'waiting'|'started' }
rooms/{code}/players/{uid}           — lobby players (isHost, joinedAt)
rooms/{code}/playerStates/{uid}      — realtime position/anim sync
rooms/{code}/gameState/main          — host-authoritative enemy positions
```

## Auth functions (js/firebase.js)
- `signInWithGoogle()` — signInWithPopup (không redirect)
- `checkRedirectResult()` — getRedirectResult (fallback)
- `signOutUser()` — signOut
- `onAuthChange(cb)` — onAuthStateChanged
- `saveUserProfile(uid, displayName, photoURL)` — lưu vào `players/{uid}`
