const axios = require("axios");

const OLLAMA_BASE_URL = String(
  process.env.VOICE_LLM_BASE_URL || "http://127.0.0.1:11434",
).replace(/\/+$/, "");
const OLLAMA_MODEL = String(process.env.VOICE_LLM_MODEL || "qwen2.5:3b").trim();
const GROQ_MODEL = String(process.env.GROQ_MODEL || "llama-3.1-8b-instant").trim();
const GROQ_API_KEY = String(process.env.GROQ_API_KEY || "",).trim();
const GEMINI_MODEL = String(process.env.GEMINI_MODEL || "gemini-2.0-flash-lite").trim();
const GEMINI_API_KEY = String(
  process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || "",
).trim();
const hasUsableKey = (value, placeholders = []) => {
  const normalized = String(value || "").trim();
  if (!normalized) return false;
  const lower = normalized.toLowerCase();
  return !["changeme", ...placeholders].includes(lower);
};
const hasUsableGroqKey = (value) =>
  hasUsableKey(value, [
    "your-groq-api-key",
    "your_groq_api_key",
    "paste-your-groq-api-key-here",
    "paste_your_groq_api_key_here",
  ]);
const hasUsableGeminiKey = (value) =>
  hasUsableKey(value, [
    "your-gemini-api-key",
    "your_gemini_api_key",
    "paste-your-gemini-api-key-here",
    "paste_your_gemini_api_key_here",
  ]);
const DEFAULT_PROVIDER = hasUsableGroqKey(GROQ_API_KEY)
  ? "groq"
  : hasUsableGeminiKey(GEMINI_API_KEY)
    ? "gemini"
    : "ollama";
const VOICE_PLANNER_PROVIDER = String(
  process.env.VOICE_PLANNER_PROVIDER || "auto",
)
  .trim()
  .toLowerCase();
const VOICE_PLANNER_TIMEOUT_MS = Math.max(
  10000,
  Number(process.env.VOICE_LLM_TIMEOUT_MS || 30000),
);

const toAliasList = (values = [], limit = 6) =>
  Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean))).slice(0, limit);

const tokenizeCommand = (command) =>
  String(command || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

const hasTokenMatch = (value, tokens) =>
  tokens.some((token) => String(value || "").toLowerCase().includes(token));

const COMMON_FIELD_NAMES = new Set([
  "title",
  "name",
  "description",
  "price",
  "salePrice",
  "stock",
  "category",
  "brand",
  "status",
  "email",
  "phone",
  "amount",
]);

const normalizePlannerCommand = (command) => {
  let normalized = String(command || "").trim();
  const hasBanglaNavigationHint = /\b(e|te)\s+(jao|jan)\b/i.test(normalized);

  const replacements = [
    [/\be\s+jao\b/gi, ""],
    [/\be\s+jan\b/gi, ""],
    [/\bte\s+jao\b/gi, ""],
    [/\bte\s+jan\b/gi, ""],
    [/\bkore\s+dao\b/gi, ""],
    [/\bkore\s+din\b/gi, ""],
    [/\bkhulo\b/gi, "open"],
    [/\bkhulun\b/gi, "open"],
  ];

  replacements.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });

  normalized = normalized.replace(/\s+/g, " ").trim();

  if (
    hasBanglaNavigationHint &&
    normalized &&
    !/\b(go\s+to|open|navigate)\b/i.test(normalized)
  ) {
    normalized = `go to ${normalized}`;
  }

  return normalized;
};

const SYSTEM_PROMPT = [
  "You plan admin dashboard voice actions for a MERN ecommerce app.",
  "Convert the user's request into short executable command segments.",
  "Use only dashboard tabs and field aliases from the provided dataset.",
  "Understand English, Bangla, and Banglish transliteration.",
  "Treat normalizedCommand as the cleaned version of the user request when rawCommand contains filler words.",
  "Do not treat filler words like 'e', 'jao', 'jan', 'kore dao', or 'kore din' as field names or values.",
  "If the command mainly names a page, tab, or module, treat it as navigation.",
  "Prefer commands like: go to X, open X, set Y to Z, type Y as Z, select Y as Z, click save.",
  "Examples: 'products page e jao' -> 'go to products page'.",
  "Examples: 'inventory center e jao' -> 'go to inventory center'.",
  "Examples: 'product title apple kore dao' -> 'set title as apple'.",
  "If file upload is requested, only say 'open file picker'; do not claim local file selection is automatic.",
  "Return strict JSON only with keys: summary, segments, needsClarification, clarification.",
  "segments must be an array of plain strings, maximum 6 entries.",
  "If the request is unsafe or impossible, return empty segments and explain in clarification.",
].join(" ");

const buildPlannerContext = (dataset = {}, command = "") => {
  const tokens = tokenizeCommand(command);
  const moduleCommands = Array.isArray(dataset?.moduleCommands)
    ? dataset.moduleCommands
        .filter((entry) => {
          const joined = [entry.tab, ...(entry.aliases || [])].join(" ").toLowerCase();
          return tokens.length === 0 ? true : hasTokenMatch(joined, tokens);
        })
        .slice(0, 10)
        .map((entry) => ({
          tab: entry.tab,
          aliases: toAliasList(entry.aliases, 4),
        }))
    : [];

  const rawResources = Array.isArray(dataset?.resources) ? dataset.resources : [];
  const directlyMatchedResources = rawResources.filter((resource) => {
    const aliases = [resource.singular, ...(resource.aliases || [])].map((value) =>
      String(value || "").toLowerCase(),
    );
    return aliases.some((alias) => alias && String(command || "").toLowerCase().includes(alias));
  });

  const resourcePool =
    directlyMatchedResources.length > 0
      ? directlyMatchedResources
      : rawResources.filter((resource) => {
          const resourceText = [resource.singular, ...(resource.aliases || [])].join(" ");
          return hasTokenMatch(resourceText, tokens);
        });

  const resources = resourcePool
    .slice(0, 4)
    .map((resource) => {
      const matchingFields = Array.isArray(resource.fields)
        ? resource.fields
            .filter((field) => {
              const fieldText = [field.name, ...(field.aliases || [])].join(" ").toLowerCase();
              if (COMMON_FIELD_NAMES.has(field.name)) return true;
              return tokens.length === 0 ? false : hasTokenMatch(fieldText, tokens);
            })
            .slice(0, 10)
            .map((field) => ({
              name: field.name,
              type: field.type,
              aliases: toAliasList(field.aliases, 4),
            }))
        : [];

      return {
        resource: resource.singular,
        aliases: toAliasList(resource.aliases, 4),
        tabs: resource.tabs || {},
        fields: matchingFields,
      };
    })
    .filter((resource) => resource.fields.length > 0 || resource.tabs?.create || resource.tabs?.list);

  return {
    moduleCommands,
    resources,
  };
};

const buildPlannerPayload = ({ command, currentPath, dashboardTab, dataset }) => {
  const rawCommand = String(command || "").trim();
  const normalizedCommand = normalizePlannerCommand(command) || rawCommand;

  return JSON.stringify({
    command: normalizedCommand,
    rawCommand,
    normalizedCommand,
    currentPath: String(currentPath || "").trim(),
    dashboardTab: String(dashboardTab || "").trim(),
    dataset: buildPlannerContext(dataset, normalizedCommand),
  });
};

const parsePlannerResponse = (rawContent, providerLabel = "planner") => {
  const raw = String(rawContent || "").trim();
  if (!raw) {
    return {
      summary: "",
      segments: [],
      needsClarification: true,
      clarification: `The ${providerLabel} returned an empty response.`,
    };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      summary: String(parsed?.summary || "").trim(),
      segments: Array.isArray(parsed?.segments)
        ? parsed.segments.map((value) => String(value || "").trim()).filter(Boolean).slice(0, 6)
        : [],
      needsClarification: Boolean(parsed?.needsClarification),
      clarification: String(parsed?.clarification || "").trim(),
    };
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return parsePlannerResponse(jsonMatch[0], providerLabel);
    }

    return {
      summary: "",
      segments: [],
      needsClarification: true,
      clarification: `The ${providerLabel} returned invalid JSON.`,
    };
  }
};

const normalizePlannerSegments = (segments = []) => {
  const normalized = [];
  const trailingNavigationTokens = new Set(["page", "tab", "section", "screen"]);

  for (let index = 0; index < segments.length; index += 1) {
    const current = String(segments[index] || "").trim();
    const next = String(segments[index + 1] || "").trim();
    const currentLower = current.toLowerCase();

    if (["go to", "open", "click", "select"].includes(currentLower) && next) {
      normalized.push(`${currentLower} ${next}`.trim());
      index += 1;
      continue;
    }

    if (current) {
      const previous = String(normalized[normalized.length - 1] || "").toLowerCase();
      if (
        trailingNavigationTokens.has(currentLower) &&
        (previous.startsWith("go to ") || previous.startsWith("open "))
      ) {
        continue;
      }

      normalized.push(current);
    }
  }

  return normalized.slice(0, 6);
};

const resolvePlannerProvider = (requestedProvider = VOICE_PLANNER_PROVIDER) => {
  const normalized = String(requestedProvider || "auto").trim().toLowerCase();

  if (normalized === "auto") {
    if (hasUsableGroqKey(GROQ_API_KEY)) return "groq";
    if (hasUsableGeminiKey(GEMINI_API_KEY)) return "gemini";
    return "ollama";
  }

  return normalized;
};

const planVoiceWithOllama = async ({
  command,
  currentPath = "",
  dashboardTab = "",
  dataset,
}) => {
  const response = await axios.post(
    `${OLLAMA_BASE_URL}/api/chat`,
    {
      model: OLLAMA_MODEL,
      stream: false,
      format: "json",
      options: {
        temperature: 0.1,
      },
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: buildPlannerPayload({
            command,
            currentPath,
            dashboardTab,
            dataset,
          }),
        },
      ],
    },
    {
      timeout: VOICE_PLANNER_TIMEOUT_MS,
    },
  );

  return {
    ...(() => {
      const parsed = parsePlannerResponse(response?.data?.message?.content, "Ollama planner");
      return {
        ...parsed,
        segments: normalizePlannerSegments(parsed.segments),
      };
    })(),
    model: OLLAMA_MODEL,
    provider: "ollama",
  };
};

const extractGeminiText = (responseData = {}) => {
  const parts = responseData?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) => String(part?.text || "").trim())
    .filter(Boolean)
    .join("\n");
};

const extractGroqText = (responseData = {}) =>
  String(responseData?.choices?.[0]?.message?.content || "").trim();

const planVoiceWithGroq = async ({
  command,
  currentPath = "",
  dashboardTab = "",
  dataset,
}) => {
  if (!hasUsableGroqKey(GROQ_API_KEY)) {
    throw new Error("Groq API key is missing. Set GROQ_API_KEY in backend env.");
  }

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: GROQ_MODEL,
      temperature: 0.1,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: buildPlannerPayload({
            command,
            currentPath,
            dashboardTab,
            dataset,
          }),
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      timeout: VOICE_PLANNER_TIMEOUT_MS,
    },
  );

  return {
    ...(() => {
      const parsed = parsePlannerResponse(extractGroqText(response?.data), "Groq planner");
      return {
        ...parsed,
        segments: normalizePlannerSegments(parsed.segments),
      };
    })(),
    model: GROQ_MODEL,
    provider: "groq",
  };
};

const planVoiceWithGemini = async ({
  command,
  currentPath = "",
  dashboardTab = "",
  dataset,
}) => {
  if (!hasUsableGeminiKey(GEMINI_API_KEY)) {
    throw new Error("Gemini API key is missing. Set GEMINI_API_KEY in backend env.");
  }

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
    {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildPlannerPayload({
                command,
                currentPath,
                dashboardTab,
                dataset,
              }),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    },
    {
      headers: {
        "x-goog-api-key": GEMINI_API_KEY,
      },
      timeout: VOICE_PLANNER_TIMEOUT_MS,
    },
  );

  return {
    ...(() => {
      const parsed = parsePlannerResponse(extractGeminiText(response?.data), "Gemini planner");
      return {
        ...parsed,
        segments: normalizePlannerSegments(parsed.segments),
      };
    })(),
    model: GEMINI_MODEL,
    provider: "gemini",
  };
};

const planVoiceCommand = async (options = {}) => {
  const resolvedProvider = resolvePlannerProvider(VOICE_PLANNER_PROVIDER);

  if (resolvedProvider === "groq") {
    return planVoiceWithGroq(options);
  }

  if (resolvedProvider === "gemini") {
    return planVoiceWithGemini(options);
  }

  if (resolvedProvider === "ollama") {
    return planVoiceWithOllama(options);
  }

  throw new Error(
    `Unsupported voice planner provider "${VOICE_PLANNER_PROVIDER}". Use "auto", "groq", "gemini", or "ollama".`,
  );
};

const getVoicePlannerConfig = () => ({
  provider: VOICE_PLANNER_PROVIDER,
  resolvedProvider: resolvePlannerProvider(VOICE_PLANNER_PROVIDER),
  groqModel: GROQ_MODEL,
  geminiModel: GEMINI_MODEL,
  ollamaModel: OLLAMA_MODEL,
  hasGroqKey: hasUsableGroqKey(GROQ_API_KEY),
  hasGeminiKey: hasUsableGeminiKey(GEMINI_API_KEY),
});

module.exports = {
  planVoiceCommand,
  getVoicePlannerConfig,
};
