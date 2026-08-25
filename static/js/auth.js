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
} from "./utils.js";

createSetThemeEl();
const EmailInput = document.getElementById("email-input");
const PasswordInput = document.getElementById("password-input");
const logInBtn = document.getElementById("log-in-btn");
const resBtn = document.getElementById("res-btn");

document.addEventListener("DOMContentLoaded", async () => {
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
  for (const curr of btnMap) {
    const btn = document.getElementById(curr.id);
    if (btn) {
      btn.addEventListener(
        "click",
        async () => await signInWithProvider(curr.provider),
      );
    }
  }
});

const btnMap = [
  { id: "google-btn", provider: GoogleAuthProvider },
  { id: "github-btn", provider: GithubAuthProvider },
];
