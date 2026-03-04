import { createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY = "voiceAssistantPrefs";

const loadPreferences = () => {
  if (typeof window === "undefined") {
    return {
      languageMode: "auto",
      voiceOutputEnabled: true,
      alwaysListening: false,
    };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    const languageMode = ["auto", "en-US", "bn-BD"].includes(parsed.languageMode)
      ? parsed.languageMode
      : "auto";

    return {
      languageMode,
      voiceOutputEnabled: parsed.voiceOutputEnabled !== false,
      alwaysListening: parsed.alwaysListening === true,
    };
  } catch {
    return {
      languageMode: "auto",
      voiceOutputEnabled: true,
      alwaysListening: false,
    };
  }
};

const persistPreferences = (state) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        languageMode: state.languageMode,
        voiceOutputEnabled: state.voiceOutputEnabled,
        alwaysListening: state.alwaysListening,
      }),
    );
  } catch {
    // ignore storage failures
  }
};

const initialPrefs = loadPreferences();

const initialState = {
  languageMode: initialPrefs.languageMode,
  voiceOutputEnabled: initialPrefs.voiceOutputEnabled,
  alwaysListening: initialPrefs.alwaysListening,
  supported: false,
  isSecureContext: true,
  isOnline: true,
  permissionState: "unknown",
  isListening: false,
  heardText: "",
  lastError: "",
  lastAction: "No command detected yet",
  voiceDataset: null,
  voiceDatasetUpdatedAt: null,
};

const voiceAssistantSlice = createSlice({
  name: "voiceAssistant",
  initialState,
  reducers: {
    setLanguageMode(state, action) {
      state.languageMode = ["auto", "en-US", "bn-BD"].includes(action.payload)
        ? action.payload
        : "auto";
      persistPreferences(state);
    },
    setVoiceOutputEnabled(state, action) {
      state.voiceOutputEnabled = Boolean(action.payload);
      persistPreferences(state);
    },
    setAlwaysListening(state, action) {
      state.alwaysListening = Boolean(action.payload);
      persistPreferences(state);
    },
    setVoiceRuntime(state, action) {
      const payload = action.payload || {};
      if (typeof payload.supported === "boolean") {
        state.supported = payload.supported;
      }
      if (typeof payload.isSecureContext === "boolean") {
        state.isSecureContext = payload.isSecureContext;
      }
      if (typeof payload.isOnline === "boolean") {
        state.isOnline = payload.isOnline;
      }
      if (typeof payload.permissionState === "string") {
        state.permissionState = payload.permissionState;
      }
      if (typeof payload.isListening === "boolean") {
        state.isListening = payload.isListening;
      }
    },
    setHeardText(state, action) {
      state.heardText = String(action.payload || "");
    },
    setVoiceError(state, action) {
      state.lastError = String(action.payload || "");
    },
    setVoiceAction(state, action) {
      const text = String(action.payload || "").trim();
      state.lastAction = text || "Done";
    },
    clearVoiceMessages(state) {
      state.heardText = "";
      state.lastError = "";
    },
    setVoiceDataset(state, action) {
      state.voiceDataset =
        action.payload && typeof action.payload === "object"
          ? action.payload
          : null;
      state.voiceDatasetUpdatedAt = state.voiceDataset
        ? new Date().toISOString()
        : null;
    },
  },
});

export const {
  setLanguageMode,
  setVoiceOutputEnabled,
  setAlwaysListening,
  setVoiceRuntime,
  setHeardText,
  setVoiceError,
  setVoiceAction,
  clearVoiceMessages,
  setVoiceDataset,
} = voiceAssistantSlice.actions;

export default voiceAssistantSlice.reducer;
