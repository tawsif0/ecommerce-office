const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const CACHE_TTL_MS = Math.max(
  30000,
  Number(process.env.VOICE_DATASET_CACHE_TTL_MS || 300000),
);

const MODEL_DIR = path.join(__dirname, "..", "models");
const APP_FILE = path.join(__dirname, "..", "app.js");

let cachedDataset = {
  value: null,
  expiresAt: 0,
};

const MODULE_COMMANDS = [
  {
    tab: "dashboard",
    successMessage: "Opened dashboard",
    aliases: ["dashboard", "home", "overview", "control panel"],
  },
  {
    tab: "create-product",
    successMessage: "Opened create product",
    aliases: ["create product", "new product", "product create", "product form"],
  },
  {
    tab: "modify-product",
    successMessage: "Opened product list",
    aliases: ["product list", "all products", "products", "catalog"],
  },
  {
    tab: "order-list",
    successMessage: "Opened order list",
    aliases: ["orders", "order list", "all orders"],
  },
  {
    tab: "add-order",
    successMessage: "Opened add order",
    aliases: ["add order", "manual order", "create order"],
  },
  {
    tab: "create-category",
    successMessage: "Opened create category",
    aliases: ["create category", "new category"],
  },
  {
    tab: "modify-category",
    successMessage: "Opened category list",
    aliases: ["category list", "all categories", "categories"],
  },
  {
    tab: "coupons",
    successMessage: "Opened coupons",
    aliases: ["coupons", "coupon management", "discount codes"],
  },
  {
    tab: "payment-methods",
    successMessage: "Opened payment methods",
    aliases: ["payment methods", "payments", "cash on delivery"],
  },
  {
    tab: "shipping-zones",
    successMessage: "Opened shipping zones",
    aliases: ["shipping zones", "shipping", "delivery zones"],
  },
  {
    tab: "vendors-admin",
    successMessage: "Opened vendors",
    aliases: ["vendors", "vendor list"],
  },
  {
    tab: "vendor-reports",
    successMessage: "Opened vendor reports",
    aliases: ["vendor reports", "vendor analytics"],
  },
  {
    tab: "product-reports",
    successMessage: "Opened product reports",
    aliases: ["product reports", "sales report"],
  },
  {
    tab: "customer-risk",
    successMessage: "Opened customer risk",
    aliases: ["customer risk", "risky customers", "blacklist"],
  },
  {
    tab: "module-support",
    successMessage: "Opened support tickets",
    aliases: ["support", "support tickets", "tickets", "help desk"],
  },
  {
    tab: "module-landing-pages",
    successMessage: "Opened landing pages",
    aliases: ["landing pages", "landing page", "campaign pages"],
  },
  {
    tab: "module-ads",
    successMessage: "Opened ads",
    aliases: ["ads", "advertisements", "ad management"],
  },
  {
    tab: "module-brands",
    successMessage: "Opened brands",
    aliases: ["brands", "brand management"],
  },
  {
    tab: "module-suppliers",
    successMessage: "Opened suppliers",
    aliases: ["suppliers", "supplier list"],
  },
  {
    tab: "module-purchases",
    successMessage: "Opened purchases",
    aliases: ["purchases", "purchase list"],
  },
  {
    tab: "module-accounts",
    successMessage: "Opened accounts",
    aliases: ["accounts", "accounting", "ledger"],
  },
  {
    tab: "module-business-reports",
    successMessage: "Opened business reports",
    aliases: ["business reports", "analytics", "reports"],
  },
  {
    tab: "module-website-setup",
    successMessage: "Opened website setup",
    aliases: ["website setup", "site settings", "design settings"],
  },
  {
    tab: "module-admin-users",
    successMessage: "Opened admin users",
    aliases: ["admin users", "manage admins"],
  },
  {
    tab: "module-super-admin",
    successMessage: "Opened super admin controls",
    aliases: ["super admin", "marketplace control"],
  },
];

const RESOURCE_TAB_MAP = {
  product: {
    createTab: "create-product",
    listTab: "modify-product",
  },
  category: {
    createTab: "create-category",
    listTab: "modify-category",
  },
  order: {
    createTab: "add-order",
    listTab: "order-list",
  },
  coupon: {
    listTab: "coupons",
  },
  brand: {
    listTab: "module-brands",
  },
  supplier: {
    listTab: "module-suppliers",
  },
  purchase: {
    listTab: "module-purchases",
  },
  account: {
    listTab: "module-accounts",
  },
  vendor: {
    listTab: "vendors-admin",
  },
  supportticket: {
    listTab: "module-support",
  },
  support_ticket: {
    listTab: "module-support",
  },
  landingpage: {
    listTab: "module-landing-pages",
  },
  landing_page: {
    listTab: "module-landing-pages",
  },
};

const toUniqueArray = (values = []) => Array.from(new Set(values.filter(Boolean)));

const toTitleCaseWords = (value) =>
  String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toLowerAlias = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const toPlural = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return raw;
  if (raw.endsWith("s")) return raw;
  if (raw.endsWith("y")) return `${raw.slice(0, -1)}ies`;
  return `${raw}s`;
};

const joinApiPath = (basePath, routePath) => {
  const a = String(basePath || "").replace(/\/+$/, "");
  const b = String(routePath || "").replace(/^\/+/, "");
  return `${a}/${b}`.replace(/\/+/g, "/");
};

const sanitizeRoutePath = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "/";
  return raw.startsWith("/") ? raw : `/${raw}`;
};

const safeReadFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
};

const safeListFiles = (dirPath) => {
  try {
    return fs.readdirSync(dirPath);
  } catch {
    return [];
  }
};

const extractRouteMountMap = () => {
  const appSource = safeReadFile(APP_FILE);
  if (!appSource) return [];

  const requireRegex = /const\s+([A-Za-z0-9_]+)\s*=\s*require\(["'](.+routes\/[^"']+)["']\);/g;
  const useRegex = /app\.use\(\s*["']([^"']+)["']\s*,\s*([A-Za-z0-9_]+)\s*\)/g;

  const routeVarToFile = {};
  let requireMatch;
  while ((requireMatch = requireRegex.exec(appSource)) !== null) {
    const variableName = String(requireMatch[1] || "").trim();
    const relativePath = String(requireMatch[2] || "").trim();
    if (!variableName || !relativePath) continue;
    const absoluteFile = path.resolve(path.dirname(APP_FILE), relativePath);
    routeVarToFile[variableName] = absoluteFile.endsWith(".js")
      ? absoluteFile
      : `${absoluteFile}.js`;
  }

  const mountEntries = [];
  let useMatch;
  while ((useMatch = useRegex.exec(appSource)) !== null) {
    const basePath = sanitizeRoutePath(useMatch[1]);
    const variableName = String(useMatch[2] || "").trim();
    const filePath = routeVarToFile[variableName];
    if (!basePath || !filePath) continue;
    mountEntries.push({ basePath, filePath });
  }

  return mountEntries;
};

const extractEndpointsFromRouteFile = (filePath, basePath) => {
  const source = safeReadFile(filePath);
  if (!source) return [];

  const endpointRegex = /router\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/g;
  const endpoints = [];
  let match;
  while ((match = endpointRegex.exec(source)) !== null) {
    const method = String(match[1] || "").toUpperCase();
    const routePath = sanitizeRoutePath(match[2]);
    const fullPath = joinApiPath(basePath, routePath);
    endpoints.push({
      method,
      path: fullPath,
    });
  }

  return endpoints;
};

const extractAllApiEndpoints = () => {
  const mounts = extractRouteMountMap();
  const endpoints = mounts.flatMap(({ filePath, basePath }) =>
    extractEndpointsFromRouteFile(filePath, basePath),
  );

  const unique = new Map();
  endpoints.forEach((endpoint) => {
    const key = `${endpoint.method}:${endpoint.path}`;
    if (!unique.has(key)) {
      unique.set(key, endpoint);
    }
  });

  return Array.from(unique.values());
};

const safeRequireAllModels = () => {
  const files = safeListFiles(MODEL_DIR).filter((name) => name.endsWith(".js"));
  files.forEach((fileName) => {
    const absolutePath = path.join(MODEL_DIR, fileName);
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      require(absolutePath);
    } catch {
      // Ignore model load failures; dataset remains best-effort.
    }
  });
};

const buildFieldAliases = (fieldName, resourceName) => {
  const normalizedField = toTitleCaseWords(fieldName).toLowerCase();
  const normalizedResource = toTitleCaseWords(resourceName).toLowerCase();

  const aliases = [
    fieldName,
    normalizedField,
    `${normalizedResource} ${normalizedField}`,
    `${normalizedField} ${normalizedResource}`,
  ];

  if (normalizedField.endsWith(" id")) {
    aliases.push(normalizedField.replace(/ id$/, ""));
  }

  if (normalizedField.startsWith("is ")) {
    aliases.push(normalizedField.replace(/^is\s+/, ""));
  }

  return toUniqueArray(aliases.map(toLowerAlias));
};

const buildModelResources = () => {
  safeRequireAllModels();
  const models = Object.values(mongoose.models || {});

  return models
    .filter((model) => model?.modelName && model?.schema)
    .map((model) => {
      const modelName = String(model.modelName || "").trim();
      const singular = toLowerAlias(modelName);
      const plural = toPlural(singular);
      const schemaPaths = model.schema.paths || {};
      const fields = Object.entries(schemaPaths)
        .map(([name, schemaType]) => {
          if (String(name || "") === "__v") return null;
          const fieldName = String(name || "").trim();
          const requiredRaw = schemaType?.options?.required;
          const required = Array.isArray(requiredRaw)
            ? Boolean(requiredRaw[0])
            : typeof requiredRaw === "function"
              ? false
              : Boolean(requiredRaw);

          return {
            name: fieldName,
            type: String(schemaType?.instance || "Mixed"),
            required,
            aliases: buildFieldAliases(fieldName, singular),
          };
        })
        .filter(Boolean);

      const searchableFields = fields
        .filter((field) => field.type === "String")
        .map((field) => field.name);
      const writableFields = fields
        .filter((field) =>
          !["_id", "createdAt", "updatedAt", "tokens", "password"].includes(
            field.name,
          ),
        )
        .map((field) => field.name);

      const tabMapping =
        RESOURCE_TAB_MAP[singular] ||
        RESOURCE_TAB_MAP[singular.replace(/\s+/g, "_")] ||
        RESOURCE_TAB_MAP[singular.replace(/\s+/g, "")] ||
        null;

      return {
        model: modelName,
        singular,
        plural,
        collection:
          String(model.collection?.collectionName || "").trim() || plural,
        aliases: toUniqueArray([
          singular,
          plural,
          toLowerAlias(toTitleCaseWords(singular)),
          toLowerAlias(toTitleCaseWords(plural)),
        ]),
        fields,
        searchableFields,
        writableFields,
        tabs: {
          create: tabMapping?.createTab || null,
          list: tabMapping?.listTab || null,
        },
      };
    })
    .sort((a, b) => a.model.localeCompare(b.model));
};

const buildFieldAliasIndex = (resources) => {
  const entries = [];
  resources.forEach((resource) => {
    resource.fields.forEach((field) => {
      entries.push({
        resource: resource.singular,
        field: field.name,
        aliases: field.aliases,
        type: field.type,
      });
    });
  });
  return entries;
};

const buildVoiceDataset = () => {
  const resources = buildModelResources();
  const endpoints = extractAllApiEndpoints();

  return {
    generatedAt: new Date().toISOString(),
    version: 1,
    resources,
    endpoints,
    moduleCommands: MODULE_COMMANDS,
    fieldAliasIndex: buildFieldAliasIndex(resources),
  };
};

const getVoiceDatasetForClient = ({ force = false } = {}) => {
  const now = Date.now();
  if (
    !force &&
    cachedDataset.value &&
    Number(cachedDataset.expiresAt || 0) > now
  ) {
    return cachedDataset.value;
  }

  const dataset = buildVoiceDataset();
  cachedDataset = {
    value: dataset,
    expiresAt: now + CACHE_TTL_MS,
  };
  return dataset;
};

module.exports = {
  getVoiceDatasetForClient,
  buildVoiceDataset,
};
