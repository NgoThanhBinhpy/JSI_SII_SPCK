# Book Collection Web App

## Overview

This project is a small browser-based book store. It uses plain HTML, JavaScript ES modules, Bootstrap, Firebase Authentication, Cloud Firestore, and the FreeAPI public books API.

Visitors can browse books, inspect metadata, select a theme, and open book previews. Authenticated users can sign in, register, use Google or GitHub authentication, add books to a session-based cart, place orders, and view or cancel their own orders. Administrators can manage product and order documents through an admin panel.

The application is a multi-page website rather than a single-page application. Each HTML page loads the JavaScript module responsible for that page, while `static/js/utils.js` provides shared behavior.

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

1. A page imports `firebase-config.js`, which initializes Firebase and exports the Authentication, Firestore, Storage, and Analytics clients plus Firebase helper functions.
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
- `localStorage.color-scheme-perferance` stores the selected Bootstrap theme. The spelling is part of the current storage key and must remain consistent with the code unless migrated.

### External services

- Firebase modules are loaded from `gstatic.com`.
- Bootstrap and icon styles/scripts are loaded from CDNs.
- Books are imported from `https://api.freeapi.app/api/v1/public/books`.
- Google Books cover and preview URLs may be stored with product or order data.

## JavaScript Modules

### `static/js/firebase-config.js`

Initializes the Firebase application from the project configuration and exports `auth`, `db`, `storage`, and `analytics`. It also re-exports the Firebase Auth and Firestore functions used by the rest of the application, including document operations, queries, batches, provider authentication, linking, and re-authentication.

### `static/js/index.js`

Adds the theme selector, checks whether the visitor is an administrator, creates the shared navigation bar, loads the `products` collection, and renders product cards. Product cards support metadata previews, raw JSON inspection, adding to the cart, and immediate ordering.

### `static/js/auth.js`

Reads the email and password fields, validates that both are present, and delegates email login and registration to `utils.js`. It also maps the Google and GitHub buttons to provider sign-in. The local `redirectAfterDelay` function exists in this module, while the shared login functions currently call a similarly named function that is not exported from `utils.js`.

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

## `utils.js` Function Reference

`static/js/utils.js` is the shared application service layer. It combines Firebase operations with DOM and Bootstrap UI helpers. The following describes every exported value and function currently present in the file.

### `AUTH_ERROR_MESSAGES`

An object mapping Firebase Auth error message keys to friendlier messages. It covers recent-login requirements, credential mismatches, incorrect passwords, rate limiting, disabled or missing accounts, duplicate email addresses, invalid credentials or email, and weak passwords. `showAuthErrorToast()` uses this map.

### `showAuthErrorToast(err)`

Receives a Firebase authentication error. If `err.message` matches a key in `AUTH_ERROR_MESSAGES`, it displays the mapped message as a warning toast. Otherwise it displays a generic authentication error toast and includes the original error in the danger-toast logging path.

### `login(email, password)`

Attempts email/password authentication with Firebase. On success it updates the user's `lastSignInAt` field in `users/{uid}`, shows a success toast, and schedules a redirect. On failure it passes the error to `showAuthErrorToast()`.

### `register(email, password)`

Creates a Firebase email/password account. When a user is returned, it creates `users/{uid}` with the email, UID, customer role, and server timestamps. It reports profile-creation failures separately, then shows a success toast and redirects. Authentication errors use `showAuthErrorToast()`.

### `signInWithProvider(providerClass)`

Creates an OAuth provider instance from the supplied provider class, signs in with a popup, and creates or updates the matching Firestore user profile. Existing profiles receive a new `lastSignInAt`; new profiles receive the customer role and timestamps.

If Firebase reports that the email already belongs to another provider, the function obtains the pending credential. It links immediately when a current user is available; otherwise it opens `openLinkAccountModal()` so the user can verify the existing account before linking.

### `showToast(message, type = "danger", error, delay = 3000)`

Creates or reuses a fixed Bootstrap toast container, builds a toast using the requested Bootstrap contextual type, and displays it for the requested delay. Danger toasts can append `error.message`. Toast elements remove themselves after hiding. The function also logs informational messages, warnings, or errors to the console.

### `showModal(modalBody, modalTitle, htmlElement = false, externalClasses = "")`

Creates, displays, and returns a Bootstrap modal. When `htmlElement` is false, `modalBody` is inserted as an HTML string. When it is true, `modalBody` must be an `HTMLElement`, which is appended to the modal body. The optional `externalClasses` value is added to the dialog. The modal is removed from the document after it is hidden. The return value is `{ ModalEl, modal }`.

### `renderQueryResult(docRef, container, renderFunction)`

Displays six Bootstrap placeholder cards while awaiting `getDocs(docRef)`. It sorts the returned documents by ID using numeric-aware comparison, clears the placeholders, calls `renderFunction(docSnap)` for each document, and appends each returned element. It returns the sorted document snapshots.

### `viewRawJsonEveLis(parentEl, obj, title = "Raw JSON")`

Attaches a click handler to the `[data-tool="view-raw-json"]` element inside `parentEl`. Clicking it creates an expandable tree with `createTreeViewer(obj)` and opens that tree in a modal titled with `title`. The function name contains the existing `EveLis` spelling and is part of the current API.

### `deleteDocEveLis(delOrCancel = "delete")`

Registers one delegated click listener on `document.body` for `[data-tool="delete"]`. It opens a confirmation modal, then deletes the Firestore document identified by the clicked element's `data-collection` and `data-uid` attributes. On success it shows a toast and removes the matching element with `data-parent-id`; on failure it shows an error toast. The confirmation wording can be changed, for example to `cancel` for order cancellation.

### `editJsonEveLis(parentEl, docSnap, renderFunc)`

Attaches a JSON editor to the `[data-tool="edit-json"]` control in `parentEl`. It removes `createdAt` from the local data before displaying it, validates JSON on every text-area input, and disables saving while invalid. Saving merges the parsed JSON plus a new `updatedAt` timestamp into the Firestore document. After success it hides the modal and replaces the original card using `renderFunc()` and a lightweight local snapshot.

### `getCurrentUser()`

Returns a Promise that resolves with the current Firebase user or `null`. It subscribes to `onAuthStateChanged()` and immediately unsubscribes after the first callback, so callers receive a one-time authentication-state result rather than a long-lived listener.

### `isAdmin(getUser = false)`

Loads the current user and then reads `users/{uid}`. It checks whether `roleId` equals `admin`. By default it returns a boolean. When `getUser` is true it returns `{ isAdmin_, user }`, allowing callers to use both the authorization result and the Firebase user.

### `createNavbar(isAdmin_, user)`

Builds and prepends a responsive Bootstrap navigation bar. It always provides Home; administrators also receive an Admin Panel link. Authenticated users receive Log Out, My Orders, and Cart links, including the current cart length from `sessionStorage`. Signed-in users get a logout listener that signs out and clears the session cart.

### `createOrder(product, user, quantity = 1)`

Creates a new document reference in `orders`, derives book title, price, information link, and cover URL, and stores an order with customer, item, quantity, pricing, processing status, paid status, and server timestamps. Shipping is fixed at `3.0`. The total is calculated as unit price times quantity plus shipping. The function displays success or error feedback and returns the generated order ID.

The caller must provide a valid signed-in user and a product with a usable `computedPrice`; otherwise the generated order can contain invalid customer or pricing data.

### `addToCart(bookData, cardQtyBadge = null)`

Reads the session cart, prevents duplicate product IDs, appends the complete book object, and writes the result back to `sessionStorage.CART_KEY`. It displays feedback and optionally updates a supplied cart badge with the new item count.

### `removeFromCart(bookData)`

Finds a cart item by ID, removes it, and persists the updated array. It displays success or warning feedback. With the current condition, an item at array index `0` is treated as not found; callers should account for this existing edge case if removal behavior is corrected later.

### `calculateBookPrice(book)`

Returns a USD price object. Books with a positive page count use `5 + pageCount * 0.05`. Books without a usable page count use `10 + (numericId % 30) + 0.99`, with `10` as the fallback numeric ID. The amount is rounded to two decimal places and returned as `{ amount, currency: "USD" }`.

### `addItems(count = 10)`

Fetches up to `count` books from FreeAPI, validates the HTTP response, and reads `payload.data.data`. It calculates and attaches a price to every book, then writes all products to Firestore in one batch using the book ID as the document ID and adds a `createdAt` server timestamp. It reports empty responses, HTTP failures, and unexpected errors through toasts.

### `setBootstrapTheme(theme)`

Applies a Bootstrap `data-bs-theme` value to the document root and stores the choice in local storage. For `auto`, it checks `prefers-color-scheme` and applies either `dark` or `light`. For other values it applies the supplied theme directly.

### `createSetThemeEl()`

Creates a fixed bottom-left dropup containing Light, Dark, and Auto options. It loads the saved theme, applies it through `setBootstrapTheme()`, updates the button icon, and listens for future theme selections. The selector is appended to `document.body`.

### `openLinkAccountModal(email, pendingCred, targetProviderId)`

Builds the account-linking modal used when a provider credential conflicts with an existing Firebase account. It hides the provider being linked, offers password verification or another OAuth provider, and calls `linkWithCredential()` after successful verification. It shows success or failure toasts and closes the modal after linking.

### `OpenReauthModal(user)`

Builds a modal for sensitive-action re-authentication. It supports email/password credentials through `EmailAuthProvider` and Google or GitHub popup re-authentication. Successful verification produces a success toast and closes the modal. The function returns a Promise that resolves to `true` when authentication succeeds or `false` when the modal closes without successful authentication.

### `deleteUserAndDoc(user)`

Protects account deletion with `OpenReauthModal()`. After successful re-authentication, it deletes the user's `users/{uid}` Firestore document, deletes the Firebase Authentication user, and redirects the user. Errors are reported with a danger toast.

### `changeUserPassword(user)`

Protects password changes with `OpenReauthModal()`. After successful re-authentication, it opens a second modal containing new-password and confirmation fields. When the values match, it updates the Firebase password, closes the modal, and displays a success toast. Validation and Firebase failures are displayed as toasts.

### `deleteUser()`

The Firebase Authentication deletion helper used by `deleteUserAndDoc()`. It is imported by the shared utility module from the Firebase configuration layer rather than being a standalone account-page action.

## Firestore Security Model

The rules in `static/js/firestore.rules` require authentication for user-owned data. Anyone may read products, but only administrators may write products. Users can create an order for their own UID and read or delete their own orders. Administrators can write orders. User profile creation is limited to the authenticated UID and the `customer` role; administrators can manage profiles, while users may update their own profile without changing its role.

Client-side administrator checks improve the interface, but Firestore rules are the actual authorization boundary.

## Running Locally

This is a static ES-module site. Serve the project through a local HTTP server instead of opening HTML files directly, because browser module imports and Firebase requests require an appropriate origin.

For example, from the project folder:

```text
python -m http.server 8000
```

Then open `http://localhost:8000/`.

Before using the application, configure Firebase Authentication providers and Firestore for the Firebase project referenced by `firebase-config.js`, and publish the rules from `static/js/firestore.rules`.

## Current Maintenance Notes

- The account page is wired through `static/js/user.js`; its controls require a signed-in Firebase user.
- Some shared authentication functions reference Firebase helpers that are not included in the `utils.js` import list, and the redirect helper used by `login()` and `register()` is not defined in that module. Authentication should be tested before treating those flows as production-ready.
- The cart page's empty-cart check and remove-button selector contain existing edge cases.
- Several pages use relative links that should be tested when hosted from a subdirectory.
- The Firebase configuration is client-visible by design for a browser Firebase app, but production deployments still need correct provider settings, Firestore rules, and Firebase App Check or other appropriate protections.
