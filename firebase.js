/* ============================================================
   餘裕 · Firebase 儲存層
   ------------------------------------------------------------
   ↓↓↓ 只有這一段需要你填。到 Firebase 主控台 →
       專案設定 → 一般 → 你的應用程式 → SDK 設定與配置 → 設定
       把整個 firebaseConfig 物件複製過來取代下面這段。
   ============================================================ */
const firebaseConfig = {
  apiKey:            "AIzaSyA8yYOURAuzsu0Dd_2tSKLJByWKdt1z144",
  authDomain:        "financial-management-das-58692.firebaseapp.com",
  projectId:         "financial-management-das-58692",
  storageBucket:     "financial-management-das-58692.firebasestorage.app",
  messagingSenderId: "245238892568",
  appId:             "1:245238892568:web:a61fe79b5d997842395b6d"
};
/* ============ 以下不用改 ============ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  initializeFirestore, doc, setDoc, onSnapshot,
  persistentLocalCache, persistentSingleTabManager
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 開啟本機快取：離線也讀得到、也記得住還沒送出的寫入
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) })
});

await setPersistence(auth, browserLocalPersistence).catch(() => {});

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// 手機上 popup 常被擋，改用 redirect
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
getRedirectResult(auth).catch(() => {});

const ref = uid => doc(db, "users", uid);

window.__fb = {
  onUser(cb) {
    return onAuthStateChanged(auth, cb);
  },
  signIn() {
    return isMobile ? signInWithRedirect(auth, provider) : signInWithPopup(auth, provider);
  },
  signOut() {
    return signOut(auth);
  },
  subscribe(uid, next, err) {
    return onSnapshot(ref(uid),
      snap => {
        // 自己剛寫、還沒回到伺服器的那一次跳過，避免重複渲染
        if (snap.metadata.hasPendingWrites) return;
        next(snap.exists() ? snap.data() : null, snap.metadata.fromCache);
      },
      err
    );
  },
  write(uid, body) {
    return setDoc(ref(uid), body);
  }
};

window.dispatchEvent(new Event("fb-ready"));
