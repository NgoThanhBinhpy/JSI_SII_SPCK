import {
  showToast,
  isAdmin,
  viewRawJson,
  deleteDocEveLis,
  editJson,
  renderQueryResult,
  createSetThemeEl,
  updateNavbar,
  getCurrentUser,
  addItems,
  updateOrderStatus,
  showModal,
  renderUniversalProductCard,
  viewMetadata,
  setFieldFeedback,
} from "./utils.js";
import { db, collection, setDoc } from "./firebase-config.js";
import { createCustomCss } from "../../new.js";

createSetThemeEl();

async function renderItems(currUser) {
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
            editJson(bookDoc, renderUniversalProductCard, [
              bookDoc,
              currUser ? "user" : "guest",
            ]);
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

async function renderOrders(currUser) {
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
            editJson(orderDoc, renderUniversalProductCard, [
              orderDoc,
              currUser ? "user" : "guest",
            ]);
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

document.addEventListener("DOMContentLoaded", async () => {
  createCustomCss();
  deleteDocEveLis();
  const quantityInput = document.getElementById("add-books-quantity");
  const addBooksButton = document.getElementById("add-books-btn");
  quantityInput.addEventListener("input", () => {
    const valid =
      Number.isInteger(quantityInput.valueAsNumber) &&
      quantityInput.valueAsNumber >= 1 &&
      quantityInput.valueAsNumber <= 100;
    setFieldFeedback(
      quantityInput,
      valid,
      "Enter a whole number from 1 to 100.",
    );
    addBooksButton.disabled = !valid;
  });
  addBooksButton.addEventListener("click", async () => {
    const qty = quantityInput.valueAsNumber;
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
      setFieldFeedback(
        quantityInput,
        false,
        "Enter a whole number from 1 to 100.",
      );
      return;
    }
    await addItems(qty);
  });
  const user = await getCurrentUser();
  const isAdmin_ = await isAdmin(user);
  if (!isAdmin_) {
    window.location.href = "../index.html";
    return;
  }
  updateNavbar(isAdmin_, user);
  await Promise.all([renderItems(user), renderOrders(user)]);
});
