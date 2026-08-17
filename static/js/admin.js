import {
  showToast,
  isAdmin,
  showModal,
  viewRawJsonEveLis,
  deleteDocEveLis,
  calculateBookPrice,
  addItems,
  editJsonEveLis,
} from "./utils.js";
import {
  doc,
  getDocs,
  db,
  serverTimestamp,
  onAuthStateChanged,
  auth,
  collection,
  deleteDoc,
} from "./firebase-config.js";
import { createCustomCss } from "../../new.js";

function renderItem(data, docSnapId) {
  const trEl = document.createElement("tr");
  trEl.dataset.parentId = docSnapId;
  trEl.innerHTML = `
      <td>${docSnapId || "No data available"}</td>
      <td>${data.volumeInfo?.title || "No data available"}</td>
      <td>${data.volumeInfo?.publisher || "No data available"}</td>
      <td>
        ${data.volumeInfo?.publishedDate?.replace(/-/g, "/") || "No data available"}
      </td>
      <td>${data.volumeInfo?.authors?.join(", ") || "No data available"}</td>
      <td>
        ${data.computedPrice ? `${data.computedPrice.amount} ${data.computedPrice.currency}` : "No data available"}
      </td>
      <td>${data.volumeInfo?.categories?.join(", ") || "No data available"}</td>
      <td>
        <div class="dropdown" data-bs-auto-close="outside">
          <button 
            class="btn btn-sm btn-outline-secondary dropdown-toggle" 
            type="button" 
            data-bs-toggle="dropdown" 
            aria-expanded="false"
          >
            <i class="bi bi-three-dots"></i>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm">
            <li>
              <a class="dropdown-item" data-tool="view-raw-json" href="#">
                <i class="bi bi-code-slash me-2"></i>View Raw JSON
              </a>
            </li>

            <li>
              <a class="dropdown-item" data-tool="edit-json" href="#" data-collection="orders" data-uid="${docSnapId}">
                <i class="bi bi-file-earmark-code me-2 text-warning"></i>Edit Document JSON
              </a>
            </li>

            <li><hr class="dropdown-divider"></li>

            <li>
              <a href="#" class="dropdown-item text-danger" data-tool="delete" data-collection="products" data-uid="${docSnapId}">
                <i class="bi bi-trash me-2"></i>Delete product
              </a>
            </li>
          </ul>
        </div>
      </td>`;
  viewRawJsonEveLis(trEl, data);
  editJsonEveLis(trEl, data, renderItem);
  return trEl;
}

async function renderItems() {
  try {
    const product_tbody = document.querySelector("#products-table-body");
    product_tbody.innerHTML = "";
    const querySnapshot = await getDocs(collection(db, "products"));
    const sortedDocs = querySnapshot.docs.sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true }),
    );
    console.log(sortedDocs);
    sortedDocs.forEach((docSnap) => {
      const trEl = renderItem(docSnap.data(), docSnap.id);
      product_tbody.appendChild(trEl);
    });
  } catch (error) {
    showToast("Failed to load products: ", "danger", error);
  }
}

function renderOrder(data, docSnapId) {
  const trEl = document.createElement("tr");
  trEl.dataset.parentId = docSnapId;
  trEl.innerHTML = `
      <td>${docSnapId || "No data available"}</td>
      <td>${data.customer?.email || "No data available"}</td>
      <td>${data.item?.title}</td>
      <td>${data.pricing?.totalAmount + " " + data.pricing?.unitPrice?.currency || "No data avaliable"}</td>
      <td>${data.quantity || "No data available"}</td>
      <td>
        ${data.status || "No data available"}
      </td>
      <td>
        <div class="dropdown" data-bs-auto-close="outside">
          <button 
            class="btn btn-sm btn-outline-secondary dropdown-toggle" 
            type="button" 
            data-bs-toggle="dropdown" 
            aria-expanded="false"
          >
            <i class="bi bi-three-dots"></i>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm">
            <li>
              <a class="dropdown-item" data-tool="view-raw-json" href="#">
                <i class="bi bi-code-slash me-2"></i>View Raw JSON
              </a>
            </li>

            <li>
              <a class="dropdown-item" data-tool="edit-json" href="#" data-collection="orders" data-uid="${docSnapId}">
                <i class="bi bi-file-earmark-code me-2 text-warning"></i>Edit Document JSON
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
      </td>`;
  viewRawJsonEveLis(trEl, data);
  editJsonEveLis(trEl, data, renderOrder, docSnapId);
  return trEl;
}

async function renderOrders() {
  try {
    const order_tbody = document.querySelector("#orders-table-body");
    order_tbody.innerHTML = "";
    const querySnapshot = await getDocs(collection(db, "orders"));
    const sortedDocs = querySnapshot.docs.sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true }),
    );
    console.log(sortedDocs);
    sortedDocs.forEach((docSnap) => {
      const trEl = renderOrder(docSnap.data(), docSnap.id);
      order_tbody.appendChild(trEl);
    });
  } catch (error) {
    showToast("Failed to load orders: ", "danger", error);
  }
}

document.getElementById("add-books-btn").addEventListener("click", async () => {
  await addItems(document.getElementById("add-books-quantity").value);
  await renderItems();
});

document.addEventListener("DOMContentLoaded", async () => {
  const { isAdmin_, user } = await isAdmin(true);
  if (!isAdmin_) window.location.href = "../index.html";
  await renderItems();
  await renderOrders();
  createCustomCss();
  deleteDocEveLis();
});
