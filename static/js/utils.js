import {
  doc,
  db,
  auth,
  getDoc,
  onAuthStateChanged,
  signOut,
  serverTimestamp,
  GoogleAuthProvider,
  GithubAuthProvider,
  collection,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  linkWithCredential,
  updateDoc,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  deleteUser,
  updatePassword,
} from "./firebase-config.js";
import { createTreeViewer } from "../../new.js";

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
          await openLinkAccountModal(
            pendingCredential.email,
            pendingCredential,
            providerClass,
          );
        } catch (e) {
          showToast("Error linking provider: ", "danger", e);
        }
      }
    } else showAuthErrorToast(error);
  }
}

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
    case "info":
    case "success":
      console.log(message);
      break;
    case "danger":
      if (error) console.error(error);
      break;
    case "warning":
      console.warn(message);
  }
}

/**
 * @param {string | HTMLElement} modalBody
 * @param {string} modalTitle
 * @param {boolean} htmlElement
 * @returns
 */
export function showModal(
  modalBody,
  modalTitle,
  htmlElement = false,
  externalClasses = "",
) {
  const ModalEl = document.createElement("div");
  if (!htmlElement)
    ModalEl.innerHTML = `<div class="modal-dialog modal-lg ${externalClasses}">
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title fs-5" id="exampleModalLabel">${modalTitle}</h1>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        ${modalBody}
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
      </div>
    </div>
  </div>`;
  else {
    ModalEl.innerHTML = `<div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title fs-5" id="exampleModalLabel">${modalTitle}</h1>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
      </div>
    </div>
  </div>`;
    ModalEl.querySelector(".modal-body").appendChild(modalBody);
  }
  ModalEl.className = "modal fade";
  ModalEl.tabIndex = "-1";
  document.body.appendChild(ModalEl);

  const modal = new bootstrap.Modal(ModalEl);
  modal.show();

  ModalEl.addEventListener("hidden.bs.modal", () => {
    ModalEl.remove();
  });

  return { ModalEl, modal };
}

export async function renderQueryResult(docRef, container, renderFunction) {
  container.innerHTML = `<div class="d-flex flex-column align-items-center justify-content-center py-5 position-relative" style="flex: 0 0 100%; width: 100%;">
  <div class="spinner-border text-primary position-relative z-1 mb-3" style="width: 3.5rem; height: 3.5rem;" role="status">
    <span class="visually-hidden">Loading...</span>
  </div>

</div>`;
  const querySnapshot = await getDocs(docRef);
  const sortedDocs = querySnapshot.docs.sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true }),
  );
  console.log(sortedDocs);
  container.innerHTML = "";
  for (const docSnap of sortedDocs) {
    const cardEl = renderFunction(docSnap);
    container.appendChild(cardEl);
  }
  return sortedDocs;
}

/**
 * @param {HTMLElement} parentEl
 * @param {object} obj
 * @param {string} title
 */
export function viewRawJsonEveLis(parentEl, obj, title = "Raw JSON") {
  parentEl
    .querySelector('[data-tool="view-raw-json"]')
    .addEventListener("click", () => {
      const rawJsonEl = createTreeViewer(obj);
      showModal(rawJsonEl, title, true);
    });
}

/**
 * @param {string} delOrCancel
 */
export function deleteDocEveLis(delOrCancel = "delete") {
  document.body.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest('[data-tool="delete"]');
    if (!deleteBtn) return;
    console.log(deleteBtn);
    const { ModalEl, modal } = showModal(
      `
          <div>
            <h6>This action can not be undone!</h6>
            <a class="btn btn-danger confirm-delete-btn" data-bs-dismiss="modal">${delOrCancel[0].toUpperCase() + delOrCancel.slice(1)} this?</a>
          </div>
          `,
      `<div class="fs-5">Confirm ${delOrCancel}?</div>`,
      false,
      "modal-dialog-centered",
    );
    ModalEl.querySelector(".confirm-delete-btn").addEventListener(
      "click",
      async () => {
        try {
          await deleteDoc(
            doc(db, e.target.dataset.collection, e.target.dataset.uid),
          );
          showToast("Successfully deleted document!", "success");
          document
            .querySelector(`[data-parent-id="${deleteBtn.dataset.uid}"]`)
            .remove();
        } catch (e) {
          showToast("Error deleting document: ", "danger", e);
        }
      },
    );
  });
}

/**
 * @param {HTMLElement} parentEl
 * @param {Function} renderFunc
 */
export function editJsonEveLis(parentEl, docSnap, renderFunc) {
  const editBtn = parentEl.querySelector('[data-tool="edit-json"]');
  if (!editBtn) return;

  const data = docSnap.data();
  const id = docSnap.id;
  editBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const editorContainer = document.createElement("div");
    delete data.createdAt;
    const jsonString = JSON.stringify(data, null, 2);

    editorContainer.innerHTML = `
      <div class="mb-3">
        <label class="form-label text-muted small fw-bold">Document Payload (JSON Format)</label>
        <textarea 
          class="form-control font-monospace text-bg-dark text-light p-3 rounded" 
          id="json-editor-textarea" 
          rows="14" 
          spellcheck="false"
          style="font-size: 0.875rem; resize: vertical;"
        >${jsonString}</textarea>
        <div id="json-error-msg" class="invalid-feedback d-none mt-2">
          Invalid JSON format. Please check syntax before saving.
        </div>
      </div>
      <div class="d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-warning fw-semibold" id="save-json-btn">
          <i class="bi bi-check-lg me-1"></i>Save Changes
        </button>
      </div>
    `;

    const textarea = editorContainer.querySelector("#json-editor-textarea");
    const saveBtn = editorContainer.querySelector("#save-json-btn");
    const errorMsg = editorContainer.querySelector("#json-error-msg");

    textarea.addEventListener("input", () => {
      try {
        JSON.parse(textarea.value);
        textarea.classList.remove("is-invalid");
        errorMsg.classList.add("d-none");
        saveBtn.disabled = false;
      } catch (err) {
        textarea.classList.add("is-invalid");
        errorMsg.classList.remove("d-none");
        saveBtn.disabled = true;
      }
    });

    const { ModalEl, modal } = showModal(
      editorContainer,
      `Edit JSON: ${editBtn.dataset.uid}`,
      true,
    );

    saveBtn.addEventListener("click", async () => {
      try {
        const updatedData = JSON.parse(textarea.value);
        await setDoc(
          doc(db, editBtn.dataset.collection, editBtn.dataset.uid),
          {
            ...updatedData,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        showToast("Successfully updated document JSON!", "success");
        modal.hide();
        const localSnap = {
          id: id,
          data: () => updatedData,
        };
        parentEl.replaceWith(renderFunc(localSnap));
      } catch (err) {
        showToast("Error updating JSON document: ", "danger", err);
      }
    });
  });
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

export async function getUserRole(user) {
  const userData = await getDoc(doc(db, "users", user.uid));
  console.log(userData, userData.data());
  if (userData.exists()) {
    return userData.data()?.roleId;
  }
  return null;
}

/**
 * @param {boolean} getUser
 * @returns
 */
export async function isAdmin(user = null) {
  console.log("isAdmin called");
  if (!user) user = await getCurrentUser();
  if (!user) {
    return false;
  }
  const roleId = await getUserRole(user);
  const isAdmin_ = roleId === "admin";
  return isAdmin_;
}

function getRelativePath(pageName) {
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
 * @param {object} product
 * @param {*} user
 * @param {number} quantity
 * @returns {string}
 */
export async function createOrder(product, user, quantity = 1) {
  try {
    const newOrderRef = doc(collection(db, "orders"));
    const title = product.volumeInfo?.title || "Untitled",
      unitPrice = product.computedPrice,
      infoLink = product.volumeInfo?.infoLink || "",
      rawImageLink =
        product.volumeInfo?.imageLinks?.thumbnail ||
        product.volumeInfo?.imageLinks?.smallThumbnail ||
        "",
      shippingFee = 3.0;
    const coverUrl = rawImageLink
      ? `${rawImageLink}&fife=w800-h1000`
      : `https://books.google.com/books/publisher/content/images/frontcover/${product.id}?fife=w800-h1000&source=gbs_api`;

    const order = {
      customer: {
        uid: user.uid,
        displayName: user.displayName || "Customer",
        email: user.email,
      },
      item: {
        productId: product.id,
        title: title,
        coverUrl: coverUrl,
        infoLink: infoLink,
      },
      quantity: quantity,
      pricing: {
        shippingFee: shippingFee,
        unitPrice: unitPrice,
        totalAmount: unitPrice.amount * quantity + shippingFee || NaN,
      },
      status: "processing",
      paymentStatus: "paid",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(newOrderRef, order);
    showToast("Successfully created an order", "success");
  } catch (e) {
    showToast("Error creating order", "danger", e);
  }
  return newOrderRef.id;
}

/**
 * @param {*} bookData
 */
export function addToCart(bookData, cardQtyBadge = null) {
  var cartArr = JSON.parse(sessionStorage.getItem("CART_KEY") ?? "[]");
  if (cartArr.find((c) => c.id === bookData.id)) {
    showToast("This product is already in cart", "info");
    return;
  }
  cartArr.push(bookData);
  sessionStorage.setItem("CART_KEY", JSON.stringify(cartArr));
  showToast("Successfully add product to cart", "success");
  if (cardQtyBadge) {
    cardQtyBadge.innerHTML = JSON.parse(
      sessionStorage.getItem("CART_KEY") ?? "[]",
    ).length;
  }
}

export function removeFromCart(id) {
  var cartArr = JSON.parse(sessionStorage.getItem("CART_KEY") ?? "[]");
  const bookId = cartArr.findIndex((c) => c.id === id);
  if (!bookId) {
    showToast("Cant found book index in cart", "warning");
    return;
  }
  cartArr.splice(bookId, 1);
  sessionStorage.setItem("CART_KEY", JSON.stringify(cartArr));
  showToast("Successfully remove product from cart", "success");
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

/**
 * @param {number} count
 */
export async function addItems(count = 10) {
  try {
    const response = await fetch(
      `https://api.freeapi.app/api/v1/public/books?page=1&limit=${count}`,
    );

    if (!response.ok) {
      showToast("HTTP error! Status: ", "danger", new Error(response.status));
      return;
    }

    const payload = await response.json();
    const books = payload?.data?.data || [];

    if (books.length === 0) {
      showToast("No books returned from API", "warning");
      return;
    }

    const batch = writeBatch(db);

    for (const book of books) {
      book.computedPrice = calculateBookPrice(book);
      const bookRef = doc(db, "products", String(book.id));
      batch.set(bookRef, {
        ...book,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();

    showToast(`Successfully added ${books.length} books!`, "success");
  } catch (error) {
    showToast("Error adding books: ", "danger", error);
  }
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

export async function openLinkAccountModal(
  email,
  pendingCred,
  targetProviderId,
) {
  const auth = getAuth();

  const modalContainer = document.createElement("div");

  modalContainer.innerHTML = `
    <p class="small text-body-secondary mb-3">
      An account already exists under <strong>${email}</strong>. Verify ownership using your existing sign-in method to complete the link:
    </p>

    <!-- Password Option -->
    <div data-provider="password" class="auth-option-block mb-3">
      <label for="modalAuthPassword" class="form-label small fw-semibold">Sign in with Password</label>
      <div class="input-group input-group-sm">
        <input type="password" id="modalAuthPassword" class="form-control" placeholder="Enter password">
        <button class="btn btn-primary" type="button" id="submitPasswordBtn">Sign In & Link</button>
      </div>
    </div>

    <!-- Divider -->
    <div data-divider class="text-center my-2 text-body-secondary small">-- OR --</div>

    <!-- OAuth Options -->
    <div class="d-grid gap-2">
      <button type="button" data-provider="google.com" class="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center gap-2 auth-provider-btn">
        <i class="bi bi-google"></i> Authenticate with Google
      </button>

      <button type="button" data-provider="github.com" class="btn btn-sm btn-outline-dark d-flex align-items-center justify-content-center gap-2 auth-provider-btn">
        <i class="bi bi-github"></i> Authenticate with GitHub
      </button>
    </div>
  `;

  const targetEl = modalContainer.querySelector(
    `[data-provider="${targetProviderId}"]`,
  );
  if (targetEl) targetEl.style.display = "none";

  if (targetProviderId === "password") {
    const divider = modalContainer.querySelector("[data-divider]");
    if (divider) divider.style.display = "none";
  }
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
  const { modal } = showModal(modalContainer, "Verify Existing Account", true);
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

    // Resolve the promise when the modal finishes closing
    ModalEl.addEventListener("hidden.bs.modal", () => {
      resolve(isAuthenticated);
    });
  });
}

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
