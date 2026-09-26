import {
  initBasicThings,
  deleteUserAndDoc,
  changeUserPassword,
  updateNavbar,
  getUserRole,
  getCurrentUser,
  showToast,
  showModal,
} from "./utils.js";
import {
  auth,
  sendEmailVerification,
  signOut,
  updateProfile,
} from "./firebase-config.js";

const providerIconMap = {
  "google.com": `<img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" width="24" height="24" title="Connected via google.com" alt="google.com">`,
  "github.com": `<img src="https://cdn.simpleicons.org/github" width="24" height="24" title="Connected via google.com" alt="google.com">`,
  password: `<i class="bi bi-envelope-at-fill" width="24" height="24" title="Connected via password & email"></i>`,
};

function generateSkeletonInfoCard() {
  const container = document.getElementById("user-info");
  container.innerHTML = `<div class="card bg-body text-body border-secondary-subtle placeholder-wave m-3 mx-auto" style="max-width: 500px;box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) !important;"> <div class="card-body text-center pb-3"> <div class="position-relative d-inline-block mb-3"> <div class="placeholder rounded-circle border border-secondary-subtle" style="width: 100px; height: 100px; display: inline-block;" ></div> </div> <div class="mb-2"> <span class="placeholder col-6 rounded py-2"></span> </div> <div class="mb-3"> <span class="placeholder col-4 rounded small"></span> </div> <div> <span class="placeholder col-3 rounded-pill py-2"></span> </div> </div> <hr class="border-secondary-subtle my-0" /> <div class="card-body"> <h6 class="text-uppercase text-body-secondary small fw-bold mb-3"> <span class="placeholder col-4 rounded"></span> </h6> <div class="d-flex justify-content-between align-items-center mb-3"> <span class="placeholder col-3 rounded"></span> <span class="placeholder col-5 rounded py-2 bg-body-tertiary"></span> </div> <div class="d-flex justify-content-between align-items-center mb-3"> <span class="placeholder col-4 rounded"></span> <span class="placeholder col-3 rounded py-2"></span> </div> <div class="d-flex justify-content-between align-items-center mb-3"> <span class="placeholder col-3 rounded"></span> <span class="placeholder col-3 rounded"></span> </div> <h6 class="text-uppercase text-body-secondary small fw-bold mb-3 mt-4"> <span class="placeholder col-5 rounded"></span> </h6> <div class="d-flex gap-3 align-items-center"> <span class="placeholder rounded-circle" style="width: 24px; height: 24px;"></span> <span class="placeholder rounded-circle" style="width: 24px; height: 24px;"></span> </div> </div> <div class="card-footer bg-body-tertiary border-secondary-subtle text-end py-3"> <span class="placeholder col-3 btn btn-sm disabled me-2"></span> <span class="placeholder col-3 btn btn-sm disabled"></span> </div> </div>`;
}

function getAvatarColor(value) {
  const colors = [
    "4285F4", // blue
    "34A853", // green
    "FBBC04", // yellow
    "EA4335", // red
    "A142F4", // purple
    "00ACC1", // cyan
    "FF7043", // orange
    "5C6BC0", // indigo
    "26A69A", // teal
    "EC407A", // pink
  ];

  let hash = 0;

  for (const char of value) {
    hash = (hash << 5) - hash + char.codePointAt(0);
    hash |= 0;
  }

  return colors[Math.abs(hash) % colors.length];
}

function renderUserInfo(user, role = "customer") {
  const container = document.getElementById("user-info");
  if (!container || !user) return;

  const isVerified = user.emailVerified;
  const isPasswordUser = user.providerData.some(
    (p) => p.providerId === "password",
  );
  const showVerifyBtn = !isVerified && isPasswordUser;

  container.innerHTML = `
    <div class="card bg-body text-body border-secondary-subtle m-3 mx-auto" style="max-width: 500px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) !important;">
      <div class="card-body text-center pb-3">
        <div class="position-relative d-inline-block mb-3">
          <img 
            id="user-photo" 
            src="${user.photoURL || `https://placehold.co/100x100/${getAvatarColor(user.displayName ?? user.email)}/000000?text=${(user.displayName ?? user.email)[0].toUpperCase()}`}" 
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
            ${showVerifyBtn ? `<button class="btn btn-sm btn-outline-warning" data-action type="button" data-tool="send-verify-email">Verify</button>` : ""}
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
        <button data-action data-tool="edit-profile" class="btn btn-outline-secondary btn-sm me-2">Edit Profile</button>
        <button data-action data-tool="sign-out" class="btn btn-danger btn-sm">Sign Out</button>
      </div>
    </div>
  `;
  console.log(
    `https://placehold.co/100x100/${getAvatarColor(user.displayName ?? user.email)}/000000?text=${(user.displayName ?? user.email)[0].toUpperCase()}`,
  );
  container.addEventListener("click", async (e) => {
    const actionBtn = e.target.closest("[data-action]");
    if (!actionBtn) return;

    const action = actionBtn.dataset.tool;

    switch (action) {
      case "send-verify-email": {
        actionBtn.disabled = true;
        actionBtn.textContent = "Sending...";

        try {
          await sendEmailVerification(user);
          showToast("Verification email sent!", "success");
          renderUserInfo(user, role);
        } catch (err) {
          console.error("Verification email error:", err);
          showToast(`Error sending email: ${err.message || err}`, "danger");
          actionBtn.disabled = false;
          verifyBtn.textContent = "Verify";
        }
        break;
      }
      case "sign-out": {
        try {
          await signOut(auth);
          showToast("Successfully sign out", "success");
          window.location.href = "./auth.html";
        } catch (e) {
          showToast("Error Signing out: ", "danger", e);
        }
        break;
      }
      case "edit-profile": {
        try {
          const { ModalEl, modal } = showModal(
            `<form id="edit-profile-form" class="needs-validation" novalidate>
            <div class="mb-3">
              <label for="display-name" class="form-label">
                <i class="fa-solid fa-user me-1"></i> Display Name
              </label>
              <input
                type="text"
                class="form-control"
                id="display-name"
                name="displayName"
                placeholder="Enter your display name"
                autocomplete="name"
                value="${user.displayName ?? ""}"
                maxlength="50"
                pattern="(?=.*[\\p{L}\\p{N}])[\\p{L}\\p{M}\\p{N}\\p{Zs}'-]+"
                required
              />
              <div class="invalid-feedback">Enter a valid display name.</div>
            </div>
            <div class="mb-3">
              <label for="photo-url" class="form-label">
                <i class="fa-solid fa-image me-1"></i> Profile Photo URL
              </label>
              <input
                type="url"
                class="form-control"
                id="photo-url"
                name="photoURL"
                value="${user.photoURL ?? ""}"
                placeholder="https://example.com/photo.jpg"
                required
              />
              <div class="invalid-feedback">Enter a valid photo URL.</div>
            </div>
            <div class="d-flex flex-column gap-2">
              <button type="submit" class="btn btn-primary">Edit profile.</button>
            </div>
          </form>`,
            "Edit profile",
          );

          const editProfileForm = ModalEl.querySelector("#edit-profile-form");
          editProfileForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            editProfileForm.classList.add("was-validated");
            if (!editProfileForm.checkValidity()) return;

            const formData = new FormData(editProfileForm);
            const displayNameValue = formData.get("displayName").trim();
            const photoURLValue = formData.get("photoURL").trim();

            await updateProfile(user, {
              displayName: displayNameValue,
              photoURL: photoURLValue,
            });

            showToast("Successfully edited profile!", "success");
            window.location.reload();
            return;
          });
        } catch (e) {
          showToast("Error editing profile: ", "danger", e);
        }
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
  initBasicThings();
  generateSkeletonInfoCard();
  const user = await getCurrentUser();
  if (!user) window.location.href = "../index.html";
  initializeActions(user);
  const roleId = await getUserRole(user);
  const isAdmin_ = roleId === "admin";
  renderUserInfo(user, roleId);
  updateNavbar(isAdmin_, user);
});
