import { signInAnonymously } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export async function bootstrapAuthAndUser() {
  // 익명 로그인 보장
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }

  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("익명 로그인 후 uid를 가져오지 못했어.");

  // users/{uid} 없으면 생성
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      nickname: "익명",
      createdAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
      noShowCount: 0,
      banUntil: null,
      trustScore: 0,
      blockedUids: [],
    });
  } else {
    // 있으면 마지막 접속만 갱신
    await setDoc(ref, { lastActiveAt: serverTimestamp() }, { merge: true });
  }

  return uid;
}
