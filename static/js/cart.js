import {
  showToast,
  createSetThemeEl,
  removeFromCart,
  createOrder,
  updateNavbar,
  isAdmin,
  viewRawJson,
  getCurrentUser,
  setFieldFeedback,
} from "./utils.js";
import { createCustomCss } from "../../new.js";
createSetThemeEl();

function renderCart(user) {
  const cartBody = document.getElementById("cart-body");
  const cartArr = JSON.parse(sessionStorage.getItem("CART_KEY") ?? "[]");
  if (!cartArr) {
    showToast("Theres no product in cart", "info");
    return;
  }
  cartArr.forEach((element) => {
    const cardEl = renderBookCard(element);
    cartBody.appendChild(cardEl);
  });
  cartBody.addEventListener("click", (e) => {
    const actionBtn = e.target.closest("[data-action]");
    if (!actionBtn) return;

    const uid = actionBtn.dataset.uid;
    const action = actionBtn.dataset.tool;

    const cartDoc = cartArr.find((e) => e.id === uid);
    if (!cartDoc) return;

    switch (action) {
      case "place-order": {
        try {
          const quantityPicker = cartBody.querySelector(
            `.quantity-picker[data-id="${uid}"]`,
          );
          createOrder(
            cartArr.find((c) => c.id === uid),
            user,
            Number(quantityPicker.value),
          );
          showToast("Successfully created an order", "success");
        } catch (e) {
          showToast("Error creating order", "danger", e);
        }
        break;
      }

      case "view-raw-json": {
        viewRawJson(cartDoc);
        break;
      }

      case "delete": {
        removeFromCart(cartDoc);
      }
    }
  });
}

function renderBookCard(item) {
  const cardEl = document.createElement("div");
  cardEl.className = "card border shadow-sm";
  cardEl.innerHTML = `
  <div class="card-body p-3">
    <div class="row g-3 align-items-center">
      <div class="col-3 col-sm-2 text-center">
        <img 
          src="${item?.coverUrl}&fife=w800-h1000" 
          alt="${item?.title}" 
          class="img-fluid rounded border" 
          style="max-height: 90px; object-fit: contain;"
        >
      </div>
      <div class="col-9 col-sm-4">
        <h6 class="fw-bold mb-1 text-truncate">${item?.title || "Untitled"}</h6>
        <p class="text-muted small mb-0">${item?.authors?.join(", ") || "Unknown Author"}</p>
        <div class="text-success fw-semibold mt-1">
          ${item.computedPrice ? `$${item.computedPrice.amount}` : "Free"}
        </div>
      </div>
      <div class="col-7 col-sm-3">
        <div class="input-group input-group-sm" style="max-width: 120px;">
          <input 
            type="number" 
            class="form-control text-center fw-semibold px-1 quantity-picker" 
            value="1" 
            min="1" 
            max="100" 
            data-id="${item.id}"
          >
          <div class="invalid-feedback">Enter a whole number from 1 to 100.</div>
          <div class="valid-feedback">Quantity is valid.</div>
        </div>
      </div>
      <div class="col-5 col-sm-3 text-end d-flex flex-column align-items-end justify-content-between">
        <button class="btn btn-link text-decoration-none flex-fill text-nowrap d-inline-flex align-items-center justify-content-center py-2 px-1" data-tool="place-order" data-action type="button" data-uid="${item.id}">
            <i class="bi bi-lightning-charge me-1 fs-6"></i>
            <span class="fw-semibold small">Buy now</span>
        </button>
        <button class="btn btn-link text-danger p-0 mt-2 text-decoration-none small" data-tool="delete" data-action data-uid="${item.id}">
          <i class="bi bi-trash3 me-1"></i> Remove
        </button>
        <button class="btn btn-link text-secondary text-decoration-none" data-tool="view-raw-json" data-action data-uid="${item.id}">
            <i class="bi bi-code-slash me-1"></i> View Raw JSON
          </button>
      </div>

    </div>
  </div>`;
  const quantityPicker = cardEl.querySelector(".quantity-picker");
  quantityPicker.addEventListener("input", () => {
    const valid =
      Number.isInteger(quantityPicker.valueAsNumber) &&
      quantityPicker.valueAsNumber >= 1 &&
      quantityPicker.valueAsNumber <= 100;
    setFieldFeedback(
      quantityPicker,
      valid,
      "Enter a whole number from 1 to 100.",
    );
  });
  return cardEl;
}

document.addEventListener("DOMContentLoaded", async () => {
  createCustomCss();
  const user = await getCurrentUser();
  renderCart(user);
  const isAdmin_ = await isAdmin(user);
  updateNavbar(isAdmin_, user);
});
