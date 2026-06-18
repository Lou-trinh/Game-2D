import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where, limit, deleteDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyA8l_Vf1z2voh-VEamdppShi61kubaQZnY',
  authDomain: 'survival-game-4c7b4.firebaseapp.com',
  projectId: 'survival-game-4c7b4',
  storageBucket: 'survival-game-4c7b4.firebasestorage.app',
  messagingSenderId: '273751153126',
  appId: '1:273751153126:web:6b73c7267cc98960601e27',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();

export function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function checkRedirectResult() {
  return getRedirectResult(auth);
}

export function signOutUser() {
  return signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function loadProgress(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function saveProgress(uid, data) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, data, { merge: true });
}

export async function saveUserProfile(uid, displayName, photoURL) {
  const ref = doc(db, 'players', uid);
  await setDoc(ref, {
    uid,
    displayName,
    displayNameLower: (displayName || '').toLowerCase(),
    photoURL,
  }, { merge: true });
}

export async function getFriends(uid) {
  const ref = collection(db, 'players', uid, 'friends');
  const snap = await getDocs(ref);
  return snap.docs.map(d => d.data());
}

export async function searchPlayers(queryStr, excludeUid) {
  const lower = queryStr.toLowerCase();
  const ref = collection(db, 'players');
  const q = query(
    ref,
    where('displayNameLower', '>=', lower),
    where('displayNameLower', '<=', lower + ''),
    limit(8)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data()).filter(u => u.uid !== excludeUid);
}

export async function sendFriendRequest(fromUid, fromProfile, toUid) {
  await setDoc(doc(db, 'players', toUid, 'requests', fromUid), {
    ...fromProfile,
    sentAt: Date.now(),
  });
}

export async function getFriendRequests(uid) {
  const snap = await getDocs(collection(db, 'players', uid, 'requests'));
  return snap.docs.map(d => d.data());
}

export function onFriendRequestsChange(uid, callback) {
  return onSnapshot(collection(db, 'players', uid, 'requests'), snap => {
    callback(snap.docs.map(d => d.data()));
  });
}

export async function acceptFriendRequest(myUid, myProfile, fromUid, fromProfile) {
  await setDoc(doc(db, 'players', myUid, 'friends', fromUid), fromProfile);
  await setDoc(doc(db, 'players', fromUid, 'friends', myUid), myProfile);
  await deleteDoc(doc(db, 'players', myUid, 'requests', fromUid));
}

export async function declineFriendRequest(myUid, fromUid) {
  await deleteDoc(doc(db, 'players', myUid, 'requests', fromUid));
}

export async function removeFriend(myUid, friendUid) {
  await deleteDoc(doc(db, 'players', myUid, 'friends', friendUid));
  await deleteDoc(doc(db, 'players', friendUid, 'friends', myUid));
}

export async function createRoom(roomCode, playerProfile) {
  await setDoc(doc(db, 'rooms', roomCode), { status: 'waiting', createdAt: Date.now() });
  await setDoc(doc(db, 'rooms', roomCode, 'players', playerProfile.uid), {
    ...playerProfile, isHost: true, joinedAt: Date.now(),
  });
}

export async function setRoomStatus(roomCode, status) {
  await setDoc(doc(db, 'rooms', roomCode), { status, updatedAt: Date.now() }, { merge: true });
}

export function onRoomStatusChange(roomCode, callback) {
  return onSnapshot(doc(db, 'rooms', roomCode), snap => {
    if (snap.exists()) callback(snap.data());
  });
}

export async function joinRoom(roomCode, playerProfile) {
  await setDoc(doc(db, 'rooms', roomCode, 'players', playerProfile.uid), {
    ...playerProfile, isHost: false, joinedAt: Date.now(),
  });
}

export function onRoomPlayersChange(roomCode, callback) {
  return onSnapshot(collection(db, 'rooms', roomCode, 'players'), snap => {
    const players = snap.docs.map(d => d.data()).sort((a, b) => {
      if (a.isHost && !b.isHost) return -1;
      if (!a.isHost && b.isHost) return 1;
      return (a.joinedAt || 0) - (b.joinedAt || 0);
    });
    callback(players);
  });
}

export async function leaveRoom(roomCode, uid) {
  await deleteDoc(doc(db, 'rooms', roomCode, 'players', uid));
}

export async function updateGameState(roomCode, data) {
  await setDoc(doc(db, 'rooms', roomCode, 'gameState', 'main'), data);
}

export function onGameStateChange(roomCode, callback) {
  return onSnapshot(doc(db, 'rooms', roomCode, 'gameState', 'main'), snap => {
    if (snap.exists()) callback(snap.data());
  });
}

export async function updatePlayerState(roomCode, uid, state) {
  await setDoc(doc(db, 'rooms', roomCode, 'playerStates', uid), state, { merge: true });
}

export function onOtherPlayersChange(roomCode, myUid, callback) {
  return onSnapshot(collection(db, 'rooms', roomCode, 'playerStates'), snap => {
    const others = snap.docs
      .filter(d => d.id !== myUid)
      .map(d => ({ uid: d.id, ...d.data() }));
    callback(others);
  });
}

export async function removePlayerState(roomCode, uid) {
  await deleteDoc(doc(db, 'rooms', roomCode, 'playerStates', uid));
}

export async function sendRoomInvite(fromUid, fromProfile, toUid, roomCode) {
  await setDoc(doc(db, 'players', toUid, 'roomInvites', fromUid), {
    ...fromProfile,
    roomCode,
    sentAt: Date.now(),
  });
}

export function onRoomInviteChange(uid, callback) {
  return onSnapshot(
    collection(db, 'players', uid, 'roomInvites'),
    snap => { callback(snap.docs.map(d => d.data())); },
    err => console.error('[RoomInvite] listener error:', err)
  );
}

export async function declineRoomInvite(uid, fromUid) {
  await deleteDoc(doc(db, 'players', uid, 'roomInvites', fromUid));
}

export async function sendEnemyKill(roomCode, mpId) {
  await setDoc(doc(db, 'rooms', roomCode, 'kills', String(mpId)), {
    mpId, at: Date.now(),
  });
}

export function onEnemyKills(roomCode, callback) {
  return onSnapshot(collection(db, 'rooms', roomCode, 'kills'), snap => {
    snap.docChanges()
      .filter(c => c.type === 'added')
      .forEach(c => {
        callback(c.doc.data().mpId);
        deleteDoc(c.doc.ref).catch(() => {});
      });
  });
}
