import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where, limit, deleteDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
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
