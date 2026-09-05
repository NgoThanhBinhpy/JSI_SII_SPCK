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
  updateDoc,
} from "../firebase-config.js";
import { getCurrentUser } from "./auth-utils.js";
import {
  calculateBookPrice,
  showModal,
  showToast,
  viewRawJson,
} from "./ui-utils.js";

export async function renderQueryResult(
  docRef,
  container,
  renderFunction,
  args = [],
) {
  container.innerHTML = `<div class="d-flex flex-column align-items-center justify-content-center py-5 position-relative" style="flex: 0 0 100%; width: 100%;">
  <div class="spinner-border text-primary position-relative z-1 mb-3" style="width: 3.5rem; height: 3.5rem;" role="status">
    <span class="visually-hidden">Loading...</span>
  </div>

</div>`;
  const originalArgs = [...args];
  const querySnapshot = await getDocs(docRef);
  const sortedDocs = querySnapshot.docs.sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true }),
  );
  console.log(sortedDocs);
  container.innerHTML = "";
  for (const docSnap of sortedDocs) {
    if (originalArgs) args = [docSnap, ...originalArgs];
    else args = [docSnap];
    const cardEl = renderFunction(...args);
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
export function editJson(docSnap, renderFunc, args = [docSnap]) {
  const editorContainer = document.createElement("div");
  const data = docSnap.data();
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
        <button type="button" class="btn btn-warning fw-semibold" data-uid="${docSnap.id}" id="save-json-btn">
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
    `Edit JSON: ${saveBtn.dataset.uid}`,
  );

  saveBtn.addEventListener("click", async () => {
    try {
      const updatedData = JSON.parse(textarea.value);
      await setDoc(
        doc(db, saveBtn.dataset.collection, saveBtn.dataset.uid),
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
      parentEl.replaceWith(renderFunc(...args));
    } catch (err) {
      showToast("Error updating JSON document: ", "danger", err);
    }
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
    const title = product.title || "Untitled",
      unitPrice = product.computedPrice,
      infoLink = product.links?.preview || "",
      rawImageLink = product.coverUrl || "",
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

export function removeFromCart(data) {
  var cartArr = JSON.parse(sessionStorage.getItem("CART_KEY") ?? "[]");
  cartArr.filter((e) => e === data);
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
      const processedEndpoint = processProductPayload(book);
      const bookRef = doc(db, "products", String(book.id));
      batch.set(bookRef, {
        ...processedEndpoint,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();

    showToast(`Successfully added ${books.length} books!`, "success");
  } catch (error) {
    showToast("Error adding books: ", "danger", error);
  }
}

export async function updateOrderStatus(orderId, newStatus) {
  try {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
    showToast(`Order status updated to "${newStatus}"`, "success");
  } catch (err) {
    showToast("Failed to update status", "danger", err);
  }
}

export function processProductPayload(rawBook) {
  const volume = rawBook.volumeInfo || {};
  const imageLinks = volume.imageLinks || {};
  const access = rawBook.accessInfo || {};
  const search = rawBook.searchInfo || {};

  const id = String(rawBook.id || rawBook.numericId || serverTimestamp());

  const authorsArray =
    volume.authors || (rawBook.author ? [rawBook.author] : []);
  const authorString =
    authorsArray.length > 0 ? authorsArray.join(", ") : "Unknown Author";

  const pageCount = Number(volume.pageCount || rawBook.pageCount || 0);
  const computedAmount = rawBook.computedPrice?.amount
    ? Number(rawBook.computedPrice.amount)
    : pageCount > 0
      ? parseFloat((5 + pageCount * 0.05).toFixed(2))
      : parseFloat((10 + (parseInt(id, 10) % 30 || 5) + 0.99).toFixed(2));

  return {
    id,
    etag: rawBook.etag || null,
    title: volume.title || rawBook.title || "Untitled Product",
    subtitle: volume.subtitle || rawBook.subtitle || "",
    author: authorString,
    authors: authorsArray,
    publisher: volume.publisher || "Independent",
    publishedDate: volume.publishedDate || null,
    description:
      volume.description || rawBook.description || search.textSnippet || "",
    pageCount,
    language: volume.language || "en",
    categories: volume.categories || ["General"],
    isbn: volume.industryIdentifiers || [],
    rating: {
      average: Number(volume.averageRating || 0),
      count: Number(volume.ratingsCount || 0),
    },
    coverUrl: (
      imageLinks.thumbnail ||
      imageLinks.smallThumbnail ||
      rawBook.coverUrl ||
      ""
    ).replace(/^http:/, "https:"),
    computedPrice: {
      amount: computedAmount,
      currency: rawBook.computedPrice?.currency || "USD",
    },
    links: {
      preview: volume.previewLink || null,
      info: volume.infoLink || null,
      webReader: access.webReaderLink || null,
      buy: rawBook.saleInfo?.buyLink || null,
    },
    updatedAt: serverTimestamp(),
  };
}

export function renderUniversalProductCard(docRef, mode = "guest") {
  const data = docRef.data();
  const id = docRef.id;

  const cardEl = document.createElement("div");
  cardEl.className = "col";
  cardEl.innerHTML = `
      <div class="card h-100 shadow-sm border-0 rounded-3 overflow-hidden">
        
        <div class="card-header bg-body-secondary border-0 py-2 px-3 d-flex justify-content-between align-items-center">
          <span class="badge bg-primary-subtle text-primary border border-primary-subtle text-truncate" style="max-width: 120px;">
            ${data.categories?.[0] || "General"}
          </span>
          <span class="fw-bold text-success small">
            ${data.computedPrice ? `${data.computedPrice.currency} $${data.computedPrice.amount}` : "Free"}
          </span>
          <button class="btn btn-sm bg-body border-0 rounded-circle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow-sm">
              <li>
                <a class="dropdown-item" data-tool="view-raw-json" data-action href="#" data-uid="${id}">
                  <i class="bi bi-code-slash me-2 text-info"></i>View Raw JSON
                </a>
              </li>
              <li>
                <a class="dropdown-item" data-tool="view-metadata" data-action href="#" data-uid="${id}">
                  <i class="bi bi-journal-text me-1"></i>View Metadata
                </a>
              </li>
              ${
                mode === "admin"
                  ? `<li>
                <a class="dropdown-item" data-tool="edit-json" href="#" data-action data-collection="products" data-uid="${id}">
                  <i class="bi bi-pencil-square me-2 text-warning"></i>Edit Document JSON
                </a>
              </li>
              <li><hr class="dropdown-divider"></li>
              <li>
                <a href="#" class="dropdown-item text-danger" data-tool="delete" data-collection="products" data-uid="${id}">
                  <i class="bi bi-trash me-2"></i>Delete Product
                </a>
              </li>`
                  : ""
              }
            </ul>
        </div>

        <div class="card-body p-3">
          <div class="row g-3 align-items-center">
            <div class="col-4 bg-body-tertiary d-flex align-items-center justify-content-center p-2 rounded">
              <img 
                src="${data.coverUrl}&fife=w800-h1000" 
                class="img-fluid rounded object-fit-contain shadow-sm mh-100" 
                style="max-height: 140px;"
                alt="${data.title || "Book Cover"}"
                loading="lazy"
              />
            </div>
            <div class="col-8">
              <h6 class="card-title text-truncate fw-bold mb-1" title="${data.title}">${data.title}</h6>
              ${data.subtitle ? `<p class="text-muted small text-truncate mb-2">${data.subtitle}</p>` : ""}

              <div class="small text-muted">
                <div class="text-truncate mb-1">
                  <i class="bi bi-person me-1 text-primary"></i>${data.authors?.join(", ") || "N/A"}
                </div>
                <div class="text-truncate">
                  <i class="bi bi-building me-1 text-primary"></i>${data.publisher || "N/A"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card-footer bg-transparent border-secondary-subtle p-3">
          ${
            mode === "guest" || mode === "user"
              ? `<div class="row g-2 align-items-center">
            <div class="col-12 col-sm-5">
              <div class="input-group input-group-sm bg-body-tertiary p-1 rounded-3 border border-secondary-subtle align-items-center gap-2">
                
                <label class="ps-2 pe-1 fw-semibold text-body-secondary small mb-0 user-select-none">
                  Qty
                </label>

                <input 
                  type="number"
                  class="form-control form-control-sm text-center bg-body text-body border-secondary-subtle rounded-2 px-1 qty-selector" 
                  value="1"
                  min="1" 
                  max="99"
                  ${mode === "guest" ? `data-bs-toggle="tooltip" data-bs-title="You have to login in order to buy products" disable` : ""}
                  >

              </div>
            </div>

            <div class="col-6 col-sm-3">
              <button class="btn btn-sm btn-outline-primary w-100 d-flex align-items-center justify-content-center" data-action data-tool="add-to-cart" title="Add to Cart" data-uid="${id}" ${mode === "guest" ? `data-bs-toggle="tooltip" data-bs-title="You have to login in order to add products to cart" disable` : ""}>
                <i class="bi bi-cart-plus fs-6"></i>
              </button>
            </div>

            <div class="col-6 col-sm-4">
              <button class="btn btn-sm btn-primary w-100 fw-semibold" data-action data-tool="place-order" data-uid="${id}" ${mode === "guest" ? `data-bs-toggle="tooltip" data-bs-title="You have to login in order to buy products" disable` : ""}>
                Buy Now
              </button>
            </div>
          </div>
        </div>`
              : ""
          }

      </div>
  `;

  switch (mode) {
    case "guest":
      const tooltipTriggerList = document.querySelectorAll(
        '[data-bs-toggle="tooltip"]',
      );
      const tooltipList = [...tooltipTriggerList].map(
        (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl),
      );
  }
  return cardEl;
}

export function viewMetadata(docRef) {
  const data = docRef.data();
  const id = docRef.id;
  showModal(
    `<div class="row g-4 align-items-start">
      <div class="col-md-4 text-center">
        <img 
          class="img-fluid rounded-3 shadow-sm object-fit-contain"
          src="${data.coverUrl ? `${data.coverUrl}&fife=w800-h1000` : ""}"
          style="max-height: 280px;" 
          alt="${data.title || "Book Cover"}"
        >
      </div>
      
      <div class="col-md-8">
        <span class="badge bg-primary-subtle text-primary border border-primary-subtle mb-2">
          ${data.categories?.join(", ") || "General"}
        </span>
        <h4 class="fw-bold mb-1 lh-sm">${data.title || "N/A"}</h4>
        ${data.subtitle ? `<p class="text-muted small mb-2">${data.subtitle}</p>` : ""}
        
        <h5 class="text-success fw-bold mb-3">
          ${data.computedPrice ? `${data.computedPrice.currency} $${data.computedPrice.amount}` : "Free"}
        </h5>

        <div class="row g-2 small text-secondary border-top py-3 mb-3">
          <div class="col-6 text-truncate">
            <i class="bi bi-person me-1 text-primary"></i><strong>Author:</strong> 
            <span class="text-body">${data.authors?.join(", ") || "N/A"}</span>
          </div>
          <div class="col-6 text-truncate">
            <i class="bi bi-building me-1 text-primary"></i><strong>Publisher:</strong> 
            <span class="text-body">${data.publisher || "N/A"}</span>
          </div>
          <div class="col-6 text-truncate">
            <i class="bi bi-calendar3 me-1 text-primary"></i><strong>Published:</strong> 
            <span class="text-body">${data.publishedDate || "N/A"}</span>
          </div>
          <div class="col-6 text-truncate">
            <i class="bi bi-book me-1 text-primary"></i><strong>Pages:</strong> 
            <span class="text-body">${data.pageCount || "N/A"}</span>
          </div>
          <div class="col-6 text-truncate">
            <i class="bi bi-translate me-1 text-primary"></i><strong>Language:</strong> 
            <span class="text-body">${(data.language || "N/A").toUpperCase()}</span>
          </div>
          <div class="col-6 text-truncate">
            <i class="bi bi-hash me-1 text-primary"></i><strong>ID:</strong> 
            <span class="font-monospace text-body">${id}</span>
          </div>
        </div>

      </div>
    </div>

    <div class="mt-2">
      <div>
        <h6 class="fw-bold mb-1 text-body-emphasis"><i class="bi bi-card-text me-1 text-primary"></i> Description</h6>
        <p class="text-body-secondary small lh-base mb-0 overflow-y-auto" style="max-height: 120px;">
          ${data.description || "No description available"}
        </p>
      </div>
    </div>`,
    data.title || "Book Details",
    `<div class="mt-4 d-flex gap-2 w-100">
      ${
        data.links.preview
          ? `<a class="btn btn-sm btn-outline-secondary flex-grow-1" href="${data.links.preview}" target="_blank" rel="noopener">
        <i class="bi bi-box-arrow-up-right me-1"></i> Google Books Preview
      </a>`
          : ""
      }
    </div>`,
  );
}
