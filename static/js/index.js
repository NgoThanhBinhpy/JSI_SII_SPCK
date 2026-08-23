import {
  auth,
  signOut,
  db,
  serverTimestamp,
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
} from "./firebase-config.js";
import {
  showToast,
  isAdmin,
  createNavbar,
  showModal,
  getCurrentUser,
  addToCart,
  createOrder,
  viewRawJsonEveLis,
  renderQueryResult,
  createSetThemeEl,
} from "./utils.js";
import { createCustomCss } from "../../new.js";

function disposeAllTooltips() {
  const tooltipTriggerList = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]',
  );
  const tooltipList = [...tooltipTriggerList].map(
    (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl),
  );
  return;
}

async function renderAllBookCards(currUser) {
  const docRef = collection(db, "products");
  const container = document.getElementById("book-grid");
  const sortedDocs = await renderQueryResult(docRef, container, renderBookCard);
  document.getElementById("book-count").textContent =
    container.children.length + " Books";
  container.addEventListener("click", (e) => {
    const previewBtn = e.target.closest(".view-metadata");
    if (!previewBtn) return;
    const bookDoc = sortedDocs.find((c) => c.id === previewBtn.dataset.uid);
    if (!bookDoc) {
      showToast("Book not found", "danger", { message: "" });
      return;
    }
    const data = bookDoc.data();
    const info = data.volumeInfo || {};

    const { ModalEl, modal } = showModal(
      `<div class="row g-4 align-items-start">
      <div class="col-md-4 text-center">
        <img 
          class="img-fluid rounded-3 shadow-sm object-fit-contain"
          src="${info.imageLinks?.thumbnail ? `${info.imageLinks.thumbnail}&fife=w800-h1000` : ""}"
          style="max-height: 280px;" 
          alt="${info.title || "Book Cover"}"
        >
      </div>
      
      <div class="col-md-8">
        <span class="badge bg-primary-subtle text-primary border border-primary-subtle mb-2">
          ${info.categories?.join(", ") || "General"}
        </span>
        <h4 class="fw-bold mb-1 lh-sm">${info.title || "N/A"}</h4>
        ${info.subtitle ? `<p class="text-muted small mb-2">${info.subtitle}</p>` : ""}
        
        <h5 class="text-success fw-bold mb-3">
          ${data.computedPrice ? `${data.computedPrice.currency} $${data.computedPrice.amount}` : "Free"}
        </h5>

        <div class="row g-2 small text-secondary border-top py-3 mb-3">
          <div class="col-6 text-truncate">
            <i class="bi bi-person me-1 text-primary"></i><strong>Author:</strong> 
            <span class="text-body">${info.authors?.join(", ") || "N/A"}</span>
          </div>
          <div class="col-6 text-truncate">
            <i class="bi bi-building me-1 text-primary"></i><strong>Publisher:</strong> 
            <span class="text-body">${info.publisher || "N/A"}</span>
          </div>
          <div class="col-6 text-truncate">
            <i class="bi bi-calendar3 me-1 text-primary"></i><strong>Published:</strong> 
            <span class="text-body">${info.publishedDate || "N/A"}</span>
          </div>
          <div class="col-6 text-truncate">
            <i class="bi bi-book me-1 text-primary"></i><strong>Pages:</strong> 
            <span class="text-body">${info.pageCount || "N/A"}</span>
          </div>
          <div class="col-6 text-truncate">
            <i class="bi bi-translate me-1 text-primary"></i><strong>Language:</strong> 
            <span class="text-body">${(info.language || "N/A").toUpperCase()}</span>
          </div>
          <div class="col-6 text-truncate">
            <i class="bi bi-hash me-1 text-primary"></i><strong>ID:</strong> 
            <span class="font-monospace text-body">${bookDoc.id}</span>
          </div>
        </div>

      </div>
    </div>

    <div>
      <div>
        <h6 class="fw-bold mb-1 text-dark"><i class="bi bi-card-text me-1 text-primary"></i> Description</h6>
        <p class="text-secondary small lh-base mb-0 overflow-y-auto" style="max-height: 120px;">
          ${info.description || "No description available"}
        </p>
      </div>
    </div>

    <div class="pt-3 border-top mt-4 d-flex gap-2">
      ${
        data.previewLink || info.previewLink
          ? `<a class="btn btn-sm btn-outline-secondary flex-grow-1" href="${data.previewLink || info.previewLink}" target="_blank" rel="noopener">
        <i class="bi bi-box-arrow-up-right me-1"></i> Google Books Preview
      </a>`
          : ""
      }
    </div>`,
      info.title || "Book Details",
    );
    if (!currUser) {
      disposeAllTooltips();
      return;
    }
  });
}

function renderBookCard(doc) {
  const id = doc.id;
  const data = doc.data();
  const info = data.volumeInfo || {};

  const cardEl = document.createElement("div");
  cardEl.className = "col";
  cardEl.innerHTML = `
      <div class="card h-100 shadow-sm border-0 rounded-3 overflow-hidden">
        
        <div class="card-header bg-body-secondary border-0 py-2 px-3 d-flex justify-content-between align-items-center">
          <span class="badge bg-primary-subtle text-primary border border-primary-subtle text-truncate" style="max-width: 120px;">
            ${info.categories?.[0] || "General"}
          </span>
          <span class="fw-bold text-success small">
            ${data.computedPrice ? `${data.computedPrice.currency} $${data.computedPrice.amount}` : "Free"}
          </span>
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
                <a class="dropdown-item view-metadata" href="#" data-uid="${id}">
                  <i class="bi bi-journal-text me-1"></i>View Metadata
                </a>
              </li>
              <li><hr class="dropdown-divider"></li>
            </ul>
        </div>

        <div class="card-body p-3">
          <div class="row g-3 align-items-center">
            <div class="col-4 bg-body-tertiary d-flex align-items-center justify-content-center p-2 rounded">
              <img 
                src="${info.imageLinks?.thumbnail}&fife=w800-h1000" 
                class="img-fluid rounded object-fit-contain shadow-sm mh-100" 
                style="max-height: 140px;"
                alt="${info.title || "Book Cover"}"
                loading="lazy"
              />
            </div>
            <div class="col-8">
              <h6 class="card-title text-truncate fw-bold mb-1" title="${info.title}">${info.title}</h6>
              ${info.subtitle ? `<p class="text-muted small text-truncate mb-2">${info.subtitle}</p>` : ""}

              <div class="small text-muted">
                <div class="text-truncate mb-1">
                  <i class="bi bi-person me-1 text-primary"></i>${info.authors?.join(", ") || "N/A"}
                </div>
                <div class="text-truncate">
                  <i class="bi bi-building me-1 text-primary"></i>${info.publisher || "N/A"}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
  `;
  viewRawJsonEveLis(cardEl, data);
  return cardEl;
}

document.addEventListener("DOMContentLoaded", async () => {
  createSetThemeEl();
  const { isAdmin_, user } = await isAdmin(true);
  createCustomCss();
  await createNavbar(isAdmin_, user);
  await renderAllBookCards(user);
});
