import { db, collection } from "./firebase-config.js";
import {
  showToast,
  updateNavbar,
  showModal,
  addToCart,
  createOrder,
  renderQueryResult,
  createSetThemeEl,
  getCurrentUser,
  isAdmin,
  renderUniversalProductCard,
  viewMetadata,
  editJson,
  viewRawJson,
} from "./utils.js";
import { createCustomCss } from "../../new.js";
createSetThemeEl();

async function renderAllBookCards(currUser) {
  const docRef = collection(db, "products");
  const container = document.getElementById("book-grid");
  const sortedDocs = await renderQueryResult(
    docRef,
    container,
    renderUniversalProductCard,
    [currUser ? "user" : "guest"],
  );
  document.getElementById("book-count").textContent =
    container.children.length + " Books";
  container.addEventListener("click", async (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.tool;
    const bookId = target.dataset.uid;

    const bookDoc = sortedDocs.find((doc) => doc.id === bookId);
    if (!bookDoc) return;

    const productData = bookDoc.data();

    switch (action) {
      case "add-to-cart": {
        const cartBadge = document.querySelector("#cart-badge");
        addToCart(productData, cartBadge);
        break;
      }

      case "place-order": {
        const cardFooter =
          target.closest(".card-footer") || target.closest(".card-body");
        const qtyInput = cardFooter?.querySelector(".qty-selector");
        const qty = Number(qtyInput?.value || 1);

        await createOrder(productData, currUser, qty);
        break;
      }

      case "view-metadata": {
        viewMetadata(bookDoc);
        break;
      }

      case "view-raw-json": {
        viewRawJson(productData);
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  createCustomCss();
  const user = await getCurrentUser();
  renderAllBookCards(user);
  const isAdmin_ = await isAdmin(user);
  updateNavbar(isAdmin_, user);
});
