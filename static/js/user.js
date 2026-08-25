import {
  getCurrentUser,
  createSetThemeEl,
  deleteUserAndDoc,
  changeUserPassword,
} from "./utils.js";
import { sendEmailVerification } from "./firebase-config.js";

function renderUserInfo(user) {
  const container = document.getElementById("user-info");
  const isVerified = user.emailVerified;
  const uid = user.uid;
  const isPasswordUser = user.providerData.some(
    (p) => p.providerId === "password",
  );

  const showVerifyBtn = !isVerified && isPasswordUser;
  const providerName = user.providerData[0]?.providerId || "OAuth";

  const statusMsg = isVerified
    ? `<div class="form-text text-success"><i class="bi bi-patch-check-fill me-1"></i>Email verified</div>`
    : isPasswordUser
      ? `<div class="form-text text-warning"><i class="bi bi-exclamation-triangle-fill me-1"></i>Unverified account</div>`
      : `<div class="form-text text-muted"><i class="bi bi-shield-check me-1"></i>Managed via ${providerName}</div>`;

  container.innerHTML = `
    <div class="mb-3">
        <label class="form-label text-muted small fw-semibold">Email Address</label>
        <div class="input-group">
            <input type="email" class="form-control" id="infoUserEmail" value="${user.email || ""}" readonly />
            ${showVerifyBtn ? `<button class="btn btn-outline-warning" type="button" id="send-verify-btn">Verify</button>` : ""}
        </div>
        ${statusMsg}
    </div>
    <div class="mb-3">
        <label class="form-label text-muted small fw-semibold"
            >User ID</label
        >
        <input
        type="text"
        class="form-control"
        id="infoUserId"
        readonly
        placeholder="UID-12345"
        value="${uid}"
        />
    </div>
  `;

  container
    .querySelector("#send-verify-btn")
    ?.addEventListener("click", async () => {
      try {
        await sendEmailVerification(user);
        renderUserInfo();
        showToast("Verification email sent!", "success");
      } catch (err) {
        showToast("Error sending email: ", "danger", err);
      }
    });
}

function initializeActions(user) {
  const deleteAccountBtn = document.getElementById("btnDeleteAccount");
  const changePasswordBtn = document.getElementById("btnChangePassword");
  deleteAccountBtn.addEventListener("click", async () => {
    await deleteUserAndDoc(user);
  });
  changePasswordBtn.addEventListener("click", async () => {
    await changeUserPassword(user);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  createSetThemeEl();
  const user = await getCurrentUser();
  renderUserInfo(user);
  initializeActions(user);
});
