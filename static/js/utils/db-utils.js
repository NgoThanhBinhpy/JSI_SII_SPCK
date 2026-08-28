import {
  db,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  collection,
  writeBatch,
} from "../firebase-config.js";
import { getCurrentUser } from "./auth-utils.js";
import { calculateBookPrice, showModal, showToast } from "./ui-utils.js";

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
