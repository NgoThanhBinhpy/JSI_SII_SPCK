function isUrl(value) {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getTypeLabel(value) {
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }
  if (value === null) {
    return "null";
  }
  return "Object";
}

function renderPrimitive(value) {
  const span = document.createElement("span");

  if (value === null) {
    span.className = "tree-null";
    span.textContent = "null";
  } else if (typeof value === "boolean") {
    span.className = "tree-boolean";
    span.textContent = value ? "true" : "false";
  } else if (typeof value === "number") {
    span.className = "tree-number";
    span.textContent = value;
  } else if (typeof value === "string") {
    if (isUrl(value)) {
      const link = document.createElement("a");
      link.className = "tree-link";
      link.href = value;
      link.textContent = `"${value}"`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      return link;
    }
    span.className = "tree-value";
    span.textContent = `"${value}"`;
  } else {
    span.textContent = String(value);
  }

  return span;
}

function createKeySpan(key, depth) {
  const keySpan = document.createElement("span");
  keySpan.className = "tree-key";
  keySpan.style.fontSize = `${Math.max(12, 16 - depth * 0.5)}px`;
  keySpan.textContent = key;
  return keySpan;
}

function createTreeItem(key, value, depth, ancestors) {
  const item = document.createElement("div");
  item.className = "tree-item";

  const content = document.createElement("div");
  content.className = "tree-item-content";

  const isCollapsible = typeof value === "object" && value !== null;

  if (isCollapsible && ancestors.has(value)) {
    content.appendChild(createKeySpan(key, depth));
    content.insertAdjacentText("beforeend", ": ");

    const circularValue = document.createElement("span");
    circularValue.className = "tree-value";
    circularValue.textContent = "[Circular]";
    content.appendChild(circularValue);
    item.appendChild(content);
    return item;
  }

  if (isCollapsible) {
    ancestors.add(value);

    const toggle = document.createElement("button");
    toggle.className = "tree-toggle collapsed";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", `Expand ${key}`);

    const childrenContainer = document.createElement("div");
    childrenContainer.className = "tree-children";

    if (Array.isArray(value)) {
      value.forEach((element, index) => {
        childrenContainer.appendChild(
          createTreeItem(`${index}`, element, depth + 1, ancestors),
        );
      });
    } else {
      Object.entries(value).forEach(([k, v]) => {
        childrenContainer.appendChild(
          createTreeItem(k, v, depth + 1, ancestors),
        );
      });
    }
    ancestors.delete(value);

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      toggle.setAttribute(
        "aria-label",
        `${expanded ? "Expand" : "Collapse"} ${key}`,
      );
      toggle.classList.toggle("collapsed", expanded);
      toggle.classList.toggle("expanded", !expanded);
      childrenContainer.classList.toggle("visible", !expanded);
    });

    const typeSpan = document.createElement("span");
    typeSpan.className = "tree-type";
    typeSpan.textContent = `: ${getTypeLabel(value)}`;

    content.appendChild(toggle);
    content.appendChild(createKeySpan(key, depth));
    content.appendChild(typeSpan);

    item.appendChild(content);
    item.appendChild(childrenContainer);
  } else {
    content.appendChild(createKeySpan(key, depth));
    content.insertAdjacentText("beforeend", ": ");
    content.appendChild(renderPrimitive(value));

    item.appendChild(content);
  }

  return item;
}

export function createTreeViewer(obj) {
  const container = document.createElement("div");
  container.className = "console-tree";

  const ancestors = new WeakSet();

  Object.entries(obj).forEach(([key, value]) => {
    container.appendChild(createTreeItem(key, value, 0, ancestors));
  });

  return container;
}

export function createCustomCss() {
  const existingStyle = document.querySelector("style[data-console-tree]");
  if (existingStyle) {
    return existingStyle;
  }

  const styleSheet = document.createElement("style");
  styleSheet.dataset.consoleTree = "true";
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
  return styleSheet;
}
