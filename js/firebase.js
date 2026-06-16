import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBqqc2HC6wnMrXILnijjEXShv-bANRo-es",
  authDomain: "survival-game-4c7b4.firebaseapp.com",
  projectId: "survival-game-4c7b4",
  storageBucket: "survival-game-4c7b4.firebasestorage.app",
  messagingSenderId: "273751153126",
  appId: "1:273751153126:web:6b73c7267cc98960601e27"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();

export function signInWithGoogle() {
  return signInWithPopup(auth, provider);
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
