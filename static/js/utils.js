export * from "./utils/auth-utils.js";
export * from "./utils/ui-utils.js";
export * from "./utils/db-utils.js";
import { createFooter, createSetThemeEl } from "./utils/ui-utils.js";
import { deleteDocEveLis } from "./utils/db-utils.js";

export function initBasicThings() {
  createFooter();
  createSetThemeEl();
  deleteDocEveLis();
}
