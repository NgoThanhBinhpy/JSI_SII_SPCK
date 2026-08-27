import {
  showToast,
  isAdmin,
  viewRawJsonEveLis,
  deleteDocEveLis,
  editJsonEveLis,
  renderQueryResult,
  createSetThemeEl,
  updateNavbar,
  getCurrentUser,
} from "./utils.js";
import { db, collection } from "./firebase-config.js";
import { createCustomCss } from "../../new.js";

// Initialize UI theme elements
createSetThemeEl();

function renderItem(docSnap) {
  const data = docSnap.data();
  const docSnapId = docSnap.id;
  const cardCol = document.createElement("div");
  cardCol.className = "col-12 col-md-6 col-lg-4";
  cardCol.dataset.parentId = docSnapId;

  // Safe navigation fallbacks
  const volumeInfo = data.volumeInfo || {};
  const title = volumeInfo.title || "Untitled";
  const subtitle = volumeInfo.subtitle || "";
  const authors = volumeInfo.authors?.join(", ") || "Unknown Author";
  const publisher = volumeInfo.publisher || "Unknown Publisher";
  const publishedDate = volumeInfo.publishedDate?.replace(/-/g, "/") || "N/A";
  const categories = volumeInfo.categories?.join(", ") || "General";

  const price = data.computedPrice
    ? `${data.computedPrice.amount} ${data.computedPrice.currency}`
    : "Free";

  const rawImageLink =
    volumeInfo.imageLinks?.thumbnail ||
    volumeInfo.imageLinks?.smallThumbnail ||
    "";
  const coverUrl = rawImageLink
    ? `${rawImageLink}&fife=w800-h1000`
    : `https://books.google.com/books/publisher/content/images/frontcover/${docSnapId}?fife=w800-h1000&source=gbs_api`;

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
                <a class="dropdown-item" data-tool="view-raw-json" href="#">
                  <i class="bi bi-code-slash me-2 text-info"></i>View Raw JSON
                </a>
              </li>
              <li>
                <a class="dropdown-item" data-tool="edit-json" href="#" data-collection="products" data-uid="${docSnapId}">
                  <i class="bi bi-pencil-square me-2 text-warning"></i>Edit Document JSON
                </a>
              </li>
              <li><hr class="dropdown-divider"></li>
              <li>
                <a href="#" class="dropdown-item text-danger" data-tool="delete" data-collection="products" data-uid="${docSnapId}">
                  <i class="bi bi-trash me-2"></i>Delete Product
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div class="card-body p-2 d-flex flex-column justify-content-between gap-2">
        <div class="d-flex gap-3 align-items-start">
          <img src="${coverUrl}" alt="${title}" class="rounded object-fit-cover shadow-sm flex-shrink-0" style="width: 7.5rem; height: 9rem;" />
          <div class="overflow-hidden">
            <p class="card-title text-truncate mb-0 mt-2 fs-5 fw-semibold" title="${title}">${title}</p>
            ${subtitle ? `<p class="text-truncate mb-2">${subtitle}</p>` : ""}
            <p class="card-subtitle text-muted small mb-1 text-truncate"><i class="bi bi-person me-1 text-primary"></i>${authors}</p>
            <small class="text-muted d-block text-truncate"><i class="bi bi-building me-1 text-primary"></i>${publisher} • ${publishedDate}</small>
          </div>
        </div>
      </div>
      <div class="card-footer p-2 d-flex flex-column justify-content-between gap-2 bg-body">
        <div class="d-flex align-items-center justify-content-between pt-2">
          <span class="badge text-body bg-body border text-truncate" style="max-width: 140px;">${categories}</span>
          <span class="fw-bold text-success fs-6">${price}</span>
        </div>
      </div>
    </div>
  `;

  viewRawJsonEveLis(cardCol, data);
  editJsonEveLis(cardCol, docSnap, renderItem);
  return cardCol;
}

async function renderItems() {
  try {
    const container = document.querySelector("#products-container");
    if (container) {
      await renderQueryResult(
        collection(db, "products"),
        container,
        renderItem,
      );
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
      ? `${data.pricing.totalAmount} ${data.pricing.unitPrice.currency}`
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
                <a class="dropdown-item" data-tool="view-raw-json" href="#">
                  <i class="bi bi-code-slash me-2 text-info"></i>View Raw JSON
                </a>
              </li>
              <li>
                <a class="dropdown-item" data-tool="edit-json" href="#" data-collection="orders" data-uid="${docSnapId}">
                  <i class="bi bi-pencil-square me-2 text-warning"></i>Edit Document JSON
                </a>
              </li>
              <li><hr class="dropdown-divider"></li>
              <li>
                <a href="#" class="dropdown-item text-danger" data-tool="delete" data-collection="orders" data-uid="${docSnapId}">
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

  viewRawJsonEveLis(cardCol, data);
  editJsonEveLis(cardCol, docSnap, renderOrder);
  return cardCol;
}

async function renderOrders() {
  try {
    const container = document.querySelector("#orders-container");
    if (container) {
      await renderQueryResult(collection(db, "orders"), container, renderOrder);
    }
  } catch (error) {
    showToast("Failed to load orders: ", "danger", error);
  }
}

// Global initialization logic
document.addEventListener("DOMContentLoaded", async () => {
  // Fire static CSS initialization
  createCustomCss();

  // Attach global delete action listener
  deleteDocEveLis();

  // Fetch current user safely
  const user = await getCurrentUser().catch((err) => {
    console.error("Auth fetch failed:", err);
    return null;
  });

  if (!user) {
    window.location.href = "../index.html";
    return;
  }

  // Check admin privileges safely
  const isAdmin_ = await isAdmin(user).catch((err) => {
    console.error("Admin verification failed:", err);
    return false;
  });

  if (!isAdmin_) {
    window.location.href = "../index.html";
    return;
  }

  // Update navbar layout
  updateNavbar(isAdmin_, user);

  // Fetch and render data collections concurrently
  await Promise.all([renderItems(), renderOrders()]);
});
