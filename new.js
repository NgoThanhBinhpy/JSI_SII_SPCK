const PREVIEW_LENGTH = 20;
const HTTP_PREFIX = "http";
const styles = `
  .console-tree {
    font-family: 'Courier New', monospace;
    background-color: #1e1e1e;
    color: #d4d4d4;
    padding: 12px;
    font-size: 13px;
    line-height: 1.6;
    overflow-x: auto;
  }
  
  .tree-item {
    margin-left: 0;
  }
  
  .tree-item-content {
    display: flex;
    align-items: center;
    padding: 2px 0;
    cursor: default;
    user-select: none;
  }
  
  .tree-toggle {
    display: inline-block;
    width: 16px;
    height: 16px;
    text-align: center;
    cursor: pointer;
    color: #858585;
    font-weight: bold;
    user-select: none;
    flex-shrink: 0;
  }
  
  .tree-toggle:hover {
    color: #d4d4d4;
  }
  
  .tree-toggle.collapsed::before {
    content: '▶';
  }
  
  .tree-toggle.expanded::before {
    content: '▼';
  }
  
  .tree-key {
    color: #9cdcfe;
    font-weight: normal;
    margin-left: 4px;
  }
  
  .tree-value {
    color: #ce9178;
    margin-left: 4px;
  }
  
  .tree-type {
    color: #6a9955;
    margin-left: 4px;
  }
  
  .tree-number {
    color: #b5cea8;
  }
  
  .tree-boolean {
    color: #569cd6;
  }
  
  .tree-null {
    color: #569cd6;
  }
  
  .tree-link {
    color: #569cd6;
    text-decoration: underline;
    cursor: pointer;
  }
  
  .tree-link:hover {
    text-decoration: none;
  }
  
  .tree-children {
    margin-left: 2rem;
    display: none;
  }
  
  .tree-children.visible {
    display: block;
  }
  
  .tree-bracket {
    color: #d4d4d4;
  }
`;
function isUrl(value) {
  return typeof value === "string" && value.startsWith(HTTP_PREFIX);
}

function getTypeLabel(value) {
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }
  if (value === null) {
    return "null";
  }
  return `Object`;
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

function createTreeItem(key, value, depth = 0, visited = new WeakSet()) {
  const item = document.createElement("div");
  item.className = "tree-item";

  const content = document.createElement("div");
  content.className = "tree-item-content";

  const isCollapsible = typeof value === "object" && value !== null;

  // Handle circular references or maximum depth safety limits
  if (isCollapsible && visited.has(value)) {
    const keySpan = document.createElement("span");
    keySpan.className = "tree-key";
    keySpan.textContent = key;

    const colonSpan = document.createElement("span");
    colonSpan.textContent = ": ";

    const circularSpan = document.createElement("span");
    circularSpan.className = "tree-value text-warning";
    circularSpan.textContent = "[Circular]";

    content.appendChild(keySpan);
    content.appendChild(colonSpan);
    content.appendChild(circularSpan);
    item.appendChild(content);
    return item;
  }

  if (isCollapsible) {
    visited.add(value); // Mark object as visited

    const toggle = document.createElement("div");
    toggle.className = "tree-toggle collapsed";
    toggle.setAttribute("role", "button");
    toggle.setAttribute("tabindex", "0");

    const childrenContainer = document.createElement("div");
    childrenContainer.className = "tree-children";

    if (Array.isArray(value)) {
      value.forEach((element, index) => {
        childrenContainer.appendChild(
          createTreeItem(`${index}`, element, depth + 1, visited),
        );
      });
    } else {
      Object.entries(value).forEach(([k, v]) => {
        childrenContainer.appendChild(createTreeItem(k, v, depth + 1, visited));
      });
    }

    toggle.addEventListener("click", () => {
      toggle.classList.toggle("collapsed");
      toggle.classList.toggle("expanded");
      childrenContainer.classList.toggle("visible");
    });

    const keySpan = document.createElement("span");
    keySpan.className = "tree-key";
    const baseFontSize = 16;
    const fontSizeDecrement = 0.5;
    const fontSize = Math.max(12, baseFontSize - depth * fontSizeDecrement);
    keySpan.style.fontSize = `${fontSize}px`;
    keySpan.textContent = key;

    const typeSpan = document.createElement("span");
    typeSpan.className = "tree-type";
    typeSpan.textContent = ": " + getTypeLabel(value);

    content.appendChild(toggle);
    content.appendChild(keySpan);
    content.appendChild(typeSpan);

    item.appendChild(content);
    item.appendChild(childrenContainer);
  } else {
    const keySpan = document.createElement("span");
    keySpan.className = "tree-key";
    const baseFontSize = 16;
    const fontSizeDecrement = 0.5;
    const fontSize = Math.max(12, baseFontSize - depth * fontSizeDecrement);
    keySpan.style.fontSize = `${fontSize}px`;
    keySpan.textContent = key;

    const colonSpan = document.createElement("span");
    colonSpan.textContent = ": ";

    content.appendChild(keySpan);
    content.appendChild(colonSpan);
    content.appendChild(renderPrimitive(value));

    item.appendChild(content);
  }

  return item;
}

export function createTreeViewer(obj) {
  const container = document.createElement("div");
  container.className = "console-tree";

  const visited = new WeakSet();

  Object.entries(obj).forEach(([key, value]) => {
    container.appendChild(createTreeItem(key, value, 0, visited));
  });

  return container;
}

export function createCustomCss() {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
