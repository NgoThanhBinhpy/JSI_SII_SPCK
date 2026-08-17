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

document.addEventListener("DOMContentLoaded", async () => {
  const { isAdmin_, user } = await isAdmin(true);
  createCustomCss();
  await createNavbar(isAdmin_, user);
  await renderAllBookCards(user);
});

async function renderAllBookCards(currUser) {
  const docSnap = await getDocs(collection(db, "products"));
  const sortedDocs = docSnap.docs.sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true }),
  );
  console.log(sortedDocs);
  const container = document.getElementById("book-grid");
  for (const product of sortedDocs) {
    const bookNode = document.createElement("div");
    bookNode.innerHTML = renderBookCard(product);
    container.append(bookNode);
  }
  document.getElementById("book-count").innerText =
    container.children.length + " Books";
  container.addEventListener("click", (e) => {
    const previewBtn = e.target.closest(".preview-btn");
    if (!previewBtn) return;
    const bookDoc = sortedDocs.find((c) => c.id === previewBtn.dataset.uid);
    if (!bookDoc) {
      showToast("Book not found", "danger", { message: "" });
      return;
    }
    const data = bookDoc.data();
    const info = data.volumeInfo || {};

    const { ModalEl, modal } = showModal(
      `<div class="row g-4 align-items-stretch">
                    <div class="col-md-4 text-center d-flex flex-column">
                      <div class="bg-body-tertiary p-3 rounded d-flex align-items-center justify-content-center flex-grow-1 mb-3">
                        <img 
                          class="book-modal-cover img-fluid rounded shadow"
                          src="${info.imageLinks?.thumbnail}&fife=w800-h1000"
                          style="max-height: 320px; object-fit: contain;" 
                          alt="Book Cover"
                        >
                      </div>
                      
                      <div class="d-flex flex-column gap-3"${currUser ? `` : ` data-bs-toggle="tooltip" data-bs-title="You must create an account in order to buy/add a product to cart"`}>
                        <div class="d-flex align-items-center justify-content-between bg-light p-2 rounded border">
                          <span class="fw-semibold text-secondary small me-2">Quantity</span>
                          <div class="input-group input-group-sm" style="width: 110px;">
                            <input
                              type="number"
                              class="form-control text-center px-1 fw-semibold order-quantity"
                              value="1"
                              min="1"
                              max="100"
                              ${currUser ? "" : " disabled"}
                            />
                          </div>
                        </div>

                        
                        <div class="d-flex gap-2">
                          
                          <button class="btn btn-primary flex-fill text-nowrap d-inline-flex align-items-center justify-content-center py-2 px-1 add-cart-btn" type="button"${currUser ? "" : " disabled"}>
                            <i class="bi bi-cart-plus me-1 fs-6"></i>
                            <span class="fw-semibold small">Add to cart</span>
                          </button>
                          
                          <button class="btn btn-outline-primary flex-fill text-nowrap d-inline-flex align-items-center justify-content-center py-2 px-1 place-order-btn" type="button"${currUser ? "" : " disabled"}>
                            <i class="bi bi-lightning-charge me-1 fs-6"></i>
                            <span class="fw-semibold small">Buy now</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div class="col-md-8 d-flex flex-column">
                      <h3 class="book-modal-title fw-bold mb-1" id="bookDetailModalLabel">${info.title || "N/A"}</h3>
                      <p class="book-modal-subtitle text-muted mb-3 ${!info.subtitle ? "d-none" : ""}">${info.subtitle || ""}</p>
                      <div class="h4 text-success fw-bold mb-3 book-modal-price">${data.computedPrice ? `${data.computedPrice.currency} $${data.computedPrice.amount}` : "Free"}</div>
                      
                      <div class="row row-cols-2 g-2 small text-muted mb-3 p-3 bg-light rounded border">
                        <div><i class="bi bi-person me-2 text-primary"></i><strong>Author:</strong> <span class="book-modal-authors">${info.authors?.join(", ") || "N/A"}</span></div>
                        <div><i class="bi bi-building me-2 text-primary"></i><strong>Publisher:</strong> <span class="book-modal-publisher">${info.publisher || "N/A"}</span></div>
                        <div><i class="bi bi-calendar3 me-2 text-primary"></i><strong>Published:</strong> <span class="book-modal-date">${info.publishedDate || "N/A"}</span></div>
                        <div><i class="bi bi-book me-2 text-primary"></i><strong>Length:</strong> <span class="book-modal-pages">${info.pageCount || "N/A"} pages</span></div>
                        <div><i class="bi bi-translate me-2 text-primary"></i><strong>Language:</strong> <span class="book-modal-lang">${(info.language || "N/A").toUpperCase()}</span></div>
                        <div><i class="bi bi-upc-scan me-2 text-primary"></i><strong>ID:</strong> <span class="book-modal-id">${bookDoc.id}</span></div>
                      </div>

                      <div class="mb-3">
                        <h6 class="fw-bold mb-1">Description</h6>
                        <p class="book-modal-description text-secondary small lh-base mb-0 overflow-y-auto p-2 bg-body-tertiary rounded border" style="max-height: 130px;">${info.description || "No description available"}</p>
                      </div>

                      <div class="mt-auto pt-3 border-top d-flex gap-2">
                        ${
                          data.previewLink || info.previewLink
                            ? `<a class="book-modal-preview-link btn btn-outline-secondary w-100" href="${data.previewLink || info.previewLink}" target="_blank" rel="noopener">
                          <i class="bi bi-box-arrow-up-right me-1"></i>Google Books Preview
                        </a>`
                            : ``
                        }
                        <button class="btn btn-sm btn-outline-secondary text-nowrap" data-tool="view-raw-json" data-id="${bookDoc.id}">
                      <i class="bi bi-code-slash me-1"></i> View Raw JSON
                    </button>
                      </div>
                    </div>
                  </div>`,
      info.title || "Book Details",
    );

    viewRawJsonEveLis(ModalEl, data);

    if (!currUser) {
      disposeAllTooltips();
      return;
    }

    ModalEl.addEventListener("click", async (e) => {
      const addToCartBtn = e.target.closest(".add-cart-btn"),
        placeOrderBtn = e.target.closest(".place-order-btn");
      if (addToCartBtn) {
        addToCart(data);
        document.getElementById("cart-badge").textContent = JSON.parse(
          sessionStorage.getItem("CART_KEY") ?? "[]",
        ).length;
        return;
      } else if (placeOrderBtn) {
        try {
          await createOrder(
            data,
            currUser,
            Number(document.querySelector(".order-quantity").value),
          );
          showToast("Successfully created an order", "success");
        } catch (e) {
          showToast("Erorr creating order: ", "danger", e);
        }
      }
    });

    container.addEventListener("click", (e) => {});
  });
}

function renderBookCard(doc) {
  const id = doc.id;
  const data = doc.data();
  const info = data.volumeInfo || {};

  return `
        <div class="col" id="card-${id}">
          <div class="card h-100 shadow-sm border-0">
            <div class="row g-0 h-100">
              <div class="col-5 bg-body-tertiary d-flex align-items-center justify-content-center p-3 rounded-start">
                <img 
                  src="${info.imageLinks?.thumbnail}&fife=w800-h1000" 
                  class="img-fluid rounded object-fit-contain shadow-sm mh-100" 
                  style="max-height: 220px;"
                  alt="${info.title || "Book Cover"}"
                  loading="lazy"
                />
              </div>
              <div class="col-7 d-flex flex-column">
                <div class="card-body p-3 d-flex flex-column">
                  
                  <div class="d-flex justify-content-between align-items-start mb-1">
                    <span class="badge bg-primary-subtle text-primary border border-primary-subtle">
                      ${info.categories?.[0] || "General"}
                    </span>
                    <span class="fw-bold text-success small">
                      ${data.computedPrice ? `${data.computedPrice.currency} $${data.computedPrice.amount}` : "Free"}
                    </span>
                  </div>

                  <h5 class="card-title text-truncate mb-0" title="${info.title}">${info.title}</h5>
                  ${info.subtitle ? `<p class="text-muted small text-truncate mb-2">${info.subtitle}</p>` : ""}

                  <div class="small text-muted my-2">
                    <div class="text-truncate"><i class="bi bi-person me-1"></i>${info.authors?.join(", ") || "N/A"}</div>
                    <div class="text-truncate"><i class="bi bi-building me-1"></i>${info.publisher || "N/A"}</div>
                  </div>

                  <div class="mt-auto pt-2 border-top d-flex justify-content-between align-items-center">
                    <a class="btn btn-sm btn-outline-primary preview-btn" data-uid="${id}">Preview</a>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>
      `;
}
