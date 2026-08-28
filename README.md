# Book Collection Web App

## Overview

This project is a small personal browser-based book store. It uses plain HTML, JavaScript ES modules, Bootstrap, Firebase Authentication, Cloud Firestore, and the FreeAPI public books API. It is intentionally kept simple and does not use Vite, a build system, a project CLI, or environment files.

Visitors can browse books, inspect metadata, select a theme, and open book previews. Authenticated users can sign in, register, use Google or GitHub authentication, add books to a session-based cart, place orders, and view or cancel their own orders. Administrators can manage product and order documents through an admin panel.

The application is a multi-page website rather than a single-page application. Each HTML page loads the JavaScript module responsible for that page. Shared behavior is organized under `static/js/utils/`, while `static/js/utils.js` re-exports those helpers through one convenient entry point.

## Pages

| Page                | Entry script          | Purpose                                                                                          |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| `index.html`        | `static/js/index.js`  | Loads and displays the product collection as book cards.                                         |
| `pages/auth.html`   | `static/js/auth.js`   | Email/password registration and login, plus Google and GitHub sign-in.                           |
| `pages/cart.html`   | `static/js/cart.js`   | Displays books saved in `sessionStorage` and allows an item to be ordered or removed.            |
| `pages/orders.html` | `static/js/orders.js` | Shows the current user's orders, totals, statuses, and cancellation controls.                    |
| `pages/admin.html`  | `static/js/admin.js`  | Allows administrators to inspect, edit, and delete products and orders.                          |
| `pages/user.html`   | `static/js/user.js`   | Displays account information, verifies email addresses, changes passwords, and deletes accounts. |

All pages use Bootstrap for layout, components, modals, dropdowns, alerts, and theme support. Bootstrap Icons and Font Awesome provide icons.

## Application Flow

1. A page imports `firebase-config.js`, which imports the project settings from `config.js`, initializes Firebase, and exports the Authentication, Firestore, Storage, and Analytics clients plus Firebase helper functions.
2. Page scripts call `createSetThemeEl()` to add the fixed theme selector and apply the saved theme.
3. Pages that need login state call `getCurrentUser()` or `isAdmin()`.
4. The home page calls `renderQueryResult()` for the `products` collection and uses `renderBookCard()` to create each card.
5. A signed-in user can save a complete product object to the browser's `sessionStorage` under `CART_KEY`.
6. Ordering creates a new document in the Firestore `orders` collection. The order stores customer information, item information, quantity, pricing, status, and timestamps.
7. The orders page queries only orders whose nested `customer.uid` matches the signed-in user.
8. The admin page renders both `products` and `orders`, and uses shared JSON viewing, JSON editing, and deletion helpers.

## Data Sources and Storage

### Firestore collections

- `users/{uid}` stores the user's email, UID, role, creation timestamp, and last sign-in timestamp.
- `products/{productId}` stores book data returned by FreeAPI and a generated `computedPrice` object.
- `orders/{orderId}` stores purchases created by users.
- `roles/{roleId}` is available in the rules for role-related data, although the page scripts do not currently use it directly.

### Browser storage

- `sessionStorage.CART_KEY` contains the current browser session's cart as a JSON array.
- `localStorage.color-scheme-preference` stores the selected Bootstrap theme.

### External services

- Firebase modules are loaded from `gstatic.com`.
- Bootstrap and icon styles/scripts are loaded from CDNs.
- Books are imported from `https://api.freeapi.app/api/v1/public/books`.
- Google Books cover and preview URLs may be stored with product or order data.

## JavaScript Modules

### `static/js/config.js`

Stores the Firebase project configuration as `firebaseConfig`. This is the local configuration module used by `firebase-config.js`.

### `static/js/firebase-config.js`

Imports the Firebase configuration from `config.js`, initializes the Firebase application, and exports `auth`, `db`, `storage`, and `analytics`. It also re-exports the Firebase Auth and Firestore functions used by the rest of the application, including document operations, queries, batches, provider authentication, linking, re-authentication, email verification, password updates, and user deletion.

### `static/js/index.js`

Adds the theme selector, checks whether the visitor is an administrator, updates the shared navigation bar, loads the `products` collection, and renders product cards. Product cards support metadata previews, raw JSON inspection, adding to the cart, and immediate ordering.

### `static/js/auth.js`

Reads the email and password fields, validates that both are present, and delegates email login and registration to shared utility functions. It also maps the Google and GitHub buttons to provider sign-in.

### `static/js/cart.js`

Reads the cart from `sessionStorage`, renders each saved book, and provides Buy Now, Remove, and View Raw JSON actions. It delegates order creation and removal to `utils.js`.

### `static/js/orders.js`

Gets the signed-in user, queries orders by `customer.uid`, renders order cards, calculates display totals, counts processing and delivered orders, and enables cancellation through the shared deletion helper.

### `static/js/admin.js`

Checks administrator access before rendering product and order collections. It creates compact management cards and enables viewing raw JSON, editing a document's JSON payload, and deleting products or orders.

### `static/js/user.js`

Loads the current Firebase user, renders the account email and UID, shows the account's verification or provider status, and wires the Verify, Update, and Delete Account controls to shared utility functions.

### `new.js`

Exports `createTreeViewer()` and `createCustomCss()`. These utilities provide a small expandable tree viewer for raw objects and inject the dark console-tree styles used by raw JSON modals.

## Shared Utility Modules

`static/js/utils.js` is a barrel module. It re-exports every public helper from the three focused modules below, so page scripts can continue importing shared functions from `./utils.js`.

### `static/js/utils/auth-utils.js`

Contains Firebase Authentication helpers, including account creation, email and provider sign-in, authentication-state lookup, provider linking, sensitive-action re-authentication, account deletion, and password changes.

### `static/js/utils/ui-utils.js`

Contains browser UI helpers for Bootstrap toasts, modals, raw JSON viewing, relative navigation paths, the shared navbar, pricing calculation, and theme selection.

### `static/js/utils/db-utils.js`

Contains Firestore and data helpers for query rendering, admin document deletion and JSON editing, user-role lookup, administrator checks, order creation, cart storage, and importing books from FreeAPI.

The function reference below is grouped by the module that owns each function.

## Authentication Utility Functions

### `AUTH_ERROR_MESSAGES`

An object in `auth-utils.js` mapping Firebase Auth error message keys to friendlier messages. It covers recent-login requirements, credential mismatches, incorrect passwords, rate limiting, disabled or missing accounts, duplicate email addresses, invalid credentials or email, and weak passwords. `showAuthErrorToast()` uses this map.

### `showAuthErrorToast(err)`

Receives a Firebase authentication error. If `err.message` matches a key in `AUTH_ERROR_MESSAGES`, it displays the mapped message as a warning toast. Otherwise it displays a generic authentication error toast and includes the original error in the danger-toast logging path.

### `login(email, password)`

Attempts email/password authentication with Firebase. On success it updates the user's `lastSignInAt` field in `users/{uid}`, shows a success toast, and schedules a redirect. On failure it passes the error to `showAuthErrorToast()`.

### `register(email, password)`

Creates a Firebase email/password account. When a user is returned, it creates `users/{uid}` with the email, UID, customer role, and server timestamps. It reports profile-creation failures separately, then shows a success toast and redirects. Authentication errors use `showAuthErrorToast()`.

### `signInWithProvider(providerClass)`

Creates an OAuth provider instance from the supplied provider class, signs in with a popup, and creates or updates the matching Firestore user profile. Existing profiles receive a new `lastSignInAt`; new profiles receive the customer role and timestamps.

If Firebase reports that the email already belongs to another provider, the function obtains the pending credential. It links immediately when a current user is available; otherwise it opens `openLinkAccountModal()` so the user can verify the existing account before linking.

## UI Utility Functions

### `showToast(message, type = "danger", error, delay = 3000)`

Creates or reuses a fixed Bootstrap toast container, builds a toast using the requested Bootstrap contextual type, and displays it for the requested delay. Danger toasts can append `error.message`. Toast elements remove themselves after hiding. The function also logs informational messages, warnings, or errors to the console.

### `showModal(modalBody, modalTitle, htmlElement = false, externalClasses = "")`

Creates, displays, and returns a Bootstrap modal. When `htmlElement` is false, `modalBody` is inserted as an HTML string. When it is true, `modalBody` must be an `HTMLElement`, which is appended to the modal body. The optional `externalClasses` value is added to the dialog. The modal is removed from the document after it is hidden. The return value is `{ ModalEl, modal }`.

### `viewRawJsonEveLis(parentEl, obj, title = "Raw JSON")`

Attaches a click handler to the `[data-tool="view-raw-json"]` element inside `parentEl`. Clicking it creates an expandable tree with `createTreeViewer(obj)` and opens that tree in a modal titled with `title`. The function name contains the existing `EveLis` spelling and is part of the current API.

### `getRelativePath(pageName)`

Returns the relative path from the `pages/` subdirectory to another page or the index. Used by `updateNavbar()` to generate correct navigation links from any page.

### `updateNavbar(isAdmin_, user)`

Builds a responsive Bootstrap navigation bar, updating the existing navbar element (`#navBar`). It always provides Home; administrators also receive an Admin Panel link. Authenticated users receive Log Out, My Orders, and Cart links, including the current cart length from `sessionStorage`. Signed-in users get a logout listener that signs out and clears the session cart.

### `calculateBookPrice(book)`

Returns a USD price object. Books with a positive page count use `5 + pageCount * 0.05`. Books without a usable page count use `10 + (numericId % 30) + 0.99`, with `10` as the fallback numeric ID. The amount is rounded to two decimal places and returned as `{ amount, currency: "USD" }`.

### `setBootstrapTheme(theme)`

Applies a Bootstrap `data-bs-theme` value to the document root and stores the choice in local storage. For `auto`, it checks `prefers-color-scheme` and applies either `dark` or `light`. For other values it applies the supplied theme directly.

### `createSetThemeEl()`

Creates a fixed bottom-left dropup containing Light, Dark, and Auto options. It loads the saved theme, applies it through `setBootstrapTheme()`, updates the button icon, and listens for future theme selections. The selector is appended to `document.body`.

## Database Utility Functions

### `renderQueryResult(docRef, container, renderFunction)`

Displays a Bootstrap loading spinner while awaiting `getDocs(docRef)`. It sorts the returned documents by ID using numeric-aware comparison, clears the loading state, calls `renderFunction(docSnap)` for each document, and appends each returned element. It returns the sorted document snapshots.

### `deleteDocEveLis(delOrCancel = "delete")`

Registers one delegated click listener on `document.body` for `[data-tool="delete"]`. It opens a confirmation modal, then deletes the Firestore document identified by the clicked element's `data-collection` and `data-uid` attributes. On success it shows a toast and removes the matching element with `data-parent-id`.

### `editJsonEveLis(parentEl, docSnap, renderFunc)`

Attaches a JSON editor to the `[data-tool="edit-json"]` control in `parentEl`. It removes `createdAt` from the local data before displaying it, validates JSON on every text-area input, and disables saving while invalid. Saving merges the parsed JSON plus a new `updatedAt` timestamp into the Firestore document. After success it hides the modal and replaces the original card using `renderFunc()`.

### `getUserRole(user)`

Reads `users/{uid}` from Firestore and returns its `roleId`. Returns `null` if the document does not exist.

### `isAdmin(user = null)`

When `user` is provided, checks whether that user's `roleId` equals `admin`. When `user` is `null`, loads the current user first. It returns a boolean.

### `createOrder(product, user, quantity = 1)`

Creates a new document in `orders`, derives book and price information, and stores customer, item, quantity, pricing, status, payment status, and server timestamps. Shipping is fixed at `3.0`, and the total is unit price times quantity plus shipping. It returns the generated order ID.

### `addToCart(bookData, cardQtyBadge = null)`

Reads the session cart, prevents duplicate product IDs, appends the complete book object, and writes the result back to `sessionStorage.CART_KEY`. It displays feedback and optionally updates a supplied cart badge.

### `removeFromCart(id)`

Finds and removes a cart item by product ID, then persists the updated array to `sessionStorage.CART_KEY`. It displays success or warning feedback.

### `addItems(count = 10)`

Fetches up to `count` books from FreeAPI, calculates a price for each book with `calculateBookPrice()`, and writes the products to Firestore in one batch. It reports empty responses and request or write failures through toasts.

## Firestore Security Model

The rules in `static/js/firestore.rules` require authentication for user-owned data. Anyone may read products, but only administrators may write products. Users can create an order for their own UID and read or delete their own orders. Administrators can write orders. User profile creation is limited to the authenticated UID and the `customer` role; administrators can manage profiles, while users may update their own profile without changing its role.

Client-side administrator checks improve the interface, but Firestore rules are the actual authorization boundary.

## Running Locally

This is a static ES-module site. Serve the project through a local HTTP server instead of opening HTML files directly, because browser module imports and Firebase requests require an appropriate origin.

For example, from the project folder:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`.

Before using the application, configure Firebase Authentication providers and Firestore for the Firebase project referenced by `config.js`. The Firebase client configuration is stored directly in that module because this project is a personal static site and does not use `.env` files or a build step. Apply the rules from `static/js/firestore.rules` through whichever Firebase workflow you already use.

## Current Maintenance Notes

- The account page is wired through `static/js/user.js`; its controls require a signed-in Firebase user.
- The Firebase configuration is stored in `static/js/config.js` and imported by `firebase-config.js`. This keeps the configuration separate from initialization logic.
- Navigation is updated dynamically by calling `updateNavbar()` from each page script. Page paths are resolved using `getRelativePath()`.
- The Firebase configuration is client-visible by design for this browser Firebase app. Since this is a personal project, no production deployment or `.env` setup is assumed.
