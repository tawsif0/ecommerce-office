import { useEffect } from "react";

export const DEMO03_SCOPE_CLASS = "demo03-scope";
export const DEMO03_THEME_CLASSES = [
  "home",
  "content-rounded",
  "theme-fynode",
  "wp-theme-fynode",
  "klb-bottom-menu",
  "klb-swatches",
];

const DEMO03_FONT_STYLESHEETS = [
  {
    id: "demo03-font-inter",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&subset=latin,latin-ext&display=swap",
  },
];

const DEMO03_SCOPED_STYLESHEETS = [
  { id: "demo03-bootstrap", href: "/demo03-assets/css/bootstrap.min.css" },
  { id: "demo03-slick", href: "/demo03-assets/css/slick.css" },
  { id: "demo03-klb-social", href: "/demo03-assets/css/klbtheme-social.css" },
  { id: "demo03-klb-icons", href: "/demo03-assets/css/klbtheme.css" },
  { id: "demo03-magnific", href: "/demo03-assets/css/magnific-popup.css" },
  { id: "demo03-base", href: "/demo03-assets/css/base.css" },
  { id: "demo03-style", href: "/demo03-assets/css/style.css" },
];

const ROOT_AT_RULE_PREFIXES = [
  "@media",
  "@supports",
  "@layer",
  "@container",
  "@document",
];

const PASSTHROUGH_AT_RULE_PREFIXES = [
  "@font-face",
  "@keyframes",
  "@-webkit-keyframes",
  "@property",
  "@counter-style",
  "@page",
];

const splitSelectors = (selectorText) => {
  const selectors = [];
  let current = "";
  let depth = 0;

  for (let index = 0; index < selectorText.length; index += 1) {
    const character = selectorText[index];
    if (character === "(" || character === "[") depth += 1;
    if (character === ")" || character === "]") depth = Math.max(0, depth - 1);

    if (character === "," && depth === 0) {
      selectors.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  if (current) selectors.push(current);
  return selectors;
};

const normalizeScopedSelector = (selector) => {
  const strippedSelector = selector
    .replace(/:root/g, "")
    .replace(/\bhtml\b/g, "")
    .replace(/\bbody\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:[>+~]\s*)+/, "")
    .trim();

  if (!strippedSelector) {
    return `.${DEMO03_SCOPE_CLASS}`;
  }

  if (strippedSelector.startsWith(`.${DEMO03_SCOPE_CLASS}`)) {
    return strippedSelector;
  }

  return `.${DEMO03_SCOPE_CLASS} ${strippedSelector}`;
};

const scopeSelectorList = (selectorText) =>
  splitSelectors(selectorText)
    .map((selector) => normalizeScopedSelector(selector.trim()))
    .filter(Boolean)
    .join(", ");

const readBalancedBlock = (source, startIndex) => {
  let depth = 1;
  let index = startIndex;
  let quote = "";

  while (index < source.length) {
    const current = source[index];
    const next = source[index + 1];

    if (!quote && current === "/" && next === "*") {
      const commentEnd = source.indexOf("*/", index + 2);
      index = commentEnd === -1 ? source.length : commentEnd + 2;
      continue;
    }

    if ((current === "'" || current === '"') && source[index - 1] !== "\\") {
      if (!quote) {
        quote = current;
      } else if (quote === current) {
        quote = "";
      }
      index += 1;
      continue;
    }

    if (!quote) {
      if (current === "{") depth += 1;
      if (current === "}") depth -= 1;
      if (depth === 0) {
        return {
          content: source.slice(startIndex, index),
          nextIndex: index + 1,
        };
      }
    }

    index += 1;
  }

  return {
    content: source.slice(startIndex),
    nextIndex: source.length,
  };
};

const scopeCssText = (source) => {
  let index = 0;
  let output = "";

  while (index < source.length) {
    while (/\s/.test(source[index] || "")) {
      output += source[index];
      index += 1;
    }

    if (index >= source.length) break;

    if (source[index] === "/" && source[index + 1] === "*") {
      const commentEnd = source.indexOf("*/", index + 2);
      if (commentEnd === -1) {
        output += source.slice(index);
        break;
      }
      output += source.slice(index, commentEnd + 2);
      index = commentEnd + 2;
      continue;
    }

    const tokenStart = index;
    let quote = "";

    while (index < source.length) {
      const current = source[index];
      const next = source[index + 1];

      if (!quote && current === "/" && next === "*") {
        break;
      }

      if ((current === "'" || current === '"') && source[index - 1] !== "\\") {
        if (!quote) {
          quote = current;
        } else if (quote === current) {
          quote = "";
        }
      }

      if (!quote && (current === "{" || current === ";")) {
        break;
      }

      index += 1;
    }

    const header = source.slice(tokenStart, index).trim();
    const delimiter = source[index];

    if (!header) {
      index += 1;
      continue;
    }

    if (delimiter === ";") {
      output += `${header};`;
      index += 1;
      continue;
    }

    if (delimiter !== "{") {
      output += header;
      break;
    }

    const { content, nextIndex } = readBalancedBlock(source, index + 1);
    index = nextIndex;

    if (ROOT_AT_RULE_PREFIXES.some((prefix) => header.startsWith(prefix))) {
      output += `${header}{${scopeCssText(content)}}`;
      continue;
    }

    if (PASSTHROUGH_AT_RULE_PREFIXES.some((prefix) => header.startsWith(prefix))) {
      output += `${header}{${content}}`;
      continue;
    }

    output += `${scopeSelectorList(header)}{${content}}`;
  }

  return output;
};

const rewriteCssUrls = (cssText, stylesheetHref) =>
  cssText.replace(/url\(([^)]+)\)/g, (match, rawValue) => {
    const urlValue = String(rawValue || "").trim().replace(/^['"]|['"]$/g, "");

    if (
      !urlValue ||
      urlValue.startsWith("data:") ||
      urlValue.startsWith("http://") ||
      urlValue.startsWith("https://") ||
      urlValue.startsWith("/") ||
      urlValue.startsWith("#") ||
      urlValue.startsWith("blob:")
    ) {
      return match;
    }

    try {
      const absoluteUrl = new URL(urlValue, new URL(stylesheetHref, window.location.origin));
      return `url("${absoluteUrl.pathname}${absoluteUrl.search}${absoluteUrl.hash}")`;
    } catch {
      return match;
    }
  });

export default function useDemo03Assets(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    if (typeof document === "undefined") return undefined;

    let isActive = true;
    const abortController = new AbortController();
    const addedNodes = [];

    const ensureFontStyles = () => {
      DEMO03_FONT_STYLESHEETS.forEach(({ id, href }) => {
        if (!href || document.getElementById(id)) return;
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = href;
        link.dataset.demo03 = "true";
        document.head.appendChild(link);
        addedNodes.push(link);
      });
    };

    const loadScopedStyles = async () => {
      const stylesheets = await Promise.all(
        DEMO03_SCOPED_STYLESHEETS.map(async ({ id, href }) => {
          const response = await fetch(href, { signal: abortController.signal });
          if (!response.ok) {
            throw new Error(`Failed to load ${href}`);
          }

          const cssText = await response.text();
          return {
            id,
            cssText: scopeCssText(rewriteCssUrls(cssText, href)),
          };
        }),
      );

      if (!isActive) return;

      stylesheets.forEach(({ id, cssText }) => {
        if (document.getElementById(id)) return;
        const style = document.createElement("style");
        style.id = id;
        style.dataset.demo03 = "true";
        style.textContent = cssText;
        document.head.appendChild(style);
        addedNodes.push(style);
      });
    };

    ensureFontStyles();
    loadScopedStyles().catch((error) => {
      if (error?.name === "AbortError") return;
      console.error("Failed to load scoped demo03 styles", error);
    });

    return () => {
      isActive = false;
      abortController.abort();
      addedNodes.forEach((node) => node.parentNode?.removeChild(node));
    };
  }, [enabled]);
}

