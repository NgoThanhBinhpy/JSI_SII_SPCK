import {
  auth,
  GoogleAuthProvider,
  GithubAuthProvider,
  sendPasswordResetEmail,
} from "./firebase-config.js";
import {
  initBasicThings,
  showToast,
  showModal,
  login,
  register,
  signInWithProvider,
} from "./utils.js";
const authForm = document.getElementById("auth-form");
const logInBtn = document.getElementById("log-in-btn");
const resBtn = document.getElementById("res-btn");
const resetPasswordBtn = document.getElementById("reset-password");

function validateAuthForm() {
  authForm.classList.add("was-validated");
  return authForm.checkValidity();
}

document.addEventListener("DOMContentLoaded", async () => {
  initBasicThings();
  logInBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!validateAuthForm()) {
      showToast("Please correct the highlighted fields.", "warning");
      return;
    }
    const formData = new FormData(authForm);
    await login(
      String(formData.get("email") ?? "").trim(),
      String(formData.get("password") ?? "").trim(),
    );
  });

  resBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!validateAuthForm()) {
      showToast("Please correct the highlighted fields.", "warning");
      return;
    }
    const formData = new FormData(authForm);
    await register(
      String(formData.get("email") ?? "").trim(),
      String(formData.get("password") ?? "").trim(),
      String(formData.get("displayName") ?? "").trim(),
    );
  });

  for (const curr of btnMap) {
    const btn = document.getElementById(curr.id);
    if (btn) {
      btn.addEventListener(
        "click",
        async () => await signInWithProvider(curr.provider),
      );
    }
  }

  resetPasswordBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const { ModalEl, modal } = showModal(
      `<form id="reset-password-form" class="needs-validation" novalidate>
    <div class="input-group mb-3">
      <span class="input-group-text"
        ><i class="fa-solid fa-at text-secondary"></i
      ></span>
      <div class="form-floating">
        <input
          type="email"
          class="form-control"
          id="email-input"
          name="email"
          placeholder="Email"
          autocomplete="email"
          required
        />
        <label for="email-input">Email</label>
        <div class="invalid-feedback">Please fill in your email in order to reset your password.</div>
      </div>

      <div data-target="#email-input"></div>
    </div>
    <div class="d-flex flex-column gap-2">
      <button type="submit" class="btn btn-primary">
        Send reset password email.
      </button>
    </div>
  </form>
`,
      "Send reset password email.",
    );

    const resetPasswordForm = ModalEl.querySelector("#reset-password-form");

    resetPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      resetPasswordForm.classList.add("was-validated");
      if (!resetPasswordForm.checkValidity()) return;

      const formData = new FormData(resetPasswordForm);
      const trimedEmail = formData.get("email").trim();

      try {
        await sendPasswordResetEmail(auth, trimedEmail);
        showToast(
          "Successfully sent passwrod reset email, please check your email account.",
          "success",
        );
        modal.hide();
      } catch (e) {
        showToast("Error sending password reset email: ", "danger", e);
      }
    });
  });
});

const btnMap = [
  { id: "google-btn", provider: GoogleAuthProvider },
  { id: "github-btn", provider: GithubAuthProvider },
];
