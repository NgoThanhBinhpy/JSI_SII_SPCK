import { auth, signOut } from "../firebase-config.js";
import { createTreeViewer } from "../../../new.js";

/**
 * @param {string} message
 * @param {string} type
 * @param {Error} error
 * @param {number} delay
 */
export function showToast(message, type = "danger", error, delay = 3000) {
  let container = document.querySelector(".toast-container");

  if (!container) {
    container = document.createElement("div");
    container.className =
      "toast-container position-fixed top-0 start-50 translate-middle-x p-3";
    container.style.zIndex = "1056";
    document.body.appendChild(container);
  }

  const toastEl = document.createElement("div");
  toastEl.className = `toast align-items-center text-bg-${type} border-0 my-2`;
  toastEl.setAttribute("role", "alert");
  toastEl.setAttribute("aria-live", "assertive");
  toastEl.setAttribute("aria-atomic", "true");

  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${type === "danger" && error ? message + error.message : message}
      </div>
      <button
        type="button"
        class="btn-close btn-close-white me-2 m-auto"
        data-bs-dismiss="toast"
        aria-label="Close"
      ></button>
    </div>
  `;
  container.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, {
    delay,
    autohide: true,
  });

  toastEl.addEventListener("hidden.bs.toast", () => {
    toastEl.remove();
  });

  toast.show();
  switch (type) {
    case "danger":
      console.groupCollapsed(error ? message + error.message : message);
      if (error) console.error(error);
      else console.error(message);
      console.trace();
      console.groupEnd();
      break;
    case "warning":
      console.groupCollapsed(message);
      console.warn(message);
      console.trace();
      console.groupEnd();
    default:
      console.groupCollapsed(message);
      console.log(message);
      console.trace();
      console.groupEnd();
  }
}

/**
 * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} input
 * @param {boolean} valid
 * @param {string} message
 */
export function setFieldFeedback(input, valid, message = "") {
  if (!input) return false;

  const feedbackContainer =
    input.closest(".input-group, .mb-3, form") || input.parentElement;
  const invalidFeedback = feedbackContainer?.querySelector(".invalid-feedback");
  const validFeedback = feedbackContainer?.querySelector(".valid-feedback");

  input.classList.toggle("is-valid", valid);
  input.classList.toggle("is-invalid", !valid);
  input.setAttribute("aria-invalid", String(!valid));

  if (invalidFeedback) {
    invalidFeedback.textContent = message;
    invalidFeedback.classList.toggle("d-none", valid);
  }
  if (validFeedback) validFeedback.classList.toggle("d-none", !valid);

  return valid;
}

/**
 * @param {string | HTMLElement} modalBody
 * @param {string} modalTitle
 * @param {boolean} htmlElement
 * @returns
 */
export function showModal(modalBody, modalTitle, modalFooter = "") {
  const ModalEl = document.createElement("div");
  ModalEl.className = "modal fade";
  ModalEl.tabIndex = "-1";

  ModalEl.innerHTML = `
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h1 class="modal-title fs-5">${modalTitle}</h1>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body"></div>
        <div class="modal-footer">
          ${modalFooter}
        </div>
      </div>
    </div>
  `;

  const bodyContainer = ModalEl.querySelector(".modal-body");

  // Automatically detect type: DOM Element vs HTML String
  if (modalBody instanceof HTMLElement || modalBody instanceof Node) {
    bodyContainer.appendChild(modalBody);
  } else if (typeof modalBody === "string") {
    bodyContainer.innerHTML = modalBody;
  } else {
    console.error("Invalid modalBody passed to showModal:", modalBody);
    bodyContainer.innerHTML = `<p class="text-danger mb-0">Error: Unable to render modal contents.</p>`;
  }

  document.body.appendChild(ModalEl);

  const modal = new bootstrap.Modal(ModalEl);
  modal.show();

  ModalEl.addEventListener("hidden.bs.modal", () => {
    ModalEl.remove();
  });

  return { ModalEl, modal };
}

/**
 * @param {object} obj
 * @param {string} title
 */
export function viewRawJson(obj, title = "Raw JSON") {
  const rawJsonEl = createTreeViewer(obj);
  showModal(rawJsonEl, title, true);
}

export function getRelativePath(pageName) {
  const splitedPathName = window.location.pathname.split("/");
  const isIndex =
    splitedPathName.every((s) => !s) || splitedPathName.includes("index.html");
  if (pageName.includes("index.html")) {
    return isIndex ? "#" : "../index.html";
  }
  return isIndex ? `./pages/${pageName}` : `./${pageName}`;
}

/**
 * @param {boolean} isAdmin_
 * @param {*} user
 */
export function updateNavbar(isAdmin_, user) {
  const navbar = document.getElementById("navBar");
  console.log(isAdmin_);
  navbar.innerHTML = `
  <li class="nav-item nav-tab">
    <a class="nav-link active" href="${getRelativePath("index.html")}"
      ><i class="bi bi-house"></i> Home</a
    >
  </li>
  ${
    isAdmin_
      ? `
    <li class="nav-item nav-tab">
      <a class="nav-link" href="${getRelativePath("admin.html")}"><i class="bi bi-gear-wide-connected"></i> Admin Panel</a>
    </li>`
      : ""
  }
  ${
    user
      ? `
            <li class="nav-item dropdown ms-auto" id="userNavDropdown">
              <a class="nav-link dropdown-toggle d-flex align-items-center gap-2" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-person-circle fs-5"></i>
                <span id="navUsername">Account</span>
              </a>

              <ul class="dropdown-menu dropdown-menu-end shadow-sm">

                <li>
                  <a class="dropdown-item d-flex align-items-center gap-2" href="${getRelativePath("user.html")}">
                    <i class="bi bi-info-circle"></i> Account Info
                  </a>
                </li>

                <li><hr class="dropdown-divider"></li>

                <li>
                  <button class="dropdown-item text-danger d-flex align-items-center gap-2" id="log-out-btn" type="button">
                    <i class="bi bi-box-arrow-right"></i> Sign Out
                  </button>
                </li>

              </ul>
            </li>

            <li class="nav-item nav-tab">
              <a class="nav-link" href="${getRelativePath("orders.html")}"><i class="bi bi-bag-check"></i> My Orders</a>
            </li>
            <li class="nav-item nav-tab">
              <a class="nav-link position-relative me-3" href="${getRelativePath("cart.html")}">
                <i class="bi bi-cart3 fs-5"></i> Cart
                <span class="text-center badge rounded-pill bg-danger" id="cart-badge">
                  ${JSON.parse(sessionStorage.getItem("CART_KEY") ?? "[]").length}
                </span>
              </a>
            </li>`
      : `<li class="nav-item nav-tab">
              <a class="nav-link" href="${getRelativePath("auth.html")}"><i class="bi bi-box-arrow-in-right me-1"></i> Log In</a>
            </li>`
  }
  `;
  if (user)
    navbar.querySelector("#log-out-btn").addEventListener("click", async () => {
      await signOut(auth);
      sessionStorage.removeItem("CART_KEY");
      updateNavbar(isAdmin_, user);
    });
}

/**
 * @param {object} book
 * @returns {object}
 */
export function calculateBookPrice(book) {
  const pageCount = book.volumeInfo?.pageCount;

  if (pageCount && pageCount > 0) {
    return {
      amount: parseFloat((5 + pageCount * 0.05).toFixed(2)),
      currency: "USD",
    };
  }

  const numericId = parseInt(book.id) || 10;
  return {
    amount: parseFloat((10 + (numericId % 30) + 0.99).toFixed(2)),
    currency: "USD",
  };
}

export function setBootstrapTheme(theme) {
  if (theme === "auto") {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    document.documentElement.setAttribute("data-bs-theme", systemTheme);
    localStorage.setItem("color-scheme-preference", systemTheme);
  } else {
    document.documentElement.setAttribute("data-bs-theme", theme);
    localStorage.setItem("color-scheme-preference", theme);
  }
}

export function createSetThemeEl() {
  const themeDropDown = document.createElement("div");
  themeDropDown.className = "dropup position-fixed bottom-0 start-0 m-3 z-3";
  themeDropDown.innerHTML = `
  <button 
    class="btn btn-bd-primary py-2 px-3 dropdown-toggle d-flex align-items-center shadow rounded-pill bg-body-tertiary border" 
    id="bd-theme" 
    type="button" 
    data-bs-toggle="dropdown" 
    aria-expanded="false" 
    aria-label="Toggle theme">
    <i class="bi bi-circle-half id="theme-icon-active"></i>
  </button>

  <ul class="dropdown-menu shadow" aria-labelledby="bd-theme">
    <li>
      <button type="button" class="dropdown-item d-flex align-items-center" data-theme="light">
        <i class="bi bi-sun-fill me-2"></i> Light
      </button>
    </li>
    <li>
      <button type="button" class="dropdown-item d-flex align-items-center" data-theme="dark">
        <i class="bi bi-moon-stars-fill me-2"></i> Dark
      </button>
    </li>
    <li>
      <button type="button" class="dropdown-item d-flex align-items-center" data-theme="auto">
        <i class="bi bi-circle-half me-2"></i> Auto
      </button>
    </li>
  </ul>`;
  const setThemeIcon = (theme) => {
    var icon = "";
    switch (theme) {
      case "light":
        icon = `<i class="bi bi-sun-fill me-2"></i>`;
        break;
      case "dark":
        icon = `<i class="bi bi-moon-stars-fill me-2"></i>`;
        break;
      case "auto":
        icon = `<i class="bi bi-circle-half me-2"></i>`;
    }
    themeDropDown.querySelector("#bd-theme").innerHTML = icon;
  };
  const localStorage_theme_perferance =
    localStorage.getItem("color-scheme-perferance") ?? "auto";
  setBootstrapTheme(localStorage_theme_perferance);
  setThemeIcon(localStorage_theme_perferance);
  themeDropDown.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme]");
    if (!btn) return;
    const theme = btn.dataset.theme;
    setThemeIcon(theme);
    setBootstrapTheme(theme);
  });
  document.body.appendChild(themeDropDown);
}
