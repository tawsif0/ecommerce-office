const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const isVisible = (element) =>
  element instanceof HTMLElement &&
  element.isConnected &&
  element.getClientRects().length > 0;

const setNativeValue = (element, value) => {
  if (
    !(element instanceof HTMLInputElement) &&
    !(element instanceof HTMLTextAreaElement) &&
    !(element instanceof HTMLSelectElement)
  ) {
    return false;
  }

  const prototype =
    element instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLSelectElement.prototype;

  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  if (descriptor?.set) {
    descriptor.set.call(element, String(value ?? ""));
  } else {
    element.value = String(value ?? "");
  }

  return true;
};

const setNativeChecked = (element, checked) => {
  if (!(element instanceof HTMLInputElement)) return false;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked");
  if (descriptor?.set) {
    descriptor.set.call(element, Boolean(checked));
  } else {
    element.checked = Boolean(checked);
  }
  return true;
};

const triggerInputChange = (element, value) => {
  if (!element) return false;

  element.focus();

  if (
    element instanceof HTMLSelectElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    setNativeValue(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    return true;
  }

  return false;
};

const triggerCheckboxChange = (element, checked) => {
  if (!(element instanceof HTMLInputElement)) return false;
  if (element.type !== "checkbox" && element.type !== "radio") return false;
  element.focus();
  setNativeChecked(element, checked);
  element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  return true;
};

const parseOnOff = (text) => {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  if (
    normalized.includes("on") ||
    normalized.includes("enable") ||
    normalized.includes("true") ||
    normalized.includes("yes") ||
    normalized.includes("à¦šà¦¾à¦²à§") ||
    normalized.includes("à¦¸à¦¤à§à¦¯")
  ) {
    return true;
  }

  if (
    normalized.includes("off") ||
    normalized.includes("disable") ||
    normalized.includes("false") ||
    normalized.includes("no") ||
    normalized.includes("à¦¬à¦¨à§à¦§") ||
    normalized.includes("à¦®à¦¿à¦¥à§à¦¯à¦¾")
  ) {
    return false;
  }

  return null;
};

const parseNumeric = (value) => {
  const match = String(value || "").match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  return match[0];
};

const findInputByNames = (names) => {
  if (!Array.isArray(names)) return null;

  for (const name of names) {
    const escaped = String(name).replace(/"/g, '\\"');
    const target =
      document.querySelector(`input[name="${escaped}"]`) ||
      document.querySelector(`textarea[name="${escaped}"]`) ||
      document.querySelector(`select[name="${escaped}"]`);

    if (target) return target;
  }

  return null;
};

const getLabelTextForElement = (element) => {
  if (!(element instanceof HTMLElement)) return "";
  const labels = [];

  const id = String(element.id || "").trim();
  if (id) {
    const explicit = document.querySelector(`label[for="${id.replace(/"/g, '\\"')}"]`);
    if (explicit) {
      labels.push(explicit.textContent || "");
    }
  }

  const closestLabel = element.closest("label");
  if (closestLabel) {
    labels.push(closestLabel.textContent || "");
  }

  return labels
    .map((entry) => String(entry || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
};

const getElementSearchText = (element) => {
  if (!(element instanceof HTMLElement)) return "";
  const chunks = [
    element.getAttribute("name"),
    element.getAttribute("id"),
    element.getAttribute("placeholder"),
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    getLabelTextForElement(element),
  ]
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
  return normalizeText(chunks.join(" "));
};

const findAllEditableElements = () =>
  Array.from(document.querySelectorAll("input, textarea, select")).filter(
    (element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (!isVisible(element)) return false;
      if ("disabled" in element && element.disabled) return false;
      if (element instanceof HTMLInputElement) {
        if (["hidden", "submit", "button", "reset", "image"].includes(element.type)) {
          return false;
        }
      }
      return true;
    },
  );

const findBestElementByPhrase = (phrase, datasetAliases = []) => {
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return null;

  const candidates = findAllEditableElements();
  if (!candidates.length) return null;

  const phraseTokens = normalizedPhrase.split(" ").filter(Boolean);
  const aliasTokens = datasetAliases
    .map((alias) => normalizeText(alias))
    .filter(Boolean);

  let bestScore = 0;
  let bestElement = null;

  candidates.forEach((element) => {
    const searchText = getElementSearchText(element);
    if (!searchText) return;

    let score = 0;
    if (searchText.includes(normalizedPhrase)) {
      score += 6;
    }

    phraseTokens.forEach((token) => {
      if (token.length >= 2 && searchText.includes(token)) {
        score += 1;
      }
    });

    aliasTokens.forEach((alias) => {
      if (!alias) return;
      if (searchText.includes(alias)) {
        score += 2;
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestElement = element;
    }
  });

  if (bestScore < 2) return null;
  return bestElement;
};

const FIELD_ALIASES = {
  title: ["title", "product title", "product name", "name", "à¦ªà§à¦°à§‹à¦¡à¦¾à¦•à§à¦Ÿ à¦¨à¦¾à¦®", "à¦ªà¦£à§à¦¯à§‡à¦° à¦¨à¦¾à¦®", "à¦¨à¦¾à¦®"],
  description: ["description", "details", "product details", "à¦¬à¦¿à¦¬à¦°à¦£", "à¦¡à¦¿à¦Ÿà§‡à¦‡à¦²à¦¸"],
  price: ["price", "regular price", "previous price", "old price", "à¦†à¦—à§‡à¦° à¦¦à¦¾à¦®", "à¦¦à¦¾à¦®", "à¦®à§‚à¦²à§à¦¯"],
  salePrice: ["new price", "sale price", "offer price", "discount price", "à¦¨à¦¤à§à¦¨ à¦¦à¦¾à¦®", "à¦¸à§‡à¦² à¦ªà§à¦°à¦¾à¦‡à¦¸"],
  stock: ["stock", "stock qty", "quantity", "à¦¸à§à¦Ÿà¦•", "à¦ªà¦°à¦¿à¦®à¦¾à¦£"],
  category: ["category", "cat", "à¦•à§à¦¯à¦¾à¦Ÿà¦¾à¦—à¦°à¦¿", "à¦•à§à¦¯à¦¾à¦Ÿà§‡à¦—à¦°à¦¿"],
  brand: ["brand", "à¦¬à§à¦°à§à¦¯à¦¾à¦¨à§à¦¡"],
  sku: ["sku", "code", "product code", "à¦à¦¸à¦•à§‡à¦‡à¦‰"],
  priceType: ["price type", "pricing type", "à¦¦à¦¾à¦®à§‡à¦° à¦§à¦°à¦¨", "à¦ªà§à¦°à¦¾à¦‡à¦¸ à¦Ÿà¦¾à¦‡à¦ª"],
  marketplaceType: ["marketplace type", "product mode", "à¦®à¦¾à¦°à§à¦•à§‡à¦Ÿà¦ªà§à¦²à§‡à¦¸ à¦Ÿà¦¾à¦‡à¦ª"],
  showStockToPublic: ["show stock publicly", "public stock", "show stock", "à¦ªà¦¾à¦¬à¦²à¦¿à¦• à¦¸à§à¦Ÿà¦•"],
  allowBackorder: ["allow backorder", "backorder", "à¦¬à§à¦¯à¦¾à¦•à¦…à¦°à§à¦¡à¦¾à¦°"],
};

const GENERIC_FIELD_VERBS = [
  "set",
  "input",
  "type",
  "enter",
  "fill",
  "update",
  "change",
  "write",
  "select",
  "choose",
  "put",
  "make",
];

const NON_FIELD_HEAD_WORDS = new Set([
  "go",
  "open",
  "show",
  "visit",
  "navigate",
  "goto",
  "take",
  "bring",
  "move",
]);

const NAME_BY_FIELD = {
  title: "title",
  description: "description",
  price: "price",
  salePrice: "salePrice",
  stock: "stock",
  category: "category",
  brand: "brand",
  sku: "sku",
  priceType: "priceType",
  marketplaceType: "marketplaceType",
  showStockToPublic: "showStockToPublic",
  allowBackorder: "allowBackorder",
};

const resolveFieldKey = (rawField) => {
  const normalizedField = normalizeText(rawField);
  if (!normalizedField) return null;

  const keys = Object.keys(FIELD_ALIASES);
  for (const key of keys) {
    if (FIELD_ALIASES[key].some((alias) => normalizedField.includes(normalizeText(alias)))) {
      return key;
    }
  }

  return null;
};

const setSelectByLabel = (selectElement, valueText) => {
  if (!(selectElement instanceof HTMLSelectElement)) return false;
  const normalizedValue = normalizeText(valueText);
  if (!normalizedValue) return false;

  const options = Array.from(selectElement.options || []);
  const exact = options.find((option) => normalizeText(option.value) === normalizedValue);
  if (exact) {
    return triggerInputChange(selectElement, exact.value);
  }

  const byLabel = options.find((option) =>
    normalizeText(option.textContent || "").includes(normalizedValue),
  );
  if (byLabel) {
    return triggerInputChange(selectElement, byLabel.value);
  }

  return false;
};

const setPriceTypeValue = (rawValue) => {
  const normalized = normalizeText(rawValue);
  if (!normalized) return null;

  if (
    normalized.includes("single") ||
    normalized.includes("one") ||
    normalized.includes("à¦¸à¦¿à¦™à§à¦—à§‡à¦²")
  ) {
    return "single";
  }

  if (normalized.includes("best") || normalized.includes("à¦¬à§‡à¦¸à§à¦Ÿ")) {
    return "best";
  }

  if (normalized.includes("tba") || normalized.includes("à¦Ÿà¦¿à¦¬à¦¿à¦")) {
    return "tba";
  }

  return null;
};

const setMarketplaceTypeValue = (rawValue) => {
  const normalized = normalizeText(rawValue);
  if (!normalized) return null;

  if (normalized.includes("simple")) return "simple";
  if (normalized.includes("variable")) return "variable";
  if (normalized.includes("digital")) return "digital";
  if (normalized.includes("service")) return "service";
  if (normalized.includes("grouped")) return "grouped";
  return null;
};

const clickProductSubmitButton = () => {
  const submitCandidates = [
    ...Array.from(document.querySelectorAll('form button[type="submit"]')),
    ...Array.from(document.querySelectorAll("button")),
  ].filter(isVisible);

  const preferred = submitCandidates.find((button) => {
    const text = normalizeText(button.textContent || "");
    return (
      text.includes("create product") ||
      text.includes("update product") ||
      text.includes("save product") ||
      text.includes("submit")
    );
  });

  if (preferred) {
    preferred.click();
    return true;
  }

  return false;
};

const openMainImagePicker = () => {
  const input =
    document.getElementById("main-image-upload") ||
    findInputByNames(["mainImage", "images", "image"]);

  if (input instanceof HTMLInputElement && input.type === "file") {
    input.click();
    return true;
  }

  const fileInput = Array.from(document.querySelectorAll('input[type="file"]')).find((item) =>
    isVisible(item) || item.id === "main-image-upload",
  );

  if (fileInput) {
    fileInput.click();
    return true;
  }

  return false;
};

const setFieldValue = (fieldKey, rawValue) => {
  const fieldName = NAME_BY_FIELD[fieldKey];
  if (!fieldName) return false;

  if (fieldKey === "showStockToPublic" || fieldKey === "allowBackorder") {
    const checkbox = findInputByNames([fieldName]);
    const onOff = parseOnOff(rawValue);
    if (!checkbox || onOff === null) return false;
    return triggerCheckboxChange(checkbox, onOff);
  }

  if (fieldKey === "category") {
    const select = findInputByNames([fieldName]);
    if (!(select instanceof HTMLSelectElement)) return false;
    return setSelectByLabel(select, rawValue);
  }

  if (fieldKey === "priceType") {
    const select = findInputByNames([fieldName]);
    if (!(select instanceof HTMLSelectElement)) return false;
    const mapped = setPriceTypeValue(rawValue);
    if (!mapped) return false;
    return triggerInputChange(select, mapped);
  }

  if (fieldKey === "marketplaceType") {
    const select = findInputByNames([fieldName]);
    if (!(select instanceof HTMLSelectElement)) return false;
    const mapped = setMarketplaceTypeValue(rawValue);
    if (!mapped) return false;
    return triggerInputChange(select, mapped);
  }

  const target = findInputByNames([fieldName]);
  if (!target) return false;

  if (
    fieldKey === "price" ||
    fieldKey === "salePrice" ||
    fieldKey === "stock"
  ) {
    const numeric = parseNumeric(rawValue);
    if (numeric === null) return false;
    return triggerInputChange(target, numeric);
  }

  return triggerInputChange(target, rawValue);
};

const getDatasetAliasesForFieldPhrase = (rawField, voiceDataset) => {
  const phrase = normalizeText(rawField);
  if (!phrase) return [];

  const index = Array.isArray(voiceDataset?.fieldAliasIndex)
    ? voiceDataset.fieldAliasIndex
    : [];
  if (!index.length) return [];

  const matches = [];
  index.forEach((entry) => {
    const aliases = Array.isArray(entry?.aliases) ? entry.aliases : [];
    const aliasMatched = aliases.some((alias) => {
      const normalizedAlias = normalizeText(alias);
      return normalizedAlias && (phrase.includes(normalizedAlias) || normalizedAlias.includes(phrase));
    });

    if (aliasMatched) {
      matches.push(...aliases);
    }
  });

  return Array.from(new Set(matches.map((item) => normalizeText(item)).filter(Boolean)));
};

const trySetValueOnElement = (element, rawValue) => {
  if (!(element instanceof HTMLElement)) return false;

  if (element instanceof HTMLInputElement) {
    const type = String(element.type || "text").toLowerCase();
    if (type === "checkbox" || type === "radio") {
      const onOff = parseOnOff(rawValue);
      if (onOff === null) return false;
      return triggerCheckboxChange(element, onOff);
    }

    if (type === "file") {
      element.click();
      return true;
    }

    if (["number", "range"].includes(type)) {
      const numeric = parseNumeric(rawValue);
      if (numeric === null) return false;
      return triggerInputChange(element, numeric);
    }

    return triggerInputChange(element, rawValue);
  }

  if (element instanceof HTMLSelectElement) {
    if (setSelectByLabel(element, rawValue)) return true;
    const normalizedValue = normalizeText(rawValue);
    const exactOption = Array.from(element.options || []).find(
      (option) => normalizeText(option.value) === normalizedValue,
    );
    if (exactOption) {
      return triggerInputChange(element, exactOption.value);
    }
    return false;
  }

  if (element instanceof HTMLTextAreaElement) {
    return triggerInputChange(element, rawValue);
  }

  return false;
};

const setFieldValueByPhrase = (rawField, rawValue, voiceDataset) => {
  const datasetAliases = getDatasetAliasesForFieldPhrase(rawField, voiceDataset);
  const bestElement = findBestElementByPhrase(rawField, datasetAliases);
  if (!bestElement) return false;
  return trySetValueOnElement(bestElement, rawValue);
};

const parseFlexibleGenericFieldCommand = (text) => {
  const explicit = text.match(
    /^(?:set|input|type|enter|fill|update|change|write|select|choose|put|make)\s+(.+?)\s+(?:to|as|=|is|with)\s+(.+)$/i,
  );
  if (explicit) {
    return {
      field: String(explicit[1] || "").trim(),
      value: String(explicit[2] || "").trim(),
    };
  }

  const compact = text.match(/^(.+?)\s+(?:is|=|to)\s+(.+)$/i);
  if (compact) {
    const fieldCandidate = normalizeText(compact[1]);
    if (!fieldCandidate) return null;

    const firstWord = fieldCandidate.split(" ")[0];
    if (NON_FIELD_HEAD_WORDS.has(firstWord)) {
      return null;
    }

    return {
      field: String(compact[1] || "").trim(),
      value: String(compact[2] || "").trim(),
    };
  }

  return null;
};

const parseCommonFieldCommand = (text) => {
  const patterns = [
    {
      field: "title",
      regex:
        /(?:product name|product title|title|à¦ªà¦£à§à¦¯à§‡à¦° à¦¨à¦¾à¦®|à¦ªà§à¦°à§‹à¦¡à¦¾à¦•à§à¦Ÿ à¦¨à¦¾à¦®|à¦¨à¦¾à¦®)\s*(?:is|to|as|=|à¦¹à¦¬à§‡|à¦¦à¦¾à¦“|à¦•à¦°à§‹|like)?\s*(.+)$/i,
    },
    {
      field: "salePrice",
      regex:
        /(?:new price|sale price|offer price|discount price|à¦¨à¦¤à§à¦¨ à¦¦à¦¾à¦®|à¦¸à§‡à¦² à¦ªà§à¦°à¦¾à¦‡à¦¸)\s*(?:is|to|as|=|à¦¹à¦¬à§‡|à¦¦à¦¾à¦“|à¦•à¦°à§‹)?\s*([0-9]+(?:\.[0-9]+)?)/i,
    },
    {
      field: "price",
      regex:
        /(?:previous price|old price|regular price|price|à¦¦à¦¾à¦®|à¦®à§‚à¦²à§à¦¯|à¦†à¦—à§‡à¦° à¦¦à¦¾à¦®)\s*(?:is|to|as|=|à¦¹à¦¬à§‡|à¦¦à¦¾à¦“|à¦•à¦°à§‹)?\s*([0-9]+(?:\.[0-9]+)?)/i,
    },
    {
      field: "stock",
      regex:
        /(?:stock|stock qty|quantity|à¦¸à§à¦Ÿà¦•|à¦ªà¦°à¦¿à¦®à¦¾à¦£)\s*(?:is|to|as|=|à¦¹à¦¬à§‡|à¦¦à¦¾à¦“|à¦•à¦°à§‹)?\s*([0-9]+(?:\.[0-9]+)?)/i,
    },
    {
      field: "description",
      regex: /(?:description|details|à¦¬à¦¿à¦¬à¦°à¦£)\s*(?:is|to|as|=|à¦¹à¦¬à§‡|à¦¦à¦¾à¦“|à¦•à¦°à§‹)?\s*(.+)$/i,
    },
    {
      field: "category",
      regex: /(?:category|cat|à¦•à§à¦¯à¦¾à¦Ÿà¦¾à¦—à¦°à¦¿|à¦•à§à¦¯à¦¾à¦Ÿà§‡à¦—à¦°à¦¿)\s*(?:is|to|as|=|à¦¹à¦¬à§‡|à¦¦à¦¾à¦“|à¦•à¦°à§‹)?\s*(.+)$/i,
    },
    {
      field: "brand",
      regex: /(?:brand|à¦¬à§à¦°à§à¦¯à¦¾à¦¨à§à¦¡)\s*(?:is|to|as|=|à¦¹à¦¬à§‡|à¦¦à¦¾à¦“|à¦•à¦°à§‹)?\s*(.+)$/i,
    },
    {
      field: "sku",
      regex: /(?:sku|product code|à¦•à§‹à¦¡)\s*(?:is|to|as|=|à¦¹à¦¬à§‡|à¦¦à¦¾à¦“|à¦•à¦°à§‹)?\s*(.+)$/i,
    },
    {
      field: "priceType",
      regex: /(?:price type|pricing type|à¦¦à¦¾à¦®à§‡à¦° à¦§à¦°à¦¨|à¦ªà§à¦°à¦¾à¦‡à¦¸ à¦Ÿà¦¾à¦‡à¦ª)\s*(?:is|to|as|=|à¦¹à¦¬à§‡|à¦¦à¦¾à¦“|à¦•à¦°à§‹)?\s*(.+)$/i,
    },
    {
      field: "marketplaceType",
      regex:
        /(?:marketplace type|product mode|à¦®à¦¾à¦°à§à¦•à§‡à¦Ÿà¦ªà§à¦²à§‡à¦¸ à¦Ÿà¦¾à¦‡à¦ª)\s*(?:is|to|as|=|à¦¹à¦¬à§‡|à¦¦à¦¾à¦“|à¦•à¦°à§‹)?\s*(.+)$/i,
    },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match && String(match[1] || "").trim()) {
      return { field: pattern.field, value: String(match[1]).trim() };
    }
  }

  const generic = text.match(
    /^(?:set|input|type|enter|fill|update|change|write|à¦¸à§‡à¦Ÿ|à¦²à¦¿à¦–|à¦¦à¦¾à¦“)\s+(.+?)\s+(?:to|as|=|is|à¦¹à¦¬à§‡|à¦•à¦°à§‹|à¦¦à¦¾à¦“)\s+(.+)$/i,
  );

  if (generic) {
    const fieldKey = resolveFieldKey(generic[1]);
    if (fieldKey) {
      return { field: fieldKey, value: String(generic[2] || "").trim() };
    }
  }

  return null;
};

export const splitVoiceCommandSegments = (rawText) => {
  const text = String(rawText || "").trim();
  if (!text) return [];

  const segments = text
    .split(/\b(?:then|and then|after that|à¦¤à¦¾à¦°à¦ªà¦°|à¦à¦°à¦ªà¦°|à¦ªà¦°à§‡|and|à¦à¦¬à¦‚)\b|[;,]+/gi)
    .map((part) => part.trim())
    .filter(Boolean);

  return segments.length > 0 ? segments : [text];
};

export const isLikelyDomCommand = (rawText) => {
  const text = String(rawText || "").trim();
  if (!text) return false;

  const normalized = normalizeText(text);
  if (!normalized) return false;

  if (
    normalized.includes("file manager") ||
    normalized.includes("select image") ||
    normalized.includes("upload image") ||
    normalized.includes("submit") ||
    normalized.includes("save product") ||
    normalized.includes("update product") ||
    normalized.includes("price") ||
    normalized.includes("title") ||
    normalized.includes("product name") ||
    normalized.includes("stock") ||
    normalized.includes("category") ||
    normalized.includes("brand") ||
    normalized.includes("sku") ||
    normalized.includes("show stock") ||
    normalized.includes("backorder") ||
    normalized.includes("à¦ªà¦£à§à¦¯à§‡à¦° à¦¨à¦¾à¦®") ||
    normalized.includes("à¦ªà§à¦°à§‹à¦¡à¦¾à¦•à§à¦Ÿ à¦¨à¦¾à¦®") ||
    normalized.includes("à¦¦à¦¾à¦®") ||
    normalized.includes("à¦¸à§à¦Ÿà¦•") ||
    normalized.includes("à¦•à§à¦¯à¦¾à¦Ÿà¦¾à¦—à¦°à¦¿")
  ) {
    return true;
  }

  const parsedCommon = parseCommonFieldCommand(text);
  if (parsedCommon) return true;

  const parsedGeneric = parseFlexibleGenericFieldCommand(text);
  if (!parsedGeneric) return false;

  const normalizedField = normalizeText(parsedGeneric.field);
  if (!normalizedField) return false;

  const startsWithVerb = GENERIC_FIELD_VERBS.some((verb) =>
    normalized.startsWith(`${normalizeText(verb)} `),
  );
  if (startsWithVerb) return true;

  return Boolean(resolveFieldKey(parsedGeneric.field));
};

export const executeVoiceDomCommand = ({ rawText, setAction, voiceDataset }) => {
  const text = String(rawText || "").trim();
  const normalized = normalizeText(text);
  if (!normalized) return { handled: false };

  const applyAction = (message) => {
    if (typeof setAction === "function") {
      setAction(message, { speak: true });
    }
  };

  if (
    normalized.includes("open file manager") ||
    normalized.includes("file manager") ||
    normalized.includes("upload image") ||
    normalized.includes("select image") ||
    normalized.includes("choose image") ||
    normalized.includes("à¦›à¦¬à¦¿ à¦†à¦ªà¦²à§‹à¦¡") ||
    normalized.includes("à¦›à¦¬à¦¿ à¦¨à¦¿à¦°à§à¦¬à¦¾à¦šà¦¨")
  ) {
    if (openMainImagePicker()) {
      applyAction("Image picker opened. Select the image to continue.");
      return { handled: true };
    }
    applyAction("Image picker is not available on this screen.");
    return { handled: true };
  }

  if (
    normalized.includes("submit") ||
    normalized.includes("save product") ||
    normalized.includes("create product") ||
    normalized.includes("update product") ||
    normalized.includes("à¦ªà¦£à§à¦¯ à¦¸à§‡à¦­") ||
    normalized.includes("à¦¸à¦¾à¦¬à¦®à¦¿à¦Ÿ")
  ) {
    if (clickProductSubmitButton()) {
      applyAction("Form submitted.");
      return { handled: true };
    }
    applyAction("Submit button was not found on this page.");
    return { handled: true };
  }

  if (
    normalized.includes("show stock") ||
    normalized.includes("public stock") ||
    normalized.includes("à¦ªà¦¾à¦¬à¦²à¦¿à¦• à¦¸à§à¦Ÿà¦•")
  ) {
    const checked = parseOnOff(normalized);
    if (checked === null) {
      applyAction("Say on or off for stock visibility.");
      return { handled: true };
    }
    const success = setFieldValue("showStockToPublic", checked ? "on" : "off");
    if (success) {
      applyAction(`Stock visibility turned ${checked ? "on" : "off"}.`);
      return { handled: true };
    }
  }

  if (normalized.includes("backorder") || normalized.includes("à¦¬à§à¦¯à¦¾à¦•à¦…à¦°à§à¦¡à¦¾à¦°")) {
    const checked = parseOnOff(normalized);
    if (checked === null) {
      applyAction("Say on or off for backorder.");
      return { handled: true };
    }
    const success = setFieldValue("allowBackorder", checked ? "on" : "off");
    if (success) {
      applyAction(`Backorder turned ${checked ? "on" : "off"}.`);
      return { handled: true };
    }
  }

  const parsedField = parseCommonFieldCommand(text);
  if (parsedField) {
    const success = setFieldValue(parsedField.field, parsedField.value);
    if (success) {
      const fieldLabel =
        parsedField.field === "title"
          ? "product title"
          : parsedField.field === "salePrice"
            ? "new price"
            : parsedField.field === "price"
              ? "price"
              : parsedField.field === "stock"
                ? "stock"
                : parsedField.field === "priceType"
                  ? "price type"
                  : parsedField.field === "marketplaceType"
                    ? "marketplace type"
                    : parsedField.field;
      applyAction(`Updated ${fieldLabel}.`);
      return { handled: true };
    }
    applyAction(`Could not update ${parsedField.field} on this screen.`);
    return { handled: true };
  }

  const generic = parseFlexibleGenericFieldCommand(text);
  if (generic?.field && generic?.value) {
    const success = setFieldValueByPhrase(generic.field, generic.value, voiceDataset);
    if (success) {
      applyAction(`Updated ${generic.field}.`);
      return { handled: true };
    }

    const startsWithVerb = GENERIC_FIELD_VERBS.some((verb) =>
      normalized.startsWith(`${normalizeText(verb)} `),
    );

    if (startsWithVerb || resolveFieldKey(generic.field)) {
      applyAction(`Could not find field ${generic.field} on this screen.`);
      return { handled: true };
    }

    return { handled: false };
  }

  return { handled: false };
};

