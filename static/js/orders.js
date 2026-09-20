import { collection, where, query, db } from "./firebase-config.js";
import {
  initBasicThings,
  showToast,
  isAdmin,
  viewRawJson,
  renderQueryResult,
  updateNavbar,
  getCurrentUser,
  viewMetadata,
} from "./utils.js";
async function renderAllOrders(user) {
  const uid = user.uid;
  const container = document.getElementById("orders-container");
  if (!uid) {
    container.innerHTML = "You must login in order to view your orders";
    showToast("You must login in order to view your orders", "warning");
    return;
  }
  try {
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where("customer.uid", "==", uid));
    const sortedDocs = await renderQueryResult(q, container, renderOrderCard);
    container.addEventListener("click", async (e) => {
      const target = e.target.closest("[data-action]");
      if (!target) return;

      const action = target.dataset.tool;
      const orderId = target.dataset.uid;

      const orderDoc = sortedDocs.find((doc) => doc.id === orderId);
      if (!orderDoc) return;

      const orderData = orderDoc.data();

      switch (action) {
        case "view-raw-json": {
          viewRawJson(orderData.item);
          break;
        }
        case "view-metadata": {
          viewMetadata({
            data: () => orderData.item,
            exists: () => true,
            id: orderId,
          });
        }
      }
    });
  } catch (e) {
    showToast("Error querying orders: ", "danger", e);
  }

  document.querySelector("#total-orders-count").textContent =
    document.querySelectorAll(".order-card").length;
  document.querySelector("#processing-orders-count").textContent =
    document.querySelectorAll(".bi.bi-gear-wide-connected").length;
  document.querySelector("#delivered-orders-count").textContent =
    document.querySelectorAll(".bi.bi-check-circle").length;
}

function renderOrderCard(orderDoc) {
  const orderId = orderDoc.id || "N/A";
  const data = orderDoc.data();

  const { status, paymentStatus, quantity, pricing, item, createdAt } = data;

  const unitPrice =
    pricing?.unitPrice?.amount || pricing?.unitPrice?.amount || 0;
  const currency =
    pricing?.unitPrice?.currency || pricing?.unitPrice?.currency || "USD";
  const shippingFee = pricing?.shippingFee || 0;
  const totalAmount = unitPrice * quantity + shippingFee;

  let dateObj = null;

  if (createdAt instanceof Date) {
    dateObj = createdAt;
  } else if (typeof createdAt?.toDate === "function") {
    dateObj = createdAt.toDate();
  } else if (createdAt?.seconds) {
    dateObj = new Date(createdAt.seconds * 1000);
  } else {
    dateObj = new Date();
  }

  const formattedDate = dateObj.toLocaleDateString(
    navigator.language || "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
  );

  const isProcessing = status === "processing" || status === "pending";
  const statusBadgeClass = isProcessing ? "bg-warning text-dark" : "bg-success";
  const statusIcon = isProcessing
    ? "bi-gear-wide-connected"
    : "bi-check-circle";
  const cardEl = document.createElement("div");
  cardEl.className = "w-100 order-card";
  cardEl.dataset.parentId = orderId;
  cardEl.innerHTML = `
      <div class="card border-0 shadow-sm">
        
        <div class="card-header bg-body py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <span class="text-muted small">Order ID:</span>
            <strong class="font-monospace ms-1">${orderId}</strong>
            <span class="text-muted small ms-3"><i class="bi bi-calendar3 me-1"></i>${formattedDate}</span>
          </div>
          <div>
            <span class="badge ${statusBadgeClass}">
              <i class="bi ${statusIcon} me-1"></i> ${status.toUpperCase()}
            </span>
            <span class="badge bg-success ms-1">
              <i class="bi bi-credit-card me-1"></i> ${paymentStatus.toUpperCase()}
            </span>
          </div>
        </div>
        
        <div class="card-body p-4">
          <div class="d-flex flex-column flex-sm-row align-items-start align-items-sm-center gap-3">
            <img 
              src="${item?.coverUrl || "https://via.placeholder.com/70x100?text=No+Cover"}" 
              alt="${item?.title || "Book Cover"}" 
              class="rounded border img-fluid object-fit-cover" 
              style="width: 160px; height: 200px;"
            >
            
            <div class="flex-grow-1">
              <h5 class="fw-semibold mb-1">${item?.title || "Untitled Product"}</h5>
              <p class="text-muted small mb-1">
                Quantity: <strong>${quantity}</strong> | Unit Price: <strong>$${unitPrice.toFixed(2)} ${currency}</strong>
              </p>
                <a class="btn btn-link no-text-decoration" data-tool="view-metadata" data-action href="#" data-uid="${orderId}">
                  <i class="bi bi-journal-text me-1"></i>View Metadata
                </a>
            </div>

            <div class="text-sm-end mt-2 mt-sm-0">
              <span class="text-muted small d-block">Total Amount</span>
              <span class="fs-4 fw-bold text-primary">$${totalAmount.toFixed(2)} ${currency}</span>
              <span class="text-muted small d-block">(Incl. $${shippingFee.toFixed(2)} shipping)</span>
            </div>
          </div>
        </div>

        <div class="card-footer bg-body-tertiary py-2 d-flex justify-content-between align-items-center">
          <div>
            ${
              isProcessing
                ? `
              <button class="btn btn-sm btn-outline-danger" data-tool="delete" data-collection="orders" data-uid="${orderId}">
                <i class="bi bi-x-circle me-1"></i> Cancel Order
              </button>
            `
                : `
              <span class="text-muted small"><i class="bi bi-info-circle me-1"></i> Order is ${status}</span>
            `
            }
          </div>
          
          <button class="btn btn-sm btn-outline-secondary" data-action data-tool="view-raw-json" data-uid="${orderId}">
            <i class="bi bi-code-slash me-1"></i> View Raw JSON
          </button>
        </div>

      </div>
  `;
  return cardEl;
}

document.addEventListener("DOMContentLoaded", async () => {
  initBasicThings();
  const user = await getCurrentUser();
  renderAllOrders(user);
  const isAdmin_ = await isAdmin(user);
  updateNavbar(isAdmin_, user);
});
