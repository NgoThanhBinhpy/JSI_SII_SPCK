import {
  auth,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "./firebase-config.js";
import {
  showToast,
  createSetThemeEl,
  login,
  register,
  signInWithProvider,
  setFieldFeedback,
} from "./utils.js";

createSetThemeEl();
const EmailInput = document.getElementById("email-input");
const PasswordInput = document.getElementById("password-input");
const logInBtn = document.getElementById("log-in-btn");
const resBtn = document.getElementById("res-btn");

function validateCredentials() {
  const email = EmailInput.value.trim();
  const password = PasswordInput.value.trim();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;

  setFieldFeedback(
    EmailInput,
    emailValid,
    email ? "Enter a valid email address." : "Email is required.",
  );
  setFieldFeedback(
    PasswordInput,
    passwordValid,
    password
      ? "Password must be at least 6 characters."
      : "Password is required.",
  );

  return emailValid && passwordValid;
}

document.addEventListener("DOMContentLoaded", async () => {
  logInBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!validateCredentials()) {
      showToast("Please correct the highlighted fields.", "warning");
      return;
    }
    await login(EmailInput.value.trim(), PasswordInput.value.trim());
  });

  resBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!validateCredentials()) {
      showToast("Please correct the highlighted fields.", "warning");
      return;
    }
    await register(EmailInput.value.trim(), PasswordInput.value.trim());
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

  EmailInput.addEventListener("input", validateCredentials);
  PasswordInput.addEventListener("input", validateCredentials);
});

const btnMap = [
  { id: "google-btn", provider: GoogleAuthProvider },
  { id: "github-btn", provider: GithubAuthProvider },
];
