import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiFileText,
  FiInfo,
  FiUploadCloud,
} from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const SAMPLE_JSON_PRODUCTS = [
  {
    title: "Cotton Panjabi - Black",
    description: "Premium cotton panjabi for Eid collection",
    categoryName: "Fashion",
    priceType: "single",
    price: 1450,
    stock: 20,
    productType: "Popular",
    brand: "BD Style",
    colors: ["#000000", "#ffffff"],
    dimensions: "M, L, XL",
    features: ["100% cotton", "Comfort fit", "Made in Bangladesh"],
    specifications: [
      { key: "Fabric", value: "Cotton" },
      { key: "Origin", value: "Bangladesh" },
    ],
    images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab"],
    showStockToPublic: true,
    isRecurring: false,
  },
  {
    title: "Leather Loafer - Brown",
    description: "Comfortable formal loafer for men",
    categoryName: "Fashion",
    priceType: "best",
    price: 3200,
    salePrice: 2790,
    stock: 15,
    productType: "Latest",
    brand: "Dhaka Walk",
    colors: ["#8b4513"],
    dimensions: "40, 41, 42",
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff"],
    showStockToPublic: true,
    isRecurring: true,
    recurringInterval: "monthly",
    recurringIntervalCount: 1,
    recurringTotalCycles: 12,
    recurringTrialDays: 7,
  },
];

const SAMPLE_CSV = [
  "title,description,categoryName,priceType,price,salePrice,stock,productType,brand,colors,dimensions,features,specifications,images,showStockToPublic,allowBackorder,marketplaceType,commissionType,commissionValue,commissionFixed,isRecurring,recurringInterval,recurringIntervalCount,recurringTotalCycles,recurringTrialDays",
  '"Cotton Panjabi - Black","Premium cotton panjabi for Eid collection","Fashion","single","1450","","20","Popular","BD Style","#000000|#ffffff","M, L, XL","100% cotton|Comfort fit|Made in Bangladesh","Fabric:Cotton|Origin:Bangladesh","https://images.unsplash.com/photo-1521572163474-6864f9cf17ab","true","false","simple","inherit","0","0","false","monthly","1","0","0"',
  '"Leather Loafer - Brown","Comfortable formal loafer for men","Fashion","best","3200","2790","15","Latest","Dhaka Walk","#8b4513","40, 41, 42","","","https://images.unsplash.com/photo-1542291026-7eec264c27ff","true","false","simple","hybrid","3","40","true","monthly","1","12","7"',
].join("\n");

const parseCsvLine = (line) => {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map((value) => value.trim());
};

const parseCsvRows = (text) => {
  const normalized = String(text || "")
    .replace(/^\uFEFF/, "")
    .trim();

  if (!normalized) {
    return {
      headers: [],
      rows: [],
    };
  }

  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return {
      headers: [],
      rows: [],
    };
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? "";
    });
    row.__line = index + 2;
    return row;
  });

  return { headers, rows };
};

const parsePipeList = (value) => {
  const text = String(value || "").trim();
  if (!text) return [];
  return text
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const parseSpecifications = (value) => {
  const entries = parsePipeList(value);
  return entries
    .map((entry) => {
      const [key, ...rest] = entry.split(":");
      return {
        key: String(key || "").trim(),
        value: String(rest.join(":") || "").trim(),
      };
    })
    .filter((entry) => entry.key && entry.value);
};

const parseBoolean = (value, fallback = false) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (!normalized) return fallback;
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
};

const parseNumber = (value, fallback = undefined) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseInteger = (value, fallback = undefined) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizePriceType = (value) => {
  const normalized = String(value || "single").trim().toLowerCase();
  if (["single", "best", "tba"].includes(normalized)) return normalized;
  return "single";
};

const normalizeMarketplaceType = (value) => {
  const normalized = String(value || "simple").trim().toLowerCase();
  if (["simple", "variable", "digital", "service", "grouped"].includes(normalized)) {
    return normalized;
  }
  return "simple";
};

const normalizeCommissionType = (value) => {
  const normalized = String(value || "inherit").trim().toLowerCase();
  if (["inherit", "percentage", "fixed", "hybrid"].includes(normalized)) {
    return normalized;
  }
  return "inherit";
};

const normalizeRecurringInterval = (value) => {
  const normalized = String(value || "monthly").trim().toLowerCase();
  if (["weekly", "monthly", "quarterly", "yearly"].includes(normalized)) {
    return normalized;
  }
  return "monthly";
};

const buildProductFromCsvRow = (row) => {
  const priceType = normalizePriceType(row.priceType);
  const mapped = {
    title: String(row.title || "").trim(),
    description: String(row.description || "").trim(),
    categoryName: String(row.categoryName || row.category || "").trim(),
    priceType,
    commissionType: normalizeCommissionType(row.commissionType),
    commissionValue: parseNumber(row.commissionValue, 0),
    commissionFixed: parseNumber(row.commissionFixed, 0),
    marketplaceType: normalizeMarketplaceType(row.marketplaceType),
    productType: String(row.productType || "General").trim() || "General",
    brand: String(row.brand || "").trim(),
    dimensions: String(row.dimensions || "").trim(),
    colors: parsePipeList(row.colors),
    features: parsePipeList(row.features),
    specifications: parseSpecifications(row.specifications),
    images: parsePipeList(row.images),
    allowBackorder: parseBoolean(row.allowBackorder, false),
    showStockToPublic: parseBoolean(row.showStockToPublic, false),
    isRecurring: parseBoolean(row.isRecurring, false),
    recurringInterval: normalizeRecurringInterval(row.recurringInterval),
    recurringIntervalCount: parseInteger(row.recurringIntervalCount, 1),
    recurringTotalCycles: parseInteger(row.recurringTotalCycles, 0),
    recurringTrialDays: parseInteger(row.recurringTrialDays, 0),
  };

  const stock = parseInteger(row.stock, undefined);
  if (stock !== undefined) mapped.stock = stock;

  const weight = parseNumber(row.weight, undefined);
  if (weight !== undefined) mapped.weight = weight;

  const deliveryMinDays = parseInteger(row.deliveryMinDays, undefined);
  if (deliveryMinDays !== undefined) mapped.deliveryMinDays = deliveryMinDays;

  const deliveryMaxDays = parseInteger(row.deliveryMaxDays, undefined);
  if (deliveryMaxDays !== undefined) mapped.deliveryMaxDays = deliveryMaxDays;

  const serviceDurationDays = parseInteger(row.serviceDurationDays, undefined);
  if (serviceDurationDays !== undefined) mapped.serviceDurationDays = serviceDurationDays;

  if (mapped.marketplaceType === "digital") {
    mapped.downloadUrl = String(row.downloadUrl || "").trim();
  }

  if (priceType === "best") {
    mapped.price = parseNumber(row.price, 0);
    mapped.salePrice = parseNumber(row.salePrice, undefined);
  } else if (priceType === "single") {
    mapped.price = parseNumber(row.price, 0);
  } else {
    mapped.price = 0;
    mapped.stock = 0;
    mapped.allowBackorder = false;
  }

  return mapped;
};

const normalizeJsonInput = (input) => {
  if (Array.isArray(input)) return input;
  if (input && typeof input === "object") {
    if (Array.isArray(input.products)) return input.products;
    return [input];
  }
  return [];
};

const validatePreparedProducts = (products) => {
  const issues = [];

  products.forEach((product, index) => {
    const line = index + 1;
    const priceType = normalizePriceType(product.priceType);
    const marketplaceType = normalizeMarketplaceType(product.marketplaceType);

    if (!String(product.title || "").trim()) {
      issues.push({ line, title: product.title || "", reason: "title is required" });
    }
    if (!String(product.description || "").trim()) {
      issues.push({ line, title: product.title || "", reason: "description is required" });
    }
    if (
      !String(product.categoryName || "").trim() &&
      !String(product.category || "").trim() &&
      !String(product.categoryId || "").trim()
    ) {
      issues.push({
        line,
        title: product.title || "",
        reason: "categoryName/category/categoryId is required",
      });
    }

    if (!["variable", "grouped"].includes(marketplaceType)) {
      if (priceType === "single") {
        if (!(Number(product.price) > 0)) {
          issues.push({ line, title: product.title || "", reason: "single price must be > 0" });
        }
      }
      if (priceType === "best") {
        const previous = Number(product.price);
        const next = Number(product.salePrice);
        if (!(previous > 0) || !(next > 0) || !(next < previous)) {
          issues.push({
            line,
            title: product.title || "",
            reason: "best price requires previous price > new price > 0",
          });
        }
      }
    }

    if (Boolean(product.isRecurring)) {
      if (!["simple", "digital", "service"].includes(marketplaceType)) {
        issues.push({
          line,
          title: product.title || "",
          reason: "recurring is allowed only for simple, digital, or service products",
        });
      }
      if (priceType === "tba") {
        issues.push({
          line,
          title: product.title || "",
          reason: "recurring product cannot use tba price type",
        });
      }
    }
  });

  return issues;
};

const downloadTextFile = (fileName, content) => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const BulkProductUpload = () => {
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState("");
  const [inputMode, setInputMode] = useState("csv");
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [productsJson, setProductsJson] = useState(
    JSON.stringify(SAMPLE_JSON_PRODUCTS, null, 2),
  );
  const [parsedProducts, setParsedProducts] = useState([]);
  const [parseIssues, setParseIssues] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [categories, setCategories] = useState([]);

  const isAdmin = user?.userType === "admin";
  const isVendor = user?.userType === "vendor";

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${baseUrl}/categories`, {
          headers: getAuthHeaders(),
        });
        const data = response.data?.categories || response.data?.data || response.data || [];
        setCategories(Array.isArray(data) ? data : []);
      } catch {
        setCategories([]);
      }
    };

    if (isAdmin || isVendor) {
      fetchCategories();
    }
  }, [isAdmin, isVendor]);

  const categoryNameHint = useMemo(() => {
    return categories
      .map((entry) => String(entry?.name || "").trim())
      .filter(Boolean)
      .slice(0, 12);
  }, [categories]);

  const sampleJsonText = useMemo(
    () => JSON.stringify(SAMPLE_JSON_PRODUCTS, null, 2),
    [],
  );
  const inputText = inputMode === "csv" ? csvText : productsJson;
  const hasInput = String(inputText || "").trim().length > 0;
  const hasValidationResult = parsedProducts.length > 0 || parseIssues.length > 0;

  const issueLineCount = useMemo(() => {
    const lines = new Set(
      parseIssues
        .map((issue) => String(issue?.line || "").trim())
        .filter((line) => line && line !== "-"),
    );
    return lines.size;
  }, [parseIssues]);

  const readyRows = useMemo(
    () => Math.max(parsedProducts.length - issueLineCount, 0),
    [parsedProducts.length, issueLineCount],
  );

  const parseSummary = useMemo(
    () => ({
      parsed: parsedProducts.length,
      issues: parseIssues.length,
      validRows: readyRows,
    }),
    [parsedProducts.length, parseIssues.length, readyRows],
  );

  const workflowSteps = useMemo(
    () => [
      {
        key: "format",
        title: "Select Format",
        done: true,
        warning: false,
        description: inputMode === "csv" ? "CSV mode selected" : "JSON mode selected",
      },
      {
        key: "input",
        title: "Add Data",
        done: hasInput,
        warning: false,
        description: selectedFileName
          ? `Loaded file: ${selectedFileName}`
          : "Paste rows or upload a file",
      },
      {
        key: "validate",
        title: "Validate",
        done: hasValidationResult && parseIssues.length === 0 && parsedProducts.length > 0,
        warning: hasValidationResult && parseIssues.length > 0,
        description: hasValidationResult
          ? `${parseSummary.parsed} parsed / ${parseSummary.issues} issue(s)`
          : "Run Parse & Validate",
      },
      {
        key: "upload",
        title: "Upload",
        done: Boolean(result?.success && Number(result?.createdCount || 0) > 0),
        warning: Boolean(result && !result?.success),
        description: result
          ? `${result.createdCount || 0} created / ${result.failedCount || 0} failed`
          : "Upload after validation",
      },
    ],
    [
      hasInput,
      hasValidationResult,
      inputMode,
      parseIssues.length,
      parsedProducts.length,
      parseSummary.issues,
      parseSummary.parsed,
      result,
      selectedFileName,
    ],
  );

  const parseCurrentInput = ({ showToast = true } = {}) => {
    try {
      let products = [];

      if (inputMode === "csv") {
        const { rows } = parseCsvRows(csvText);
        products = rows.map((row) => buildProductFromCsvRow(row));
      } else {
        const parsed = JSON.parse(productsJson);
        products = normalizeJsonInput(parsed);
      }

      if (!Array.isArray(products) || products.length === 0) {
        setParsedProducts([]);
        setParseIssues([
          { line: "-", title: "", reason: "No product rows found in input" },
        ]);
        if (showToast) toast.error("No product rows found");
        return { products: [], issues: [{ line: "-", reason: "No rows" }] };
      }

      const issues = validatePreparedProducts(products);
      setParsedProducts(products);
      setParseIssues(issues);

      if (showToast) {
        if (issues.length > 0) {
          toast.error(
            `Parsed ${products.length} products. Fix ${issues.length} validation issue(s) first.`,
          );
        } else {
          toast.success(`Parsed ${products.length} products successfully`);
        }
      }

      return { products, issues };
    } catch (error) {
      const reason = error?.message || "Failed to parse input";
      setParsedProducts([]);
      setParseIssues([{ line: "-", title: "", reason }]);
      if (showToast) toast.error(reason);
      return { products: [], issues: [{ line: "-", reason }] };
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileText = await file.text();
      setSelectedFileName(file.name);

      if (file.name.toLowerCase().endsWith(".json")) {
        setInputMode("json");
        setProductsJson(fileText);
        toast.success("JSON file loaded");
      } else {
        setInputMode("csv");
        setCsvText(fileText);
        toast.success("CSV file loaded");
      }
    } catch {
      toast.error("Failed to read selected file");
    } finally {
      event.target.value = "";
    }
  };

  const handleUseSample = () => {
    if (inputMode === "csv") {
      setCsvText(SAMPLE_CSV);
    } else {
      setProductsJson(sampleJsonText);
    }
    setParsedProducts([]);
    setParseIssues([]);
    setResult(null);
    setSelectedFileName("");
  };

  const handleDownloadTemplate = () => {
    if (inputMode === "csv") {
      downloadTextFile("bulk-product-template.csv", SAMPLE_CSV);
      return;
    }
    downloadTextFile("bulk-product-template.json", sampleJsonText);
  };

  const handleClearInput = () => {
    if (inputMode === "csv") {
      setCsvText("");
    } else {
      setProductsJson("");
    }
    setParsedProducts([]);
    setParseIssues([]);
    setResult(null);
    setSelectedFileName("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isAdmin && !isVendor) {
      toast.error("Only admin or vendor can bulk upload products");
      return;
    }

    const { products, issues } = parseCurrentInput({ showToast: false });

    if (!products.length) {
      toast.error("No valid products found to upload");
      return;
    }

    if (issues.length > 0) {
      toast.error("Fix the validation issues before upload");
      return;
    }

    try {
      setSubmitting(true);
      setResult(null);

      const response = await axios.post(
        `${baseUrl}/products/bulk-upload`,
        {
          products,
          ...(isAdmin && vendorId.trim() ? { vendorId: vendorId.trim() } : {}),
        },
        { headers: getAuthHeaders() },
      );

      setResult(response.data);
      toast.success(response.data?.message || "Bulk upload completed");
    } catch (error) {
      const payload = error.response?.data;
      setResult(payload || null);
      toast.error(payload?.message || "Bulk upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin && !isVendor) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Access Required</h2>
        <p className="text-gray-600">Only admin or vendor can use bulk upload.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mb-4">
          <FiUploadCloud className="w-6 h-6" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Bulk Product Upload</h1>
        <p className="text-zinc-200 mt-2">
          Structured flow: choose format, validate data, and upload with clear results.
        </p>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg border border-white/20 bg-white/5 px-3 py-2">
            <p className="text-zinc-300">Parsed Rows</p>
            <p className="text-xl font-bold">{parseSummary.parsed}</p>
          </div>
          <div className="rounded-lg border border-white/20 bg-white/5 px-3 py-2">
            <p className="text-zinc-300">Valid Rows</p>
            <p className="text-xl font-bold">{parseSummary.validRows}</p>
          </div>
          <div className="rounded-lg border border-white/20 bg-white/5 px-3 py-2">
            <p className="text-zinc-300">Issues</p>
            <p className="text-xl font-bold">{parseSummary.issues}</p>
          </div>
          <div className="rounded-lg border border-white/20 bg-white/5 px-3 py-2">
            <p className="text-zinc-300">Last Upload</p>
            <p className="text-xl font-bold">{result?.createdCount || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-8 bg-white border border-gray-200 rounded-xl p-5 md:p-6 space-y-6"
        >
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 1</p>
                <h2 className="text-base md:text-lg font-semibold text-black">Choose Input Format</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInputMode("csv")}
                  className={`px-4 h-10 rounded-lg border text-sm font-semibold transition-colors ${
                    inputMode === "csv"
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("json")}
                  className={`px-4 h-10 rounded-lg border text-sm font-semibold transition-colors ${
                    inputMode === "json"
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  JSON
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleUseSample}
                className="inline-flex items-center gap-1.5 px-3 h-9 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                <FiFileText className="w-3.5 h-3.5" />
                Use Sample
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 h-9 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                <FiDownload className="w-3.5 h-3.5" />
                Download {inputMode.toUpperCase()} Template
              </button>
              <button
                type="button"
                onClick={handleClearInput}
                className="inline-flex items-center gap-1.5 px-3 h-9 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Clear
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 2</p>
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Vendor ID (optional)
                </label>
                <input
                  value={vendorId}
                  onChange={(event) => setVendorId(event.target.value)}
                  placeholder="Leave empty for marketplace/global product"
                  className="w-full px-3 h-10 border border-gray-200 rounded-lg"
                />
              </div>
            )}
            <div className="rounded-lg border border-dashed border-gray-300 p-4 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload a file (.csv or .json)
              </label>
              <input
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={handleFileSelect}
                className="block w-full text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                {selectedFileName ? `Loaded file: ${selectedFileName}` : "No file selected."}
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Step 3</p>
                <h2 className="text-base md:text-lg font-semibold text-black">
                  {inputMode === "csv" ? "Paste CSV Product Rows" : "Paste JSON Product Array"}
                </h2>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-700">
                Mode: {inputMode.toUpperCase()}
              </span>
            </div>

            {inputMode === "csv" ? (
              <textarea
                value={csvText}
                onChange={(event) => setCsvText(event.target.value)}
                rows={14}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg font-mono text-sm"
                placeholder="Paste CSV rows here..."
              />
            ) : (
              <textarea
                value={productsJson}
                onChange={(event) => setProductsJson(event.target.value)}
                rows={14}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg font-mono text-sm"
                placeholder="Paste JSON array here..."
              />
            )}
            <p className="text-xs text-gray-500">
              CSV arrays should use `|` separators for: colors, features, specifications, images.
            </p>
          </section>

          <section className="border-t border-gray-100 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => parseCurrentInput({ showToast: true })}
                className="inline-flex items-center justify-center h-10 px-4 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-black"
              >
                Step 4: Parse & Validate
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center h-10 px-5 bg-black text-white rounded-lg text-sm font-semibold disabled:opacity-60"
              >
                {submitting ? "Uploading..." : "Step 5: Upload Products"}
              </button>
            </div>
          </section>
        </form>

        <div className="xl:col-span-4 space-y-4">
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-base font-semibold text-black">Upload Workflow</h2>
            <div className="space-y-3 mt-4">
              {workflowSteps.map((step) => {
                const Icon = step.done ? FiCheckCircle : step.warning ? FiAlertCircle : FiClock;
                const iconClass = step.done
                  ? "text-emerald-600"
                  : step.warning
                    ? "text-red-600"
                    : "text-gray-400";

                return (
                  <div key={step.key} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Icon className={`w-4 h-4 mt-0.5 ${iconClass}`} />
                      <div>
                        <p className="text-sm font-semibold text-black">{step.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5 break-words">{step.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <FiInfo className="w-4 h-4 text-gray-500" />
              <h2 className="text-base font-semibold text-black">Validation Rules</h2>
            </div>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>Required: title, description, and categoryName/category/categoryId.</li>
              <li>`single`: use `price` greater than 0.</li>
              <li>`best`: `price` and `salePrice`, with `salePrice` lower than `price`.</li>
              <li>`tba`: uploads without sell price and stock for checkout.</li>
              <li>`isRecurring=true`: valid for simple/digital/service and non-TBA pricing only.</li>
            </ul>
          </section>

          {categoryNameHint.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-base font-semibold text-black mb-2">Category Name Hints</h2>
              <div className="flex flex-wrap gap-2">
                {categoryNameHint.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-700"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {hasValidationResult && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-black">Parsed Preview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-gray-500">Parsed Rows</p>
              <p className="text-xl font-bold text-black">{parseSummary.parsed}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-gray-500">Valid Rows</p>
              <p className="text-xl font-bold text-emerald-700">{parseSummary.validRows}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-gray-500">Issues</p>
              <p className="text-xl font-bold text-red-700">{parseSummary.issues}</p>
            </div>
          </div>

          {parsedProducts.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2.5 w-14">#</th>
                    <th className="text-left p-2.5">Title</th>
                    <th className="text-left p-2.5">Category</th>
                    <th className="text-left p-2.5">Price Type</th>
                    <th className="text-left p-2.5">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedProducts.slice(0, 12).map((item, index) => (
                    <tr key={`${item.title || "row"}-${index}`} className="border-t border-gray-100">
                      <td className="p-2.5 text-gray-500">{index + 1}</td>
                      <td className="p-2.5 line-clamp-1">{item.title}</td>
                      <td className="p-2.5 line-clamp-1">
                        {item.categoryName || item.category || item.categoryId || "-"}
                      </td>
                      <td className="p-2.5">{item.priceType || "single"}</td>
                      <td className="p-2.5">
                        {item.priceType === "best"
                          ? `${item.price ?? "-"} -> ${item.salePrice ?? "-"}`
                          : item.priceType === "tba"
                            ? "TBA"
                            : item.price ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {parseIssues.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-700 mb-2">Validation Issues</h3>
              <div className="overflow-x-auto border border-red-200 rounded-lg max-h-72">
                <table className="min-w-full text-sm">
                  <thead className="bg-red-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2.5 w-20">Line</th>
                      <th className="text-left p-2.5">Product</th>
                      <th className="text-left p-2.5">Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseIssues.slice(0, 40).map((issue, index) => (
                      <tr
                        key={`${issue.line}-${issue.reason}-${index}`}
                        className="border-t border-red-100"
                      >
                        <td className="p-2.5 text-red-700 font-medium">{issue.line}</td>
                        <td className="p-2.5 text-red-700">{issue.title || "-"}</td>
                        <td className="p-2.5 text-red-600 break-words">{issue.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parseIssues.length > 40 && (
                <p className="text-xs text-red-600 mt-2">
                  Showing first 40 issues. Fix and validate again to continue.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-black">Upload Result</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-gray-500">Created</p>
              <p className="text-xl font-bold text-emerald-700">{result.createdCount || 0}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-gray-500">Failed</p>
              <p className="text-xl font-bold text-red-700">{result.failedCount || 0}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-gray-500">Status</p>
              <p className="text-sm font-semibold text-black mt-1 inline-flex items-center gap-1.5">
                {result.success ? (
                  <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <FiAlertCircle className="w-4 h-4 text-red-600" />
                )}
                {result.success ? "Completed" : "Failed"}
              </p>
            </div>
          </div>

          {Array.isArray(result.created) && result.created.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-black mb-2">Created Items</h3>
              <div className="overflow-x-auto border border-emerald-200 rounded-lg max-h-56">
                <table className="min-w-full text-sm">
                  <thead className="bg-emerald-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2.5 w-20">No.</th>
                      <th className="text-left p-2.5">Title</th>
                      <th className="text-left p-2.5 w-40">Approval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.created.slice(0, 20).map((item, idx) => (
                      <tr key={`${item._id || idx}-${idx}`} className="border-t border-emerald-100">
                        <td className="p-2.5 text-emerald-700 font-medium">{idx + 1}</td>
                        <td className="p-2.5 text-gray-800 break-words">{item.title || "-"}</td>
                        <td className="p-2.5 text-gray-700">{item.approvalStatus || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {Array.isArray(result.failed) && result.failed.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-black mb-2">Failed Items</h3>
              <div className="overflow-x-auto border border-red-200 rounded-lg max-h-72">
                <table className="min-w-full text-sm">
                  <thead className="bg-red-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2.5 w-20">Line</th>
                      <th className="text-left p-2.5">Title</th>
                      <th className="text-left p-2.5">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.failed.map((item, idx) => (
                      <tr key={`${item.line || idx}-${idx}`} className="border-t border-red-100">
                        <td className="p-2.5 text-red-700 font-medium">{item.line || "N/A"}</td>
                        <td className="p-2.5 text-red-700">{item.title || "-"}</td>
                        <td className="p-2.5 text-red-600 break-words">
                          {item.reason || "Validation failed"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkProductUpload;
