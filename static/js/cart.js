import {
  showToast,
  createSetThemeEl,
  removeFromCart,
  createOrder,
  getCurrentUser,
  viewRawJsonEveLis,
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
    const placeOrderBtn = e.target.closest(".place-order-btn");
    if (placeOrderBtn) {
      try {
        const cardId = placeOrderBtn.dataset.id;
        const quantityPicker = cartBody.querySelector(
          `.quantity-picker[data-id="${cardId}"]`,
        );
        createOrder(
          cartArr.find((c) => c.id === cardId),
          user,
          Number(quantityPicker.value),
        );
        showToast("Successfully created an order", "success");
      } catch (e) {
        showToast("Error creating order", "danger", e);
      }
      return;
    }
  });
}

function renderBookCard(item) {
  const data = item.volumeInfo;
  const cardEl = document.createElement("div");
  cardEl.className = "card border shadow-sm";
  cardEl.innerHTML = `
  <div class="card-body p-3">
    <div class="row g-3 align-items-center">
      <div class="col-3 col-sm-2 text-center">
        <img 
          src="${data?.imageLinks?.thumbnail}&fife=w800-h1000" 
          alt="${data?.title}" 
          class="img-fluid rounded border" 
          style="max-height: 90px; object-fit: contain;"
        >
      </div>
      <div class="col-9 col-sm-4">
        <h6 class="fw-bold mb-1 text-truncate">${data?.title || "Untitled"}</h6>
        <p class="text-muted small mb-0">${data?.authors?.join(", ") || "Unknown Author"}</p>
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
        </div>
      </div>
      <div class="col-5 col-sm-3 text-end d-flex flex-column align-items-end justify-content-between">
        <button class="btn btn-link text-decoration-none flex-fill text-nowrap d-inline-flex align-items-center justify-content-center py-2 px-1 place-order-btn" type="button" data-id="${item.id}">
            <i class="bi bi-lightning-charge me-1 fs-6"></i>
            <span class="fw-semibold small">Buy now</span>
        </button>
        <button class="btn btn-link text-danger p-0 mt-2 text-decoration-none small" data-tool="delete" data-id="${item.id}">
          <i class="bi bi-trash3 me-1"></i> Remove
        </button>
        <button class="btn btn-link text-secondary text-decoration-none" data-tool="view-raw-json" data-id="${item.id}">
            <i class="bi bi-code-slash me-1"></i> View Raw JSON
          </button>
      </div>

    </div>
  </div>`;
  viewRawJsonEveLis(cardEl, item);
  return cardEl;
}

document.addEventListener("DOMContentLoaded", async () => {
  createCustomCss();
  const currUser = await getCurrentUser();
  renderCart(currUser);
  document.body.addEventListener("click", (e) => {
    const removeBtn = e.target.closest('[data-tool=delete""]');
    if (!removeBtn) return;
    console.log(removeBtn);
    removeFromCart({ id: removeBtn.dataset.id });
  });
});
