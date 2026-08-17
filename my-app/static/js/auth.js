import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  linkWithCredential,
  doc,
  db,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "./firebase-config.js";
import { showToast } from "./utils.js";

const EmailInput = document.getElementById("email-input");
const PasswordInput = document.getElementById("password-input");
const logInBtn = document.getElementById("log-in-btn");
const resBtn = document.getElementById("res-btn");

const redirectAfterDelay = (url = "../index.html", delayMs = 1500) => {
  setTimeout(() => {
    window.location.href = url;
  }, delayMs);
};

async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    await updateDoc(doc(db, "users", userCredential.user.uid), {
      lastSignInAt: serverTimestamp(),
    });
    showToast("Successfully logged in!", "success");
    redirectAfterDelay();
  } catch (error) {
    showToast("Login failed: ", "danger", error);
  }
}

async function register(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          createdAt: serverTimestamp(),
          lastSignInAt: serverTimestamp(),
          uid: user.uid,
          roleId: "customer",
        });
      } catch (e) {
        showToast("Create profile failed: ", "danger", e);
        return;
      }
    }

    showToast("Successfully registered!", "success");
    redirectAfterDelay();
  } catch (e) {
    showToast("Registration failed: ", "danger", e);
  }
}

logInBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const LogEmailValue = EmailInput.value.trim();
  const LogPasswordValue = PasswordInput.value.trim();

  if (!LogEmailValue || !LogPasswordValue) {
    showToast("Please fill in all credentials", "warning");
    return;
  }
  await login(LogEmailValue, LogPasswordValue);
});

resBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const ResEmailValue = EmailInput.value.trim();
  const ResPasswordValue = PasswordInput.value.trim();

  if (!ResEmailValue || !ResPasswordValue) {
    showToast("Please fill in all credentials", "warning");
    return;
  }
  await register(ResEmailValue, ResPasswordValue);
});

const btnMap = [
  { id: "google-btn", provider: GoogleAuthProvider },
  { id: "github-btn", provider: GithubAuthProvider },
];

async function signInWithProvider(providerClass) {
  const providerInstance = new providerClass();
  try {
    const result = await signInWithPopup(auth, providerInstance);
    const userRef = doc(db, "users", result.user.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      await updateDoc(userRef, {
        lastSignInAt: serverTimestamp(),
      });
    } else {
      await setDoc(userRef, {
        email: result.user.email,
        createdAt: serverTimestamp(),
        lastSignInAt: serverTimestamp(),
        uid: result.user.uid,
        roleId: "customer",
      });
    }

    showToast("Signed in successfully!", "success");
    redirectAfterDelay();
  } catch (error) {
    if (error.code === "auth/account-exists-with-different-credential") {
      showToast(
        "Account exists with a different credential. Completing account verification...",
        "warning",
      );

      const pendingCredential = providerClass.credentialFromError(error);

      if (auth.currentUser && pendingCredential) {
        await linkWithCredential(auth.currentUser, pendingCredential);
        showToast("Account linked successfully!", "success");
        redirectAfterDelay();
        return;
      }

      try {
        const primaryProvider = new GoogleAuthProvider();
        const primaryResult = await signInWithPopup(auth, primaryProvider);
        const existingProviderIds = primaryResult.user.providerData.map(
          (p) => p.providerId,
        );

        if (
          pendingCredential &&
          !existingProviderIds.includes(pendingCredential.providerId)
        ) {
          await linkWithCredential(primaryResult.user, pendingCredential);
          showToast("Accounts linked successfully!", "success");
        } else {
          showToast("Signed in successfully!", "success");
        }

        redirectAfterDelay();
        return;
      } catch (linkError) {
        showToast("Linking error: ", "danger", linkError);
        redirectAfterDelay();
        return;
      }
    }
    showToast("Sign-In Error: ", "danger", error);
  }
}

for (const curr of btnMap) {
  const btn = document.getElementById(curr.id);
  if (btn) {
    btn.addEventListener(
      "click",
      async () => await signInWithProvider(curr.provider),
    );
  }
}
