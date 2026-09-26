import {
  initBasicThings,
  showToast,
  isAdmin,
  viewRawJson,
  deleteDocEveLis,
  editJson,
  renderQueryResult,
  updateNavbar,
  getCurrentUser,
  addItems,
  updateOrderStatus,
  showModal,
  renderUniversalProductCard,
  viewMetadata,
  processPayloadManualForm,
  processMainBulkPayload,
} from "./utils.js";
import {
  db,
  collection,
  doc,
  setDoc,
  serverTimestamp,
  writeBatch,
} from "./firebase-config.js";

async function renderItems() {
  try {
    const container = document.querySelector("#products-container");
    if (container) {
      const sortedDocs = await renderQueryResult(
        collection(db, "products"),
        container,
        renderUniversalProductCard,
        ["admin"],
      );
      container.addEventListener("click", async (e) => {
        const target = e.target.closest("[data-action]");
        if (!target) return;

        const action = target.dataset.tool;
        const bookId = target.dataset.uid;

        const bookDoc = sortedDocs.find((doc) => doc.id === bookId);
        if (!bookDoc) return;

        const productData = bookDoc.data();

        switch (action) {
          case "view-metadata": {
            viewMetadata(bookDoc);
            break;
          }

          case "edit-json": {
            editJson(bookDoc, renderUniversalProductCard, "products", [
              "admin",
            ]);
            break;
          }

          case "view-raw-json": {
            viewRawJson(productData);
          }
        }
      });
    }
  } catch (error) {
    showToast("Failed to load products: ", "danger", error);
  }
}

function renderOrder(docSnap) {
  const data = docSnap.data();
  const docSnapId = docSnap.id;
  const cardCol = document.createElement("div");
  cardCol.className = "col-12 col-md-6 col-lg-4";
  cardCol.dataset.parentId = docSnapId;

  const totalVal =
    data.pricing?.totalAmount != null && data.pricing?.unitPrice?.currency
      ? `${Number(data.pricing.totalAmount).toFixed(2)} ${data.pricing.unitPrice.currency}`
      : "N/A";

  const itemTitle = data.item?.title || "Untitled Product";
  const coverUrl = data.item?.coverUrl || "https://via.placeholder.com/54x72";
  const customerEmail = data.customer?.email || "No Email";
  const quantity = data.quantity || 1;
  const status = data.status || "processing";
  const statusClass =
    status === "delivered" || status === "completed"
      ? "bg-success-subtle text-success"
      : "bg-warning-subtle text-warning";

  cardCol.innerHTML = `
    <div class="card h-100 border-0 shadow-sm rounded-3">
      <div class="card-header p-2 d-flex flex-column justify-content-between gap-2">
        <div class="d-flex align-items-center justify-content-between">
          <span class="badge bg-secondary-subtle text-secondary font-monospace">#${docSnapId}</span>
          <div class="dropdown" data-bs-auto-close="outside">
            <button class="btn btn-sm bg-body border-0 rounded-circle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow-sm">
              <li>
                <a class="dropdown-item" data-tool="view-raw-json" href="#" data-action data-uid="${docSnapId}">
                  <i class="bi bi-code-slash me-2 text-info"></i>View Raw JSON
                </a>
              </li>
              <li>
                <a class="dropdown-item" data-tool="change-status" href="#" data-action data-uid="${docSnapId}">
                  <i class="bi bi-tag-fill text-info-emphasis"></i> Change Order Status
                </a>
              </li>
              <li>
                <a class="dropdown-item" data-tool="edit-json" href="#" data-collection="orders" data-action data-uid="${docSnapId}">
                  <i class="bi bi-pencil-square me-2 text-warning"></i>Edit Document JSON
                </a>
              </li>
              <li><hr class="dropdown-divider"></li>
              <li>
                <a href="#" class="dropdown-item text-danger" data-tool="delete" data-collection="orders" data-action data-uid="${docSnapId}">
                  <i class="bi bi-trash me-2"></i>Delete Order
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div class="card-body p-2 d-flex flex-column justify-content-between gap-2">
        <div class="d-flex gap-3 align-items-start">
          <img src="${coverUrl}" alt="${itemTitle}" class="rounded object-fit-cover shadow-sm flex-shrink-0" style="width: 7.5rem; height: 9rem;" />
          <div class="overflow-hidden">
            <h6 class="card-title text-truncate mb-1" title="${itemTitle}">${itemTitle}</h6>
            <small class="text-muted d-block text-truncate">${customerEmail}</small>
            <small class="text-muted d-block mt-1">Qty: <strong>${quantity}</strong></small>
          </div>
        </div>
      </div>
      <div class="card-footer p-2 d-flex flex-column justify-content-between gap-2 bg-body">
        <div class="d-flex align-items-center justify-content-between pt-2">
          <span class="fw-bold text-success fs-6">${totalVal}</span>
          <span class="badge text-capitalize ${statusClass} px-3 py-2">
            ${status}
          </span>
        </div>
      </div>
    </div>
  `;
  return cardCol;
}

async function renderOrders() {
  try {
    const container = document.querySelector("#orders-container");
    if (container) {
      const sortedDocs = await renderQueryResult(
        collection(db, "orders"),
        container,
        renderOrder,
      );

      container.addEventListener("click", async (e) => {
        const target = e.target.closest("[data-action]");
        if (!target) return;

        const action = target.dataset.tool;
        const orderId = target.dataset.uid;

        const orderDoc = sortedDocs.find((doc) => doc.id === orderId);
        if (!orderDoc) return;

        const data = orderDoc.data();

        switch (action) {
          case "change-status": {
            const { ModalEl, modal } = showModal(
              `<div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="mb-0 fw-semibold">Order Status</h6>
                <span id="current-status-badge" class="badge bg-info-subtle text-info-emphasis border border-info-subtle px-2 py-1">
                  <i class="bi bi-info-circle me-1"></i>${data.status.toUpperCase()}
                </span>
              </div>

              <select class="form-select form-select-sm mb-2" id="select-status-form">
                <option value="pending" ${data.status === "pending" ? "selected" : ""}>Pending</option>
                <option value="processing" ${data.status === "processing" ? "selected" : ""}>Processing</option>
                <option value="shipped" ${data.status === "shipped" ? "selected" : ""}>Shipped</option>
                <option value="delivered" ${data.status === "delivered" ? "selected" : ""}>Delivered</option>
                <option value="cancelled" ${data.status === "cancelled" ? "selected" : ""}>Cancelled</option>
              </select>

              <button id="change-status" class="btn btn-sm btn-outline-info w-100 d-flex align-items-center justify-content-center gap-1">
                <i class="bi bi-arrow-repeat"></i> Update Status
              </button>
              `,
              "Change status",
            );
            ModalEl.querySelector("#change-status").addEventListener(
              "click",
              () => {
                const selectForm = ModalEl.querySelector("#select-status-form");
                if (selectForm.value === data.status) {
                  showToast(
                    "Select an status other than the current status.",
                    "warning",
                  );
                  return;
                }
                updateOrderStatus(orderId, selectForm.value);
                modal.hide();
                data.status = selectForm.value;
                const localSnap = {
                  id: orderId,
                  data: () => data,
                };
                document
                  .querySelector(`[data-parent-id="${orderId}"]`)
                  .replaceWith(renderOrder(localSnap));
              },
            );
            break;
          }

          case "view-metadata": {
            viewMetadata(orderDoc);
            break;
          }

          case "edit-json": {
            editJson(orderDoc, renderOrder, "orders");
            break;
          }

          case "view-raw-json": {
            viewRawJson(data);
          }
        }
      });
    }
  } catch (error) {
    showToast("Failed to load orders: ", "danger", error);
  }
}

async function initAddBookBtns() {
  const quantityInput = document.getElementById("add-books-quantity");
  const quantityForm = document.getElementById("add-books-form");
  const addBooksButton = document.getElementById("add-books-btn");
  const manualAddBookBtn = document.getElementById("manual-add-book-btn");
  addBooksButton.addEventListener("click", async () => {
    quantityForm.classList.add("was-validated");
    if (!quantityForm.checkValidity()) return;

    await addItems(quantityInput.valueAsNumber);
  });
  manualAddBookBtn.addEventListener("click", () => {
    const { ModalEl, modal } = showModal(
      `<ul class="nav nav-tabs nav-fill mb-4" id="ingestionTabs" role="tablist">
          <li class="nav-item" role="presentation"><button class="nav-link active fw-semibold" id="manual-tab" data-bs-toggle="tab" data-bs-target="#manual-pane" type="button" role="tab" aria-controls="manual-pane" aria-selected="true"><i class="bi bi-pencil-square me-1"></i> Manual Entry</button></li>
          <li class="nav-item" role="presentation"><button class="nav-link fw-semibold" id="bulk-tab" data-bs-toggle="tab" data-bs-target="#bulk-pane" type="button" role="tab" aria-controls="bulk-pane" aria-selected="false"><i class="bi bi-file-earmark-arrow-up me-1"></i> Bulk Upload (.json / .txt)</button></li>
        </ul>
        <div class="tab-content" id="ingestionTabsContent">
          <div class="tab-pane fade show active" id="manual-pane" role="tabpanel" aria-labelledby="manual-tab" tabindex="0">
            <form id="manualBookForm" class="needs-validation" novalidate>
              <div class="accordion" id="newAccordion">
                <div class="accordion-item">
                  <h2 class="accordion-header"><button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">Basic Fields</button></h2>
                  <div id="collapseOne" class="accordion-collapse collapse show" data-bs-parent="#newAccordion">
                    <div class="accordion-body">
                      <div class="row g-3 mb-3">
                        <div class="col-md-12"><label for="manualTitle" class="form-label fw-semibold">Book Title <span class="text-danger">*</span></label><input type="text" class="form-control" id="manualTitle" name="title" placeholder="e.g., Clean Code" required /><div class="invalid-feedback">Title is required.</div></div>
                      </div>
                      <div class="row g-3 mb-3">
                        <div class="col-md-7"><label for="manualAuthors" class="form-label fw-semibold">Author(s) <span class="text-danger">*</span></label><input type="text" class="form-control" id="manualAuthors" name="authors" placeholder="Comma-separated (e.g., Robert C. Martin)" required /><div class="invalid-feedback">At least one author is required.</div></div>
                        <div class="col-md-5"><label for="manualPublisher" class="form-label fw-semibold">Publisher</label><input type="text" class="form-control" id="manualPublisher" name="publisher" placeholder="Prentice Hall" /></div>
                      </div>
                      <div class="row g-3 mb-3">
                        <div class="col-md-5"><label for="manualCategories" class="form-label fw-semibold">Categories / Genres <span class="text-danger">*</span></label><input type="text" class="form-control" id="manualCategories" name="categories" placeholder="Software Engineering, Programming" required /></div>
                        <div class="col-md-4"><label for="manualPublishedDate" class="form-label fw-semibold">Release Date <span class="text-danger">*</span></label><input type="date" class="form-control" id="manualPublishedDate" name="publishedDate" required /></div>
                        <div class="col-md-3"><label for="manualPageCount" class="form-label fw-semibold">Page Count</label><input type="number" class="form-control" id="manualPageCount" name="pageCount" min="1" placeholder="464" /></div>
                      </div>
                      <div class="row g-3 mb-3">
                        <div class="col-md-12"><label for="manualPrice" class="form-label fw-semibold">Base Price ($) <span class="text-danger">*</span></label><input type="number" class="form-control" id="manualPrice" name="price" step="0.01" min="0" placeholder="39.99" required /><div class="invalid-feedback">Provide a valid price.</div></div>
                      </div>
                      <div class="row g-3 mb-3">
                        <div class="col-md-7"><label for="manualCoverUrl" class="form-label fw-semibold">Cover Image URL</label><input type="url" class="form-control" id="manualCoverUrl" name="coverUrl" placeholder="https://images.example.com/cover.jpg" /></div>
                        <div class="col-md-5"><label for="manualCoverFile" class="form-label fw-semibold">Or Local Cover (Base64 Canvas)</label><input type="file" name="coverFile" class="form-control" id="manualCoverFile" accept="image/*" /></div>
                      </div>
                      <div class="row g-3 mb-3">
                        <div class="col-md-6"><label for="manualPreviewLink" class="form-label fw-semibold">Preview / Sample Link <span class="text-danger">*</span></label><input type="url" class="form-control" id="manualPreviewLink" name="previewLink" placeholder="https://books.google.com/preview..." required /></div>
                        <div class="col-md-6"><label for="manualInfoLink" class="form-label fw-semibold">More Info / Store Link</label><input type="url" class="form-control" id="manualInfoLink" name="infoLink" placeholder="https://books.google.com/info..." /></div>
                      </div>
                      <div class="mb-4"><label for="manualDescription" class="form-label fw-semibold">Full Description <span class="text-danger">*</span></label><textarea class="form-control" id="manualDescription" name="description" rows="3" placeholder="Provide a detailed book synopsis..." required></textarea></div>
                    </div>
                  </div>
                </div>
                <div class="accordion-item">
                  <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">Advanced Fields</button></h2>
                  <div id="collapseTwo" class="accordion-collapse collapse" data-bs-parent="#newAccordion">
                    <div class="accordion-body">
                      <div class="row g-3 mb-3">
                        <div class="col-md-12"><label for="manualSubtitle" class="form-label fw-semibold">Subtitle</label><input type="text" class="form-control" id="manualSubtitle" name="subtitle" placeholder="A Handbook of Agile Software Craftsmanship" /></div>
                      </div>
                      <div class="row g-3 mb-3">
                        <div class="col-md-6"><label for="manualBuyLink" class="form-label fw-semibold">Buy Link</label><input type="url" class="form-control" id="manualBuyLink" name="buyLink" placeholder="https://play.google.com/store/books/details..." /></div>
                        <div class="col-md-6"><label for="manualWebReaderLink" class="form-label fw-semibold">Web Reader Link</label><input type="url" class="form-control" id="manualWebReaderLink" name="webReaderLink" placeholder="https://play.google.com/books/reader..." /></div>
                      </div>
                      <div class="row g-3 mb-3">
                        <div class="col-md-4"><label for="manualEtag" class="form-label fw-semibold">Etag</label><input type="text" class="form-control" id="manualEtag" name="etag" placeholder="b7yZqHfYIlM" /></div>
                        <div class="col-md-4"><label for="manualIsbn13" class="form-label fw-semibold">ISBN-13</label><input type="text" class="form-control" id="manualIsbn13" name="isbn13" placeholder="9781119508199" /></div>
                        <div class="col-md-4"><label for="manualIsbn10" class="form-label fw-semibold">ISBN-10</label><input type="text" class="form-control" id="manualIsbn10" name="isbn10" placeholder="1119508193" /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="d-flex justify-content-end gap-2 mt-4">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-primary px-4"><i class="bi bi-plus-circle me-1"></i> Save Full Record</button>
              </div>
            </form>
          </div>
          <div class="tab-pane fade" id="bulk-pane" role="tabpanel" aria-labelledby="bulk-tab" tabindex="0">
            <div class="p-3 bg-body-tertiary rounded border mb-3">
              <p class="small text-muted mb-1"><strong>Accepted File Types:</strong></p>
              <ul class="small text-muted ps-3 mb-0">
                <li><code>.json</code>: Array of product objects. Image sources must be direct HTTP links.</li>
                <li><code>.txt</code>: Pipe-delimited plain text formatted as <code>Title | Authors | PageCount | CoverUrl | Price</code>.</li>
              </ul>
            </div>
            <form id="bulkUploadForm" class="needs-validation" novalidate>
              <div class="mb-3"><label for="bulkFileInput" class="form-label fw-semibold">Select Ingestion File <span class="text-danger">*</span></label><input type="file" class="form-control" id="bulkFileInput" accept=".json,.txt" required /><div class="invalid-feedback">Select a file to upload.</div></div>
              <div id="bulkPreviewContainer" class="d-none mb-3">
                <div class="d-flex justify-content-between align-items-center mb-1"><span class="fw-semibold small text-muted">Parsed Records Preview:</span><span id="bulkRecordCount" class="badge bg-primary rounded-pill">0 Records</span></div>
                <pre id="bulkPreviewContent" class="bg-dark text-light p-3 rounded border" style="max-height: 220px; overflow-y: auto; font-size: 0.825rem;"></pre>
              </div>
              <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" id="btnCommitBulk" class="btn btn-success px-4"><i class="bi bi-cloud-upload me-1"></i> Upload All Items</button>
              </div>
            </form>
          </div>
        </div>`,
      `<i class="bi bi-journal-plus me-2 text-primary"></i>Ingest Products`,
    );
    const manualBookForm = ModalEl.querySelector("#manualBookForm");
    manualBookForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      manualBookForm.classList.add("was-validated");
      if (!manualBookForm.checkValidity()) {
        return;
      }

      try {
        const processedBook = await processPayloadManualForm(manualBookForm);
        const bookRef = doc(collection(db, "products"));
        setDoc(bookRef, { ...processedBook, id: bookRef.id });
        showToast("Successfully add book!", "success");
      } catch (e) {
        showToast("Error adding book");
      }
    });

    const bulkFileInput = ModalEl.querySelector("#bulkFileInput");
    bulkFileInput.addEventListener("change", async (e) => {
      const rawText = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(reader.result));
        reader.addEventListener("error", () => reject(reader.error));
        reader.readAsText(bulkFileInput.files[0]);
      });
      try {
        if (rawText) {
          const jsonContent = JSON.parse(rawText);
          console.log(jsonContent);
          console.log(processMainBulkPayload(jsonContent));
        }
      } catch (e) {
        showToast("Error parsing the json: ", "danger", e);
      }
    });
    const bulkUploadForm = ModalEl.querySelector("#bulkUploadForm");
    bulkUploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      bulkUploadForm.classList.add("was-validated");
      if (!bulkUploadForm.checkValidity()) return;

      const rawText = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(reader.result));
        reader.addEventListener("error", () => reject(reader.error));
        reader.readAsText(bulkFileInput.files[0]);
      });

      try {
        const processedJsonContent = processMainBulkPayload(
          JSON.parse(rawText),
        );
        if (Array.isArray(processedJsonContent)) {
          const batch = writeBatch(db);
          for (const book of processedJsonContent) {
            const bookRef = doc(collection(db, "products"));
            batch.set(bookRef, {
              id: bookRef.id,
              ...book,
              createdAt: serverTimestamp(),
            });
          }
          await batch.commit();
        } else if (processedJsonContent instanceof Object) {
          const bookRef = doc(collection(db, "products"));
          await setDoc(bookRef, {
            id: bookRef.id,
            ...processedJsonContent,
            createdAt: serverTimestamp(),
          });
        }
        showToast("Successfully added the uploaded books", "success");
      } catch (e) {
        showToast("Error adding uploaded books: ", "danger", e);
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  initBasicThings();
  initAddBookBtns();

  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "../index.html";
    return;
  }
  const isAdmin_ = await isAdmin(user);
  if (!isAdmin_) {
    window.location.href = "../index.html";
    return;
  }
  updateNavbar(isAdmin_, user);
  await Promise.all([renderItems(), renderOrders()]);
});
