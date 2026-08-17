import {
  doc,
  db,
  auth,
  getDoc,
  onAuthStateChanged,
  signOut,
  serverTimestamp,
  Timestamp,
  collection,
  setDoc,
  deleteDoc,
  writeBatch,
} from "./firebase-config.js";
import { createTreeViewer } from "../../new.js";

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
        ${type === "danger" ? message + error.message : message}
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
      console.error(error);
      break;
    case "warning":
      console.warn(message);
  }
}

export function showModal(modalBody, modalTitle, htmlElement = false) {
  const ModalEl = document.createElement("div");
  if (!htmlElement)
    ModalEl.innerHTML = `<div class="modal-dialog modal-lg">
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

export function viewRawJsonEveLis(parentEl, obj, title = "Raw JSON") {
  parentEl
    .querySelector('[data-tool="view-raw-json"]')
    .addEventListener("click", () => {
      const rawJsonEl = createTreeViewer(obj);
      showModal(rawJsonEl, title, true);
    });
}

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
 * @param {htmlElement} parentEl
 */
export function editJsonEveLis(parentEl, obj, renderFunc, id) {
  const editBtn = parentEl.querySelector('[data-tool="edit-json"]');
  if (!editBtn) return;

  editBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const editorContainer = document.createElement("div");
    const jsonString = JSON.stringify(obj, null, 2);

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
        parentEl.replaceWith(renderFunc(updatedData, id));
      } catch (err) {
        showToast("Error updating JSON document: ", "danger", err);
      }
    });
  });
}

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

export async function isAdmin(getUser = false) {
  console.log("isAdmin called");
  const user = await getCurrentUser();
  if (!user) {
    if (getUser) return { isAdmin_: false, user: null };
    return false;
  }

  const userData = await getDoc(doc(db, "users", user.uid));
  console.log(userData, userData.data());

  if (userData.exists()) {
    const isAdmin_ = userData.data().roleId === "admin";
    if (getUser) return { isAdmin_, user };
    return isAdmin_;
  }
  if (getUser) return { isAdmin_: false, user: user };
  return false;
}

export async function createNavbar(isAdmin_, user) {
  const navbar = document.createElement("nav");
  navbar.className = `navbar navbar-expand-lg bg-body-tertiary`;
  navbar.innerHTML = `<div class="container-fluid">
        <a class="navbar-brand" href="#">Coffee</a>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarSupportedContent">
          <ul class="navbar-nav me-4 mb-2 mb-lg-0 ms-auto gap-4">
            <li class="nav-item nav-tab">
              <a class="nav-link active" href="#"><i class="bi bi-house"></i> Home</a>
            </li>
            ${
              isAdmin_
                ? `<li class="nav-item nav-tab">
              <a class="nav-link" href="./pages/admin.html"><i class="bi bi-gear-wide-connected"></i> Admin Panel</a>
            </li>`
                : ""
            }
            ${
              user
                ? `<li class="nav-item nav-tab">
              <a class="nav-link" id="log-out-btn" href="./pages/auth.html"><i class="bi bi-box-arrow-right me-1"></i> Log Out</a>
            </li>
            <li class="nav-item nav-tab">
              <a class="nav-link" href="./pages/orders.html"><i class="bi bi-bag-check"></i> My Orders</a>
            </li>
            <li class="nav-item">
              <a class="nav-link position-relative me-3" href="./pages/cart.html">
                <i class="bi bi-cart3 fs-5"></i> Cart
                <span class="text-center badge rounded-pill bg-danger" id="cart-badge">
                  ${JSON.parse(sessionStorage.getItem("CART_KEY") ?? "[]").length}
                </span>
              </a>
            </li>`
                : `<li class="nav-item nav-tab">
              <a class="nav-link" href="./pages/auth.html"><i class="bi bi-box-arrow-in-right me-1"></i> Log In</a>
            </li>`
            }
          </ul>
        </div>
      </div>`;
  if (user)
    navbar.querySelector("#log-out-btn").addEventListener("click", async () => {
      await signOut(auth);
      sessionStorage.removeItem("CART_KEY");
    });
  document.body.prepend(navbar);
}

export async function createOrder(product, user, quantity = 1) {
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
  return newOrderRef.id;
}

export function addToCart(bookData) {
  var cartArr = JSON.parse(sessionStorage.getItem("CART_KEY") ?? "[]");
  if (cartArr.find((c) => c.id === bookData.id)) {
    showToast("This product is already in cart", "info");
    return;
  }
  cartArr.push(bookData);
  sessionStorage.setItem("CART_KEY", JSON.stringify(cartArr));
  showToast("Successfully add product to cart", "success");
}

export function removeFromCart(bookData) {
  var cartArr = JSON.parse(sessionStorage.getItem("CART_KEY") ?? "[]");
  const bookId = cartArr.findIndex((c) => c.id === bookData.id);
  if (!bookId) {
    showToast("Cant found book index in cart", "warning");
    return;
  }
  cartArr.splice(bookId, 1);
  sessionStorage.setItem("CART_KEY", JSON.stringify(cartArr));
  showToast("Successfully remove product from cart", "success");
}

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
