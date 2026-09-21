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

/* redirect 回跳的結果。失敗要記下來讓畫面講出口，不要靜默吞掉——
   否則使用者只會看到「選完 Google 帳號又回到登入畫面」，不知道發生什麼事。 */
getRedirectResult(auth).catch(err => {
  window.__fbAuthError = (err && err.code) || String(err);
});

const ref = uid => doc(db, "users", uid);

window.__fb = {
  onUser(cb) {
    return onAuthStateChanged(auth, cb);
  },
  async signIn() {
    window.__fbAuthError = null;
    /* 一律先用 popup，手機也是。signInWithRedirect 在 iOS Safari 和會切割
       第三方儲存的瀏覽器上，回跳時會弄丟待處理狀態（它要靠指向 authDomain
       的跨網域 iframe 取回結果），表現就是回到登入畫面且毫無錯誤。自架在
       GitHub Pages 上無法自行託管 auth handler，所以 popup 才是可靠的那條路。 */
    try {
      return await signInWithPopup(auth, provider);
    } catch (err) {
      const code = (err && err.code) || "";
      if (code === "auth/popup-blocked" ||
          code === "auth/operation-not-supported-in-this-environment") {
        return signInWithRedirect(auth, provider);
      }
      throw err;
    }
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
