import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signInWithPopup,
  linkWithCredential,
  GoogleAuthProvider,
  GithubAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  deleteUser,
  updatePassword,
  updateEmail,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "../firebase-config.js";
import { showToast, showModal } from "./ui-utils.js";

export async function deleteUserAndDoc(user) {
  try {
    const authenticated = await OpenReauthModal(user);
    if (!authenticated) return;
    await deleteDoc(doc(db, "users", user.uid));
    await deleteUser(user);
    redirectAfterDelay();
  } catch (e) {
    showToast("Error deleting user: ", "danger", e);
  }
}

export const AUTH_ERROR_MESSAGES = {
  "auth/requires-recent-login":
    "This operation is sensitive and requires a fresh login.",
  "auth/user-mismatch":
    "The credentials provided do not match the current logged-in user.",
  "auth/wrong-password": "The password you entered is incorrect.",
  "auth/too-many-requests": "Too many failed attempts. Please try again later.",
  "auth/user-disabled": "This user account has been disabled.",
  "auth/user-not-found": "No user account found matching these credentials.",
  "auth/email-already-exists":
    "This email is already registered to another account.",
  "auth/invalid-credential": "Invalid credentials provided.",
  "auth/invalid-email": "The email address is improperly formatted.",
  "auth/weak-password": "Password is too weak. Choose a stronger password.",
};

const redirectAfterDelay = (url = "../index.html", delayMs = 1500) => {
  setTimeout(() => {
    window.location.href = url;
  }, delayMs);
};

export function showAuthErrorToast(err) {
  const mappedMessage = AUTH_ERROR_MESSAGES[err.message];
  if (mappedMessage) showToast(mappedMessage, "warning");
  else showToast("Error authenticating: ", "danger", err);
}

export async function login(email, password) {
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
    showAuthErrorToast(error);
  }
}

export async function register(email, password) {
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
    showAuthErrorToast(e);
  }
}

export async function signInWithProvider(providerClass) {
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
      } else {
        try {
          console.log(pendingCredential);
          await openLinkAccountModal(error.customData.email, pendingCredential);
        } catch (e) {
          showToast("Error linking provider: ", "danger", e);
        }
      }
    } else showAuthErrorToast(error);
  }
}

/**
 * @returns {*}
 */
export async function getCurrentUser() {
  console.log("currUser called");
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        console.log(user);
        resolve(user);
      },
      reject,
    );
  });
}

export async function openLinkAccountModal(email, pendingCred) {
  const modalContainer = document.createElement("div");
  const providerId = pendingCred.providerId;

  modalContainer.innerHTML = `
  <div class="text-center mb-4">
    <div class="d-inline-flex align-items-center justify-content-center bg-warning-subtle text-warning-emphasis rounded-circle mb-3" style="width: 56px; height: 56px;">
      <i class="bi bi-link-45deg fs-2"></i>
    </div>
    <h5 class="fw-bold mb-1">Account Already Exists</h5>
    <p class="small text-body-secondary mb-0">
      An account already exists under <strong class="text-body">${email}</strong>. Sign in using your existing method below to link this provider.
    </p>
  </div>

  ${
    providerId !== "password"
      ? `<form onsubmit="return false;" data-provider="password" class="auth-option-block mb-3">
          <label for="modalAuthPassword" class="form-label text-body-secondary small fw-semibold">Sign in with Password</label>
          <div class="input-group mb-2">
            <span class="input-group-text bg-body-tertiary text-body-secondary border-secondary-subtle">
              <i class="bi bi-key-fill"></i>
            </span>
            <input type="password" id="modalAuthPassword" class="form-control bg-body text-body border-secondary-subtle" placeholder="Enter existing password" required autocomplete="current-password" />
            <button class="btn btn-primary fw-semibold" type="button" id="submitPasswordBtn">
              Sign In & Link
            </button>
          </div>
        </form>`
      : ""
  }

  ${
    providerId !== "password" &&
    (providerId !== "google.com" || providerId !== "github.com")
      ? `<div class="position-relative text-center my-4">
          <hr class="border-secondary-subtle opacity-50 m-0" />
          <span class="position-absolute top-50 start-50 translate-middle bg-body px-3 text-body-secondary small fw-medium">
            OR LINK WITH PROVIDER
          </span>
        </div>`
      : ""
  }

  <div class="d-grid gap-2">
    ${
      providerId !== "google.com"
        ? `<button type="button" data-provider="google.com" class="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2 py-2 auth-provider-btn">
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" width="18" height="18" alt="Google" />
            <span class="fw-medium">Sign in with Google to Link</span>
          </button>`
        : ""
    }

    ${
      providerId !== "github.com"
        ? `<button type="button" data-provider="github.com" class="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2 py-2 auth-provider-btn">
            <i class="bi bi-github fs-5 text-body"></i>
            <span class="fw-medium">Sign in with GitHub to Link</span>
          </button>`
        : ""
    }
  </div>
`;
  const passwordBtn = modalContainer.querySelector("#submitPasswordBtn");
  if (passwordBtn) {
    passwordBtn.addEventListener("click", async () => {
      const password =
        modalContainer.querySelector("#modalAuthPassword")?.value;
      if (!password) return;

      try {
        const userCred = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await linkWithCredential(userCred.user, pendingCred);
        showToast("Successfully linked account!", "success");
        modal.hide();
      } catch (err) {
        showToast(`Authentication failed: ${err.message}`, "danger");
      }
    });
  }
  modalContainer.querySelectorAll(".auth-provider-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const providerId = e.currentTarget.getAttribute("data-provider");
      let oauthProvider;

      if (providerId === "google.com") oauthProvider = new GoogleAuthProvider();
      if (providerId === "github.com") oauthProvider = new GithubAuthProvider();

      if (oauthProvider) {
        try {
          const result = await signInWithPopup(auth, oauthProvider);
          await linkWithCredential(result.user, pendingCred);
          showToast("Successfully linked accounts!", "success");
          modal.hide();
        } catch (err) {
          showToast(`Linking failed: ${err.message}`, "danger");
        }
      }
    });
  });
  const { modal } = showModal(
    modalContainer,
    "Verify Existing Account",
    true,
    "modal-dialog-centered",
  );
}

export function OpenReauthModal(user) {
  return new Promise((resolve) => {
    const email = user.email;
    const modalBodyEl = document.createElement("div");

    modalBodyEl.innerHTML = `
      <h5 class="mb-3">Please re-authenticate to continue.</h5>
      <div class="input-group mb-3">
        <span class="input-group-text"><i class="bi bi-envelope"></i></span>
        <input type="email" class="form-control" id="email-input" value="${email}" readonly />
  </div>

      <div class="input-group mb-3">
        <span class="input-group-text"><i class="bi bi-key"></i></span>
        <input type="password" class="form-control" id="password-input" placeholder="Password" />
    </div>

      <button class="btn btn-primary w-100 mb-3" id="re-auth-btn">
        Re-authenticate
    </button>

      <div class="text-center text-muted small my-2">-- OR --</div>

  <div class="d-flex gap-2 justify-content-center">
        <button class="btn btn-link text-decoration-none w-50" id="google-btn"><i class="bi bi-google me-1"></i> Google</button>
        <button class="btn btn-link text-decoration-none w-50" id="github-btn"><i class="bi bi-github me-1"></i> GitHub</button>
      </div>`;

    const PasswordInput = modalBodyEl.querySelector("#password-input");

    const { ModalEl, modal } = showModal(
      modalBodyEl,
      "Authentication Required",
      true,
    );

    let isAuthenticated = false;

    modalBodyEl.addEventListener("click", async (e) => {
      const re_auth_btn = e.target.closest("#re-auth-btn");
      const google_btn = e.target.closest("#google-btn");
      const github_btn = e.target.closest("#github-btn");

      if (!re_auth_btn && !google_btn && !github_btn) return;
      e.preventDefault();

      try {
        if (re_auth_btn) {
          const password = PasswordInput.value.trim();
          if (!password) {
            showToast("Please enter your password", "warning");
            return;
          }
          const credential = EmailAuthProvider.credential(email, password);
          await reauthenticateWithCredential(user, credential);
        } else {
          var provider;
          if (google_btn) provider = new GoogleAuthProvider();
          if (github_btn) provider = new GithubAuthProvider();
          if (provider) await reauthenticateWithPopup(user, provider);
        }

        isAuthenticated = true;
        showToast("Successfully re-authenticated", "success");
        modal.hide();
      } catch (err) {
        showToast("Re-authentication failed", "danger", err);
      }
    });
    ModalEl.addEventListener("hidden.bs.modal", () => {
      resolve(isAuthenticated);
    });
  });
}

export async function changeUserPassword(user) {
  try {
    const authenticated = await OpenReauthModal(user);
    if (!authenticated) return;
    const { ModalEl, modal } = showModal(`<div class="card shadow-sm mb-4">
  <div class="card-header bg-body-tertiary fw-bold">Change Password</div>
  <div class="card-body">
    <form id="change-password-form">
      <div class="mb-3">
        <label for="new-password" class="form-label text-muted small fw-semibold">New Password</label>
        <div class="input-group">
          <span class="input-group-text"><i class="bi bi-lock"></i></span>
          <input type="password" class="form-control" id="new-password" placeholder="Enter new password" required />
        </div>
      </div>
      <div class="mb-3">
        <label for="confirm-password" class="form-label text-muted small fw-semibold">Confirm New Password</label>
        <div class="input-group">
          <span class="input-group-text"><i class="bi bi-lock-fill"></i></span>
          <input type="password" class="form-control" id="confirm-password" placeholder="Confirm new password" required />
        </div>
      </div>

      <button type="submit" class="btn btn-primary" id="update-pass-btn">
        <i class="bi bi-shield-lock me-1"></i> Update Password
      </button>
    </form>
  </div>
</div>`);
    ModalEl.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById("new-password").value.trim();
      const confirmPassword = document
        .getElementById("confirm-password")
        .value.trim();
      if (!newPassword || !confirmPassword) {
        showToast("Please fill in all the fields", "waring");
      }
      if (confirmPassword != newPassword) {
        showToast("New passwords do not matched", "warning");
      }
      try {
        await updatePassword(user, newPassword).then(() => {
          modal.hide();
        });
        showToast("Successfully updated password", "success");
      } catch (e) {
        showToast("Error updating password: ", "danger", e);
      }
    });
  } catch (e) {
    showToast("Error changing password: ", "danger", e);
  }
}
