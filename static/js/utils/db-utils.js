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
  const querySnapshot = await getDocs(docRef);
  const sortedDocs = querySnapshot.docs.sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true }),
  );
  console.log(sortedDocs);
  container.innerHTML = "";
  for (const docSnap of sortedDocs) {
    const cardEl = renderFunction(docSnap, ...args);
    container.appendChild(cardEl);
  }
  return sortedDocs;
}

/**
 * @param {string} delOrCancel
 */
export function deleteDocEveLis(deleteContent = "delete") {
  document.body.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest('[data-tool="delete"]');
    if (!deleteBtn) return;
    console.log(deleteBtn, e);
    const { ModalEl, modal } = showModal(
      `
          <div>
            <h6>This action can not be undone!</h6>
            <a class="btn btn-danger confirm-delete-btn text-capitalize" data-bs-dismiss="modal">${deleteContent} this?</a>
          </div>
          `,
      `<div class="fs-5">Confirm ${deleteContent}?</div>`,
    );
    ModalEl.querySelector(".confirm-delete-btn").addEventListener(
      "click",
      async () => {
        try {
          await deleteDoc(
            doc(db, deleteBtn.dataset.collection, deleteBtn.dataset.uid),
          );
          showToast("Successfully deleted document!", "success");
          modal.hide();
          document
            .querySelector(`[data-parent-id="${deleteBtn.dataset.uid}"]`)
            .remove();
        } catch (e) {
          showToast("Error deleting document: ", "danger", e);
        }
      },
      { once: true },
    );
  });
}

export function editJson(docSnap, renderFunc, collection, args = []) {
  const editorContainer = document.createElement("div");
  const data = docSnap.data();
  delete data.createdAt;
  const jsonString = JSON.stringify(data, null, 2);

  editorContainer.innerHTML = `
    <form id="json-editor-form" class="needs-validation" novalidate>
      <div class="mb-3">
        <label class="form-label text-muted small fw-bold">Document Payload (JSON Format)</label>
        <textarea 
          class="form-control font-monospace text-bg-dark text-light p-3 rounded" 
          id="json-editor-textarea" 
          rows="14" 
          spellcheck="false"
          required
          style="font-size: 0.875rem; resize: vertical;"
        >${jsonString}</textarea>
        <div class="valid-feedback">JSON format is valid.</div>
        <div class="invalid-feedback">Invalid JSON format. Please check syntax before saving.</div>
      </div>
      <div class="d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="submit" class="btn btn-warning fw-semibold" data-uid="${docSnap.id}" data-collection="${collection}" id="save-json-btn">
          <i class="bi bi-check-lg me-1"></i>Save Changes
        </button>
      </div>
    </form>
    `;

  const jsonEditorForm = editorContainer.querySelector("#json-editor-form");
  const textarea = editorContainer.querySelector("#json-editor-textarea");
  const saveBtn = editorContainer.querySelector("#save-json-btn");
  textarea.addEventListener("input", () => {
    try {
      JSON.parse(textarea.value);
      textarea.setCustomValidity("");
    } catch (err) {
      textarea.setCustomValidity(
        "Invalid JSON format. Please check syntax before saving.",
      );
    }
  });

  const { ModalEl, modal } = showModal(
    editorContainer,
    `Edit JSON: ${saveBtn.dataset.uid}`,
  );

  jsonEditorForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    jsonEditorForm.classList.add("was-validated");
    if (!jsonEditorForm.checkValidity()) return;

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
        id: docSnap.id,
        data: () => updatedData,
      };
      document
        .querySelector(`[data-parent-id="${docSnap.id}"]`)
        .replaceWith(renderFunc(localSnap, ...args));
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
 */
export async function createOrder(product, user, quantity = 1) {
  try {
    const newOrderRef = doc(collection(db, "orders"));
    const unitPrice = product.computedPrice,
      shippingFee = 3.0;
    const order = {
      customer: {
        uid: user.uid,
        displayName: user.displayName || "Customer",
        email: user.email,
      },
      item: product,
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
}

export function detectPayloadType(rawData) {
  if (!rawData || typeof rawData !== "object") return "unknown";

  if (rawData.volumeInfo && typeof rawData.volumeInfo === "object") {
    return "freeapi";
  }

  if (
    rawData.title &&
    (rawData.author || rawData.authors) &&
    (rawData.computedPrice || rawData.coverUrl)
  ) {
    return "normalized";
  }

  return "unknown";
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

export function removeFromCart(id, cardEl) {
  const cartArr = JSON.parse(sessionStorage.getItem("CART_KEY") ?? "[]");
  const nextCart = cartArr.filter((item) => item.id !== id);

  if (nextCart.length === cartArr.length) {
    showToast("Cant found book index in cart", "warning");
    return;
  }

  sessionStorage.setItem("CART_KEY", JSON.stringify(nextCart));
  showToast("Successfully remove product from cart", "success");

  if (cardEl instanceof HTMLElement) {
    cardEl.remove();
  }

  const cartBadge = document.getElementById("cart-badge");
  if (cartBadge) {
    cartBadge.textContent = String(nextCart.length);
  }
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
  const payloadType = detectPayloadType(rawBook);
  if (payloadType === "unknown") {
    showToast("Invalid payload type", "danger");
    return;
  }

  switch (payloadType) {
    case "normalized": {
      if (!(rawBook.computedPrice && rawBook.computedPrice instanceof Object)) {
        const computedAmount =
          rawBook.pageCount > 0
            ? parseFloat((5 + rawBook.pageCount * 0.05).toFixed(2))
            : parseFloat(
                (10 + (parseInt(rawBook.id, 10) % 30 || 5) + 0.99).toFixed(2),
              );
        rawBook.computedPrice = { amount: computedAmount, currency: "USD" };
      }
      if (!rawBook.language) rawBook.language = "en";
      return rawBook;
    }

    case "freeapi": {
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
          : parseFloat(
              (10 + (Math.floor(Math.random() * (5 - 37 + 1)) + 5)).toFixed(2),
            );

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
        coverUrl:
          (
            imageLinks.thumbnail ||
            imageLinks.smallThumbnail ||
            rawBook.coverUrl
          ).replace(/^http:/, "https:") + "&fife=w800-h1000",
        computedPrice: {
          amount: Math.abs(computedAmount),
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
  }
}

function getIsbnType(cleanIsbn) {
  if (isValidIsbn10(cleanIsbn)) return "ISBN-10";
  if (isValidIsbn13(cleanIsbn)) return "ISBN-13";
  return "INVALID";
}

function isValidIsbn10(isbn) {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(isbn[i], 10) * (10 - i);
  }
  const lastChar = isbn[9];
  sum += lastChar === "X" ? 10 : parseInt(lastChar, 10);
  return sum % 11 === 0;
}

function isValidIsbn13(isbn) {
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(isbn[12], 10);
}

function convertIsbn10To13(cleanIsbn) {
  if (!/^\d{9}[\dX]$/.test(cleanIsbn)) return null;

  let sum10 = 0;
  for (let i = 0; i < 9; i++) {
    sum10 += parseInt(cleanIsbn[i], 10) * (10 - i);
  }
  const lastChar = cleanIsbn[9];
  sum10 += lastChar === "X" ? 10 : parseInt(lastChar, 10);
  if (sum10 % 11 !== 0) return null;

  const base13 = "978" + cleanIsbn.substring(0, 9);
  let sum13 = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base13[i], 10);
    sum13 += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum13 % 10)) % 10;
  return base13 + checkDigit;
}

function convertIsbn13To10(cleanIsbn) {
  if (!/^\d{13}$/.test(cleanIsbn)) return null;

  let sum13 = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(cleanIsbn[i], 10);
    sum13 += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit13 = (10 - (sum13 % 10)) % 10;
  if (checkDigit13 !== parseInt(cleanIsbn[12], 10)) return null;
  if (!cleanIsbn.startsWith("978")) return null;

  const base9 = cleanIsbn.substring(3, 12);
  let sum10 = 0;
  for (let i = 0; i < 9; i++) {
    sum10 += parseInt(base9[i], 10) * (10 - i);
  }

  const remainder = sum10 % 11;
  const checkDigit10Value = (11 - remainder) % 11;
  const checkDigit10 =
    checkDigit10Value === 10 ? "X" : String(checkDigit10Value);
  return base9 + checkDigit10;
}

export function processBulkPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;

  if (typeof payload.authors === "string") {
    payload.authors = payload.authors
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
  }

  if (Array.isArray(payload.authors) && payload.authors.length > 0) {
    payload.author = payload.authors.join(",");
  } else if (typeof payload.author === "string" && !payload.authors) {
    payload.authors = payload.author
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
  }

  if (payload.isbn) {
    if (typeof payload.isbn === "string") {
      const cleanIsbn = payload.isbn.replace(/[- ]/g, "").toUpperCase();
      const isbnType = getIsbnType(cleanIsbn);

      if (isbnType === "ISBN-10") {
        payload.isbn = [
          { type: "ISBN_13", identifier: convertIsbn10To13(cleanIsbn) },
          { type: "ISBN_10", identifier: cleanIsbn },
        ];
      } else if (isbnType === "ISBN-13") {
        payload.isbn = [
          { type: "ISBN_13", identifier: cleanIsbn },
          { type: "ISBN_10", identifier: convertIsbn13To10(cleanIsbn) },
        ];
      }
    } else if (Array.isArray(payload.isbn)) {
      let isbn10_Obj = payload.isbn.find((e) => e.type === "ISBN_10");
      let isbn13_Obj = payload.isbn.find((e) => e.type === "ISBN_13");

      if (!isbn10_Obj) {
        isbn10_Obj = { type: "ISBN_10", identifier: null };
        payload.isbn.push(isbn10_Obj);
      }
      if (!isbn13_Obj) {
        isbn13_Obj = { type: "ISBN_13", identifier: null };
        payload.isbn.push(isbn13_Obj);
      }

      if (isbn10_Obj.identifier && !isbn13_Obj.identifier) {
        const clean10 = String(isbn10_Obj.identifier)
          .replace(/[- ]/g, "")
          .toUpperCase();
        isbn13_Obj.identifier = convertIsbn10To13(clean10);
      } else if (!isbn10_Obj.identifier && isbn13_Obj.identifier) {
        const clean13 = String(isbn13_Obj.identifier)
          .replace(/[- ]/g, "")
          .toUpperCase();
        isbn10_Obj.identifier = convertIsbn13To10(clean13);
      }
    }
  }

  if (!payload.computedPrice) {
    const rawPrice = payload.price ?? payload.unitPrice;
    const price = Number(rawPrice ?? 0);
    const currency = payload.currency ?? "USD";

    delete payload.price;
    delete payload.unitPrice;
    delete payload.currency;

    if (rawPrice !== undefined && Number.isFinite(price) && price >= 0) {
      payload.computedPrice = { amount: price, currency };
    }
  }

  if (!payload.links) {
    const linkMap = {
      buy: "buy",
      buylink: "buy",
      info: "info",
      infolink: "info",
      preview: "preview",
      previewlink: "preview",
      webreader: "webReader",
      webreaderlink: "webReader",
    };

    const links = { buy: null, info: null, preview: null, webReader: null };
    for (const [key, value] of Object.entries(payload)) {
      const canonical = linkMap[key.toLowerCase()];
      if (canonical) {
        if (links[canonical] === null && value != null) {
          links[canonical] = value;
        }
        delete payload[key];
      }
    }
    payload.links = links;
  }

  if (typeof payload.categories === "string") {
    payload.categories = payload.categories
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
  }

  return payload;
}

export function processMainBulkPayload(payloads) {
  if (Array.isArray(payloads)) {
    return payloads.map((e) => processBulkPayload(e));
  }
  if (payloads instanceof Object) {
    return processBulkPayload(payloads);
  }
}

/**
 * @param {HTMLFormElement} FormEl
 */
export async function processPayloadManualForm(FormEl) {
  const formData = new FormData(FormEl);
  const coverFile = FormEl.querySelector("#manualCoverFile").files[0];
  const coverUrl = formData.get("coverUrl").trim();
  try {
    let storedCoverUrl = coverUrl;
    if (coverFile) {
      storedCoverUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(reader.result));
        reader.addEventListener("error", () => reject(reader.error));
        reader.readAsDataURL(coverFile);
      });
    }

    const pageCount = Number(formData.get("pageCount")) || 0;
    const authorsArr = formData
      .get("authors")
      .split(",")
      .map((author) => author.trim())
      .filter(Boolean);
    const product = {
      title: formData.get("title").trim(),
      author: authorsArr.join(", "),
      authors: authorsArr,
      publisher: formData.get("publisher").trim(),
      publishedDate: formData.get("publishedDate"),
      description: formData.get("description").trim(),
      pageCount,
      categories: formData
        .get("categories")
        .split(",")
        .map((category) => category.trim())
        .filter(Boolean),
      isbn: [
        { identifier: formData.get("isbn13").trim() || null, type: "ISBN_13" },
        { identifier: formData.get("isbn10").trim() || null, type: "ISBN_10" },
      ],
      coverUrl: storedCoverUrl,
      computedPrice: {
        amount: Number(formData.get("price")),
        currency: "USD",
      },
      links: {
        preview: formData.get("previewLink"),
        info: formData.get("infoLink").trim() || null,
        webReader: formData.get("webReaderLink").trim() || null,
        buy: formData.get("buyLink").trim() || null,
      },
      subtitle: formData.get("subtitle").trim() || null,
      rating: { average: 0, count: 0 },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    return product;
  } catch (error) {
    showToast("Error processing manual form: ", "danger", error);
  }
}

export function renderUniversalProductCard(docRef, mode = "guest") {
  const data = docRef.data();
  const id = docRef.id;

  const cardEl = document.createElement("div");
  cardEl.className = "col";
  cardEl.dataset.parentId = id;
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
                src="${data.coverUrl}"
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
                  <i class="bi bi-person me-1 text-primary"></i>${data.author || data.authors?.join(", ") || "N/A"}
                </div>
                <div class="text-truncate">
                  <i class="bi bi-building me-1 text-primary"></i>${data.publisher || "N/A"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card-footer bg-transparent border-secondary-subtle p-3">

        </div>
  `;
  if (mode === "guest" || mode === "user") {
    const buyingAttr =
      mode === "guest"
        ? `data-bs-toggle="tooltip" data-bs-title="You have to login in order to buy products" disabled`
        : "";
    const ATCAttr =
      mode === "guest"
        ? `data-bs-toggle="tooltip" data-bs-title="You have to login in order to add products to cart" disabled`
        : "";
    cardEl.querySelector(".card-footer").innerHTML =
      `<div class="row g-2 align-items-center">
            <div class="col-12 col-sm-5">
              <form class="needs-validation" novalidate>
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
                    step="1"
                    required
                  ${buyingAttr}
                  >

              </div>
                  <div class="invalid-feedback">Enter a whole number from 1 to 99.</div>
                  </form>
            </div>

            <div class="col-6 col-sm-3">
              <button class="btn btn-sm btn-outline-primary w-100 d-flex align-items-center justify-content-center" data-action data-tool="add-to-cart" title="Add to Cart" data-uid="${id}" ${ATCAttr}>
                <i class="bi bi-cart-plus fs-6"></i>
              </button>
            </div>

            <div class="col-6 col-sm-4">
              <button class="btn btn-sm btn-primary w-100 fw-semibold" data-action data-tool="place-order" data-uid="${id}" ${buyingAttr}>
                Buy Now
              </button>
            </div>
          </div>
        </div>`;
  }
  switch (mode) {
    case "guest":
      cardEl
        .querySelectorAll('[data-bs-toggle="tooltip"]')
        .forEach((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl));
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
          src="${data.coverUrl ? data.coverUrl : ""}"
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
