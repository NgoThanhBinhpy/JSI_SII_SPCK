import {
  createSetThemeEl,
  deleteUserAndDoc,
  changeUserPassword,
  updateNavbar,
  getUserRole,
  getCurrentUser,
  showToast,
} from "./utils.js";
import { auth, sendEmailVerification, signOut } from "./firebase-config.js";

const providerIconMap = {
  "google.com": `<img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" width="24" height="24" title="Connected via google.com" alt="google.com">`,
  "github.com": `<img src="https://cdn.simpleicons.org/github" width="24" height="24" title="Connected via google.com" alt="google.com">`,
  password: `<i class="bi bi-envelope-at-fill" width="24" height="24" title="Connected via password & email"></i>`,
};

function generateSkeletonInfoCard() {
  const container = document.getElementById("user-info");
  container.innerHTML = `<div class="card bg-body text-body border-secondary-subtle placeholder-wave m-3 mx-auto" style="max-width: 500px;box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) !important;"> <div class="card-body text-center pb-3"> <div class="position-relative d-inline-block mb-3"> <div class="placeholder rounded-circle border border-secondary-subtle" style="width: 100px; height: 100px; display: inline-block;" ></div> </div> <div class="mb-2"> <span class="placeholder col-6 rounded py-2"></span> </div> <div class="mb-3"> <span class="placeholder col-4 rounded small"></span> </div> <div> <span class="placeholder col-3 rounded-pill py-2"></span> </div> </div> <hr class="border-secondary-subtle my-0" /> <div class="card-body"> <h6 class="text-uppercase text-body-secondary small fw-bold mb-3"> <span class="placeholder col-4 rounded"></span> </h6> <div class="d-flex justify-content-between align-items-center mb-3"> <span class="placeholder col-3 rounded"></span> <span class="placeholder col-5 rounded py-2 bg-body-tertiary"></span> </div> <div class="d-flex justify-content-between align-items-center mb-3"> <span class="placeholder col-4 rounded"></span> <span class="placeholder col-3 rounded py-2"></span> </div> <div class="d-flex justify-content-between align-items-center mb-3"> <span class="placeholder col-3 rounded"></span> <span class="placeholder col-3 rounded"></span> </div> <h6 class="text-uppercase text-body-secondary small fw-bold mb-3 mt-4"> <span class="placeholder col-5 rounded"></span> </h6> <div class="d-flex gap-3 align-items-center"> <span class="placeholder rounded-circle" style="width: 24px; height: 24px;"></span> <span class="placeholder rounded-circle" style="width: 24px; height: 24px;"></span> </div> </div> <div class="card-footer bg-body-tertiary border-secondary-subtle text-end py-3"> <span class="placeholder col-3 btn btn-sm disabled me-2"></span> <span class="placeholder col-3 btn btn-sm disabled"></span> </div> </div>`;
}

function renderUserInfo(user, role = "customer") {
  const container = document.getElementById("user-info");
  if (!container || !user) return;

  const isVerified = user.emailVerified;
  const isPasswordUser = user.providerData.some(
    (p) => p.providerId === "password",
  );
  const showVerifyBtn = !isVerified && isPasswordUser;
  const isDarkMode =
    document.documentElement.getAttribute("data-bs-theme") === "dark" ||
    document.body.classList.contains("dark-mode");

  container.innerHTML = `
    <div class="card bg-body text-body border-secondary-subtle m-3 mx-auto" style="max-width: 500px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) !important;">
      <div class="card-body text-center pb-3">
        <div class="position-relative d-inline-block mb-3">
          <img 
            id="user-photo" 
            src="${user.photoURL || "https://via.placeholder.com/100"}" 
            alt="Profile Photo" 
            class="rounded-circle img-thumbnail border-secondary-subtle"
            style="width: 100px; height: 100px; object-fit: cover;"
          />
        </div>
        
        <h4 id="user-display-name" class="fw-bold mb-1">${user.displayName || "Anonymous User"}</h4>
        <p id="user-email-text" class="text-body-secondary small mb-2">${user.email || "No Email"}</p>
        
        <span id="user-role-badge" class="badge bg-primary text-capitalize px-3 py-2">
          ${role}
        </span>
      </div>

      <hr class="border-secondary-subtle my-0" />

      <div class="card-body">
        <h6 class="text-uppercase text-body-secondary small fw-bold mb-3">Account Information</h6>
        
        <div class="d-flex justify-content-between align-items-center mb-3">
          <span class="text-body-secondary">User ID</span>
          <code id="infoUserId" class="bg-body-tertiary text-body px-2 py-1 rounded border border-secondary-subtle font-monospace">${user.uid}</code>
        </div>

        <div class="d-flex justify-content-between align-items-center mb-3">
          <span class="text-body-secondary">Email Status</span>
          <div class="d-flex align-items-center gap-2">
            <span id="user-email-verified" class="badge ${isVerified ? "bg-success" : "bg-warning text-dark"}">
              ${isVerified ? "Verified" : "Unverified"}
            </span>
            ${showVerifyBtn ? `<button class="btn btn-sm btn-outline-warning" type="button" id="send-verify-btn">Verify</button>` : ""}
          </div>
        </div>

        <div class="d-flex justify-content-between align-items-center mb-3">
          <span class="text-body-secondary">Joined Date</span>
          <small id="user-created-at" class="text-body">
            ${user.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "N/A"}
          </small>
        </div>

        <h6 class="text-uppercase text-body-secondary small fw-bold mb-3 mt-4">Connected Providers</h6>
        
        <div id="user-provider-icons" class="d-flex gap-3 align-items-center">
          ${user.providerData
            .map((provider) => providerIconMap[provider.providerId])
            .join("")}
        </div>
      </div>

      <div class="card-footer bg-body-tertiary border-secondary-subtle text-end py-3">
        <button id="btn-edit-profile" class="btn btn-outline-secondary btn-sm me-2">Edit Profile</button>
        <button id="btn-logout" class="btn btn-danger btn-sm">Sign Out</button>
      </div>
    </div>
  `;

  container.addEventListener("click", async (e) => {
    const verifyBtn = e.target.closest("#send-verify-btn");
    const logoutBtn = e.target.closest("#btn-logout");
    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.textContent = "Sending...";

      try {
        await sendEmailVerification(user);
        showToast("Verification email sent!", "success");
        renderUserInfo(user, role);
      } catch (err) {
        console.error("Verification email error:", err);
        showToast(`Error sending email: ${err.message || err}`, "danger");
        verifyBtn.disabled = false;
        verifyBtn.textContent = "Verify";
      }
      return;
    } else if (logoutBtn) {
      try {
        await signOut(auth);
        showToast("Successfully sign out", "success");
        window.location.href = "../index.html";
      } catch (e) {
        showToast("Error Signing out: ", "danger", e);
      }
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
  generateSkeletonInfoCard();
  const user = await getCurrentUser();
  if (!user) window.location.href = "../index.html";
  initializeActions(user);
  const roleId = await getUserRole(user);
  const isAdmin_ = roleId === "admin";
  renderUserInfo(user, roleId);
  updateNavbar(isAdmin_, user);
});
