import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiMic, FiMicOff, FiCommand, FiVolume2 } from "react-icons/fi";

const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

const normalizeCommand = (value) => String(value || "").trim().toLowerCase();

const ModuleVoiceAssistant = ({ user, onTabChange }) => {
  const [supported, setSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [heardText, setHeardText] = useState("");
  const [lastAction, setLastAction] = useState("No command detected yet");
  const recognitionRef = useRef(null);

  const role = String(user?.userType || "user").toLowerCase();

  const commandHints = useMemo(() => {
    const common = [
      "open support tickets",
      "open landing pages",
      "open purchases",
      "open suppliers",
      "open accounts",
      "open brands",
      "open reports",
      "open dashboard",
    ];

    if (role === "admin") {
      return [
        ...common,
        "open vendor payouts",
        "open orders",
        "open products",
        "show high risk customers",
      ];
    }

    if (role === "vendor" || role === "staff") {
      return [...common, "open vendor orders", "open products"];
    }

    return ["open dashboard", "open support tickets", "open my orders"];
  }, [role]);

  const runCommand = (rawText) => {
    const text = normalizeCommand(rawText);
    if (!text) return false;

    const go = (tab, label) => {
      if (typeof onTabChange === "function") {
        onTabChange(tab);
      }
      setLastAction(label);
      return true;
    };

    if (text.includes("dashboard")) return go("dashboard", "Opened dashboard");

    if (text.includes("support") || text.includes("ticket")) {
      return go("module-support", "Opened support tickets");
    }

    if (text.includes("landing")) return go("module-landing-pages", "Opened landing pages");
    if (text.includes("supplier")) return go("module-suppliers", "Opened suppliers");
    if (text.includes("purchase")) return go("module-purchases", "Opened purchases");
    if (text.includes("brand")) return go("module-brands", "Opened brands");
    if (text.includes("report")) return go("module-business-reports", "Opened business reports");
    if (text.includes("account") || text.includes("profit")) {
      return go("module-accounts", "Opened accounts");
    }
    if ((text.includes("payout") || text.includes("pay out")) && role === "admin") {
      return go("module-vendor-payouts", "Opened vendor payouts");
    }

    if (text.includes("product")) {
      if (text.includes("create") || text.includes("add")) {
        return go("create-product", "Opened create product");
      }
      return go("modify-product", "Opened product list");
    }

    if (text.includes("order")) {
      if (role === "admin") return go("order-list", "Opened order list");
      if (role === "vendor" || role === "staff") return go("vendor-orders", "Opened vendor orders");
      return go("my-orders", "Opened my orders");
    }

    if (text.includes("high risk") || text.includes("risky") || text.includes("blacklist")) {
      if (role === "admin") {
        return go("customer-risk", "Opened customer risk");
      }
      setLastAction("High-risk customers are available for admin only");
      return true;
    }

    setLastAction("Command not mapped. Try one of the suggested commands.");
    return false;
  };

  useEffect(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) {
      setSupported(false);
      return;
    }

    setSupported(true);
    const recognition = new SpeechRecognitionClass();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results || [])
        .map((result) => String(result?.[0]?.transcript || ""))
        .join(" ")
        .trim();

      setHeardText(transcript);
      runCommand(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setLastAction("Voice input failed. Please try again.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognitionRef.current = null;
      try {
        recognition.stop();
      } catch (_error) {
        // ignore cleanup errors
      }
    };
  }, [role]);

  const startListening = () => {
    if (!supported || !recognitionRef.current) return;

    setHeardText("");
    setLastAction("Listening...");
    setIsListening(true);

    try {
      recognitionRef.current.start();
    } catch (_error) {
      setIsListening(false);
      setLastAction("Microphone permission denied or unavailable");
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (_error) {
      // ignore
    }
    setIsListening(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mb-4">
          <FiCommand className="w-6 h-6" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Voice Assistant</h1>
        <p className="text-zinc-200 mt-2">
          Use voice commands to navigate dashboard modules quickly.
        </p>
      </div>

      {!supported ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-gray-700">
            Voice recognition is not supported in this browser. Use Chrome/Edge for Web Speech API support.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            {!isListening ? (
              <button
                type="button"
                onClick={startListening}
                className="inline-flex h-11 items-center gap-2 px-5 bg-black text-white rounded-lg font-medium"
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

            <span className={`inline-flex items-center gap-2 text-sm ${isListening ? "text-emerald-600" : "text-gray-600"}`}>
              <FiVolume2 className="w-4 h-4" />
              {isListening ? "Listening now" : "Idle"}
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

          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-black mb-2">Try Commands</p>
            <div className="flex flex-wrap gap-2">
              {commandHints.map((hint) => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => {
                    setHeardText(hint);
                    runCommand(hint);
                  }}
                  className="text-xs border border-gray-300 rounded-full px-3 py-1.5 hover:bg-gray-100"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleVoiceAssistant;
