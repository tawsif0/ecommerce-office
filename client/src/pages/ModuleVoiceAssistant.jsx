import React, { useMemo, useState } from "react";
import { FiCommand, FiMic, FiMicOff, FiVolume2, FiZap } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import {
  setAlwaysListening,
  setHeardText,
  setLanguageMode,
  setVoiceError,
  setVoiceOutputEnabled,
} from "../store/voiceAssistantSlice";
import { getVoiceCommandHints } from "../utils/voiceCommandRunner";

const LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto (English + Bangla)" },
  { value: "en-US", label: "English (US)" },
  { value: "bn-BD", label: "Bengali (Bangladesh)" },
];

const dispatchVoiceControl = (detail) => {
  window.dispatchEvent(new CustomEvent("voiceAssistantControl", { detail }));
};

const ModuleVoiceAssistant = ({ user }) => {
  const dispatch = useDispatch();
  const [manualCommand, setManualCommand] = useState("");

  const {
    languageMode,
    voiceOutputEnabled,
    alwaysListening,
    supported,
    isSecureContext,
    isOnline,
    permissionState,
    isListening,
    heardText,
    lastError,
    lastAction,
    voiceDataset,
    voiceDatasetUpdatedAt,
  } = useSelector((state) => state.voiceAssistant);

  const role = String(user?.userType || "user").toLowerCase();
  const commandHints = useMemo(() => getVoiceCommandHints(role), [role]);

  const startListening = () => {
    dispatch(setVoiceError(""));
    dispatchVoiceControl({ type: "start" });
  };

  const stopListening = () => {
    if (alwaysListening) {
      dispatch(setAlwaysListening(false));
    }
    dispatchVoiceControl({ type: "stop" });
  };

  const runManualCommand = () => {
    const value = String(manualCommand || "").trim();
    if (!value) {
      dispatch(setVoiceError("Type a command first."));
      return;
    }
    dispatch(setHeardText(value));
    dispatch(setVoiceError(""));
    dispatchVoiceControl({ type: "run", command: value });
  };

  const toggleAlwaysListen = (enabled) => {
    if (enabled && !supported) {
      dispatch(setAlwaysListening(false));
      dispatch(setVoiceError("Voice recognition is not supported in this browser."));
      return;
    }

    if (enabled && !isSecureContext) {
      dispatch(setAlwaysListening(false));
      dispatch(setVoiceError("Voice input requires secure context (HTTPS) or localhost."));
      return;
    }

    dispatch(setAlwaysListening(enabled));
    dispatch(setVoiceError(""));

    if (!enabled) {
      dispatchVoiceControl({ type: "stop" });
      return;
    }

    dispatchVoiceControl({ type: "start" });
  };

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mb-4">
          <FiCommand className="w-6 h-6" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Voice Assistant</h1>
        <p className="text-zinc-200 mt-2">
          Global voice control is active from all pages. Use Auto mode for Bangla + English.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm text-gray-700">
            Recognition Language
            <select
              value={languageMode}
              onChange={(event) => dispatch(setLanguageMode(event.target.value))}
              className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white"
              disabled={isListening}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-700 mt-6">
            <input
              type="checkbox"
              checked={voiceOutputEnabled}
              onChange={(event) => dispatch(setVoiceOutputEnabled(event.target.checked))}
            />
            Voice feedback output
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-700 mt-6">
            <input
              type="checkbox"
              checked={alwaysListening}
              onChange={(event) => toggleAlwaysListen(event.target.checked)}
              disabled={!supported || !isSecureContext}
            />
            Always Listen (global)
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
            <p className="text-xs uppercase tracking-wide text-gray-500">Microphone Permission</p>
            <p className="text-sm font-medium text-black mt-1 capitalize">{permissionState}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
            <p className="text-xs uppercase tracking-wide text-gray-500">Network</p>
            <p className="text-sm font-medium text-black mt-1">{isOnline ? "Online" : "Offline"}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
            <p className="text-xs uppercase tracking-wide text-gray-500">Secure Context</p>
            <p className="text-sm font-medium text-black mt-1">
              {isSecureContext ? "Yes" : "No (Use HTTPS/localhost)"}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
            <p className="text-xs uppercase tracking-wide text-gray-500">Recognition API</p>
            <p className="text-sm font-medium text-black mt-1">{supported ? "Available" : "Not available"}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
            <p className="text-xs uppercase tracking-wide text-gray-500">Backend Voice Dataset</p>
            <p className="text-sm font-medium text-black mt-1">
              {Array.isArray(voiceDataset?.resources)
                ? `${voiceDataset.resources.length} resources`
                : "Not loaded"}
            </p>
            {voiceDatasetUpdatedAt ? (
              <p className="text-[11px] text-gray-500 mt-1">Updated {voiceDatasetUpdatedAt}</p>
            ) : null}
          </div>
        </div>

        {!supported ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Voice recognition is not supported in this browser. Use Chrome or Edge.
          </div>
        ) : !isSecureContext ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Voice input requires HTTPS or localhost.
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {!isListening ? (
            <button
              type="button"
              onClick={startListening}
              disabled={!supported || !isSecureContext}
              className="inline-flex h-11 items-center gap-2 px-5 bg-black text-white rounded-lg font-medium disabled:opacity-50"
            >
              <FiMic className="w-4 h-4" />
              Start Listening
            </button>
          ) : (
            <button
              type="button"
              onClick={stopListening}
              className="inline-flex h-11 items-center gap-2 px-5 border border-gray-300 rounded-lg font-medium"
            >
              <FiMicOff className="w-4 h-4" />
              Stop Listening
            </button>
          )}

          <span
            className={`inline-flex items-center gap-2 text-sm ${
              isListening ? "text-emerald-600" : "text-gray-600"
            }`}
          >
            <FiVolume2 className="w-4 h-4" />
            {isListening ? "Listening now" : "Idle"}
          </span>

          <span
            className={`inline-flex items-center gap-2 text-sm ${
              alwaysListening ? "text-emerald-700" : "text-gray-600"
            }`}
          >
            <FiZap className="w-4 h-4" />
            {alwaysListening ? "Always listen enabled" : "Always listen disabled"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
            <p className="text-xs uppercase tracking-wide text-gray-500">Heard Text</p>
            <p className="text-sm text-black mt-2 min-h-6">{heardText || "-"}</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
            <p className="text-xs uppercase tracking-wide text-gray-500">Last Action</p>
            <p className="text-sm text-black mt-2 min-h-6">{lastAction}</p>
          </div>
        </div>

        {lastError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {lastError}
          </div>
        ) : null}

        <div className="rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-black">Manual Command (Fallback)</p>
          <div className="flex flex-col md:flex-row gap-2">
            <input
              value={manualCommand}
              onChange={(event) => setManualCommand(event.target.value)}
              placeholder="Type command like: open dashboard / ড্যাশবোর্ড খুলুন"
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <button
              type="button"
              onClick={runManualCommand}
              className="inline-flex h-11 items-center justify-center px-5 bg-black text-white rounded-lg font-medium"
            >
              Run Command
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-black mb-2">Try Commands</p>
          <div className="flex flex-wrap gap-2">
            {commandHints.map((hint) => (
              <button
                key={hint}
                type="button"
                onClick={() => {
                  setManualCommand(hint);
                  dispatch(setHeardText(hint));
                  dispatch(setVoiceError(""));
                  dispatchVoiceControl({ type: "run", command: hint });
                }}
                className="text-xs border border-gray-300 rounded-full px-3 py-1.5 hover:bg-gray-100"
              >
                {hint}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleVoiceAssistant;
