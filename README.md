# Book Collection Web App

## Project Overview

Book Collection is a personal browser-based book store and catalog. It is a static, multi-page web application built with HTML, browser JavaScript ES modules, Bootstrap, Firebase, and a public books API.

The project is intentionally small and practical. It does not use Vite, npm scripts, a bundler, a CLI, a backend server, or `.env` files. Each HTML page loads its own module directly in the browser. Firebase handles authentication and database operations, while the browser handles page rendering, navigation, the temporary cart, modals, toasts, and local theme preferences.

The application is useful as a learning project for:

- Firebase Authentication with email/password, Google, and GitHub providers.
- Cloud Firestore reads, writes, queries, batches, timestamps, and security rules.
- Modular browser JavaScript without a build step.
- Delegated event handling with `data-tool`, `data-action`, and `data-uid` attributes.
- Normalizing data from different product formats into one book shape.
- Building reusable Bootstrap cards, modals, toasts, dropdowns, and form feedback.

## Feature Summary

### Public catalog

- Reads products from the Firestore `products` collection.
- Sorts and displays product documents as reusable book cards.
- Shows title, authors, publisher, category, cover, price, metadata, and raw JSON.
- Provides preview, information, web-reader, and purchase links when available.
- Calculates a fallback USD price when imported books do not include one.
- Supports Light, Dark, and Auto Bootstrap themes.

### Authentication

- Registers and logs in with email and password.
- Signs in with Google or GitHub popups.
- Creates a Firestore profile for new users with the `customer` role.
- Updates `lastSignInAt` after a successful login.
- Handles provider-account conflicts through an account-linking modal.
- Re-authenticates users before sensitive operations.
- Sends email verification from the account page.

### User account page

The account page displays the current Firebase user's identity, provider information, role, verification state, and creation date. It also provides controls for sending email verification, editing supported profile information, changing the password after re-authentication, signing out, and deleting the Firebase user and Firestore profile after re-authentication.

### Cart and orders

- Stores cart entries in `sessionStorage.CART_KEY`.
- Prevents duplicate product IDs from being added.
- Displays quantity inputs for ordering.
- Creates an order document with customer, item, quantity, price, shipping, status, and timestamps.
- Shows the signed-in user's orders through a Firestore query on `customer.uid`.
- Displays order totals, payment state, status, dates, and book information.
- Allows processing or pending orders to be cancelled through deletion.

### Administrator tools

Administrators can access the admin page after the client checks the user's `roleId` and Firestore rules authorize the operation. The page is intended to support:

- Viewing product and order documents.
- Viewing raw document data and product metadata.
- Editing documents through a JSON modal.
- Deleting products and orders after confirmation.
- Updating order status to pending, processing, shipped, delivered, or cancelled.
- Importing books from FreeAPI in batches.
- Creating products manually with title, authors, category, price, links, ISBN values, and cover data.
- Loading product records from JSON or text files for bulk ingestion.

The ingestion and JSON editing features are present in the interface. Their current limitations are listed in [Bug Review](#bug-review).

## Pages and Entry Modules

| Page                | Script                | Responsibility                                                                              |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------------- |
| `index.html`        | `static/js/index.js`  | Public product catalog, product cards, cart actions, order actions, metadata, and raw JSON. |
| `pages/auth.html`   | `static/js/auth.js`   | Email/password login and registration plus Google and GitHub sign-in.                       |
| `pages/cart.html`   | `static/js/cart.js`   | Session cart display, quantity selection, Buy Now, removal, and raw JSON.                   |
| `pages/orders.html` | `static/js/orders.js` | Current-user order query, order summaries, cancellation, and raw JSON.                      |
| `pages/admin.html`  | `static/js/admin.js`  | Administrator product/order management, status updates, deletion, editing, and ingestion.   |
| `pages/user.html`   | `static/js/user.js`   | Account details, verification, password changes, profile actions, and account deletion.     |
| `new.html`          | `new.js`              | Small standalone page for the expandable object/tree viewer utilities.                      |

## Architecture and Data Flow

1. An HTML page imports its page-specific JavaScript module.
2. Page scripts call `initBasicThings()`, which creates the footer, theme selector, and delegated delete listener.
3. `firebase-config.js` initializes Firebase using the object in `config.js` and re-exports the Firebase functions used by the app.
4. `getCurrentUser()` waits for the first Firebase auth-state callback.
5. `isAdmin()` reads `users/{uid}.roleId` and controls which UI is displayed. Firestore rules remain the real authorization boundary.
6. `renderQueryResult()` reads a collection or query, sorts the snapshots, and passes each snapshot to a renderer.
7. Product snapshots are rendered by `renderUniversalProductCard()`.
8. Product controls use delegated click handlers. The handler finds the matching document by `data-uid` and calls cart, order, metadata, or raw JSON helpers.
9. Cart data stays in the current browser session. Orders are stored in Firestore and are queried again from the user's account.

## Project Structure

```text
index.html
new.html
new.js
json-schema.json
json_sample.json
json_complete_samples.json
pages/
  admin.html
  auth.html
  cart.html
  orders.html
  user.html
static/
  css/index.css
  js/
    admin.js
    auth.js
    cart.js
    config.js
    firebase-config.js
    firestore.rules
    index.js
    orders.js
    user.js
    utils.js
    utils/
      auth-utils.js
      db-utils.js
      ui-utils.js
```

## Firebase and Storage Model

### Firestore collections

- `users/{uid}`: email, UID, role, creation timestamp, and last sign-in timestamp.
- `products/{productId}`: normalized book data, cover, links, metadata, rating, and computed price.
- `orders/{orderId}`: customer data, purchased item, quantity, pricing, payment state, order status, and timestamps.
- `roles/{roleId}`: readable role-related data supported by the rules, although the page scripts currently use `users.roleId` for admin checks.

### Browser storage

- `sessionStorage.CART_KEY`: JSON array containing the current session's cart products.
- `localStorage.color-scheme-preference`: `light`, `dark`, or `auto`.

### External services

- Firebase modules are loaded from `https://www.gstatic.com`.
- Bootstrap, Bootstrap Icons, and other styling assets are loaded by the HTML pages.
- Product imports use `https://api.freeapi.app/api/v1/public/books`.
- Some covers and external book links come from Google Books.

## Module Reference

### Firebase modules

#### `static/js/config.js`

Exports the Firebase project configuration object. This is intentionally a normal JavaScript module because the project is a personal static site without a build process.

#### `static/js/firebase-config.js`

Initializes Firebase and exports `auth`, `db`, `storage`, and `analytics`. It also re-exports the Firebase Auth and Firestore functions used by the rest of the project.

#### `static/js/utils.js`

Acts as a barrel module. It re-exports the public helpers from `auth-utils.js`, `ui-utils.js`, and `db-utils.js`, and defines `initBasicThings()`.

`initBasicThings()` creates the footer and theme selector, then registers the delegated delete listener.

### Authentication utilities

The functions below live in `static/js/utils/auth-utils.js`.

- `AUTH_ERROR_MESSAGES`: maps common Firebase error keys to user-friendly messages.
- `showAuthErrorToast(err)`: translates an authentication error into a toast.
- `login(email, password)`: signs in with email/password, updates `lastSignInAt`, and redirects.
- `register(email, password)`: creates an account and its customer profile, then redirects.
- `signInWithProvider(providerClass)`: signs in with Google or GitHub and creates or updates the profile.
- `getCurrentUser()`: resolves with the current Firebase user or `null`.
- `openLinkAccountModal(email, pendingCred)`: assists with linking a conflicting provider credential.
- `OpenReauthModal(user)`: re-authenticates with password, Google, or GitHub and resolves a boolean.
- `deleteUserAndDoc(user)`: deletes the user's profile and Firebase Authentication account after re-authentication.
- `changeUserPassword(user)`: re-authenticates, validates a new password, and updates it.

### UI utilities

The functions below live in `static/js/utils/ui-utils.js`.

- `showToast(message, type, error, delay)`: creates and displays a Bootstrap toast.
- `setFieldFeedback(input, valid, message)`: applies Bootstrap valid/invalid state and feedback text.
- `showModal(modalBody, modalTitle, modalFooter)`: creates and displays a removable Bootstrap modal.
- `viewRawJson(obj, title)`: renders an object with `createTreeViewer()` inside a modal.
- `getRelativePath(pageName)`: creates a link that works from the root page or `pages/`.
- `updateNavbar(isAdmin, user)`: renders navigation based on authentication, role, and cart state.
- `calculateBookPrice(book)`: calculates a fallback USD price from page count or ID.
- `setBootstrapTheme(theme)`: applies the selected Bootstrap theme and stores the preference.
- `createSetThemeEl()`: creates the fixed Light/Dark/Auto theme selector.
- `createFooter()`: appends the shared footer.

### Database and product utilities

The functions below live in `static/js/utils/db-utils.js`.

- `renderQueryResult(docRef, container, renderFunction, args)`: fetches, sorts, and renders document snapshots.
- `deleteDocEveLis(deleteContent)`: installs delegated confirmation-and-delete behavior.
- `editJson(docSnap, renderFunc, collection, args)`: opens the JSON editing modal, saves a document in the supplied collection, and replaces its rendered card.
- `getUserRole(user)`: reads the user's role from Firestore.
- `isAdmin(user)`: resolves whether a user has the `admin` role.
- `createOrder(product, user, quantity)`: creates an order with pricing and customer data.
- `detectPayloadType(rawData)`: identifies FreeAPI, normalized, or unknown product data.
- `addToCart(bookData, cardQtyBadge)`: adds a non-duplicate product to session storage.
- `removeFromCart(id, cardEl)`: removes a product, updates storage and the cart badge, and removes its card.
- `addItems(count)`: imports books from FreeAPI into Firestore with a batch write.
- `updateOrderStatus(orderId, newStatus)`: writes a new order status and timestamp.
- `processProductPayload(rawBook)`: converts FreeAPI or normalized data into the product shape.
- `processBulkPayload(payload)`: normalizes authors, ISBN values, prices, links, and categories in one object.
- `processMainBulkPayload(payloads)`: applies `processBulkPayload()` to an object or array.
- `processPayloadManualForm(formEl)`: converts the manual admin form into a product object.
- `renderUniversalProductCard(docRef, mode)`: renders guest, user, or admin product cards.
- `viewMetadata(docRef)`: displays detailed product metadata in a modal.

### Object viewer utilities

`new.js` exports `createTreeViewer(obj)` and `createCustomCss()`.

- `createTreeViewer(obj)` creates an expandable object viewer, supports arrays and circular references, and opens safe external URLs in a new tab.
- `createCustomCss()` injects the tree viewer stylesheet once and returns the existing style element when already present.

## Bug Review

This section reflects the current source after the recent fixes. The resolved items are kept as a short changelog so future edits do not accidentally reintroduce them.

### Recently fixed high-impact bugs

- `orders.js` now uses the exported `viewRawJson()` and `viewMetadata()` helpers instead of the missing `viewRawJsonEveLis()` helper.
- `editJson()` now receives the target Firestore collection, stores that collection on the save button, and uses the edited document snapshot when replacing the rendered card.
- `processPayloadManualForm()` now reads the cover file from its `FormEl` argument instead of an undefined modal variable.
- The admin bulk-upload single-object branch now spreads `processedJsonContent` instead of an undefined `book` variable.
- Normalized products without a price now derive their fallback from `rawBook.id` instead of an undefined variable.
- Guest cart and Buy Now controls now use the real HTML `disabled` attribute.
- Bulk product ingestion now writes the correct `createdAt` field.
- Provider-linking separator logic now uses the intended password-provider check.

### Active bugs and limitations

1. **Order creation swallows failures and returns no order ID.** `createOrder()` catches its own errors and does not rethrow or return the generated document ID, so callers cannot reliably distinguish success from failure or navigate to the new order.
2. **Bulk ingestion does not visibly refresh the product list.** Product records are written successfully, but the admin product list is not re-queried after a successful upload.
3. **Several UI functions assume required DOM elements exist.** For example, `updateNavbar()` expects `#navBar`, and admin initialization expects its form controls. Opening scripts on the wrong HTML page can produce null-element errors.
4. **The FreeAPI cover fallback is not fully defensive.** The normalized FreeAPI branch calls `.replace()` on the selected cover value. A record without an image URL or fallback cover URL can fail during normalization.

## Firestore Security Rules

The rules in `static/js/firestore.rules` currently provide these boundaries:

- Anyone can read products.
- Only administrators can write products.
- A signed-in user can create an order only for their own UID.
- Users can read or delete their own orders.
- Administrators can write orders.
- A user can create their own profile only with the `customer` role.
- Users can update their own profile without changing its role.
- Administrators can manage user profiles and roles.

Client-side `isAdmin()` checks only control the interface. Firestore rules are the actual authorization layer and should be tested independently.

## Running Locally

Because this project uses browser ES-module imports, open it through a local HTTP server rather than directly from `file://`.

From the project directory, use either of these examples:

```powershell
python -m http.server 8000
```

or:

```powershell
npx serve .
```

Then open `http://localhost:8000/` or the URL printed by the server.

Before using Firebase features:

1. Configure the Authentication providers used by the project.
2. Make sure the Firestore database exists.
3. Apply and test `static/js/firestore.rules`.
4. Confirm that the project values in `static/js/config.js` point to the intended Firebase project.
5. Seed at least one administrator profile by setting an appropriate `roleId` in a controlled way.

There is no build step and no `.env` workflow in this repository. The Firebase config is intentionally kept in `static/js/config.js`: this is a personal static project, and the project does not use a CLI or build tooling. The config being visible in browser code is expected for this setup; Firestore rules and Authentication settings provide the access control.

## Maintenance Notes

- Keep this README aligned with the actual exports in `static/js/utils.js`.
- When adding a page-level helper, update both the owning utility module and the barrel exports.
- When changing Firestore document shapes, update product normalization, order creation, renderers, and the security rules together.
- After changing admin ingestion or JSON editing, test both array and single-object input paths in a browser.
- Use `git diff --check` before committing documentation or template changes.
