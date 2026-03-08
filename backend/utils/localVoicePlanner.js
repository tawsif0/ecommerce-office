const axios = require("axios");

const OLLAMA_BASE_URL = String(
  process.env.VOICE_LLM_BASE_URL || "http://127.0.0.1:11434",
).replace(/\/+$/, "");

const OLLAMA_MODEL = String(process.env.VOICE_LLM_MODEL || "qwen2.5:3b").trim();

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

const buildMessages = ({ command, currentPath, dashboardTab, dataset }) => {
  const context = buildPlannerContext(dataset, command);

  return [
    {
      role: "system",
      content: [
        "You plan admin dashboard voice actions for a MERN ecommerce app.",
        "Convert the user's request into short executable command segments.",
        "Use only dashboard tabs and field aliases from the provided dataset.",
        "Prefer commands like: go to X, open X, set Y to Z, type Y as Z, select Y as Z, click save.",
        "If file upload is requested, only say 'open file picker'; do not claim local file selection is automatic.",
        "Return strict JSON only with keys: summary, segments, needsClarification, clarification.",
        "segments must be an array of plain strings, maximum 6 entries.",
        "If the request is unsafe or impossible, return empty segments and explain in clarification.",
      ].join(" "),
    },
    {
      role: "user",
      content: JSON.stringify({
        command: String(command || "").trim(),
        currentPath: String(currentPath || "").trim(),
        dashboardTab: String(dashboardTab || "").trim(),
        dataset: context,
      }),
    },
  ];
};

const parsePlannerResponse = (rawContent) => {
  const raw = String(rawContent || "").trim();
  if (!raw) {
    return {
      summary: "",
      segments: [],
      needsClarification: true,
      clarification: "The local planner returned an empty response.",
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
      return parsePlannerResponse(jsonMatch[0]);
    }

    return {
      summary: "",
      segments: [],
      needsClarification: true,
      clarification: "The local planner returned invalid JSON.",
    };
  }
};

const planVoiceWithLocalModel = async ({
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
      messages: buildMessages({
        command,
        currentPath,
        dashboardTab,
        dataset,
      }),
    },
    {
      timeout: Math.max(10000, Number(process.env.VOICE_LLM_TIMEOUT_MS || 30000)),
    },
  );

  return {
    ...parsePlannerResponse(response?.data?.message?.content),
    model: OLLAMA_MODEL,
    provider: "ollama",
  };
};

module.exports = {
  planVoiceWithLocalModel,
  OLLAMA_BASE_URL,
  OLLAMA_MODEL,
};
