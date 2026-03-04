import React, { useCallback, useEffect, useRef, useState } from "react";
import { FiMic, FiMicOff } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import { fetchPublicSettings } from "../utils/publicSettings";
import { normalizeMarketplaceMode, resolveUserRole } from "../utils/dashboardAccess";
import { executeVoiceCommand } from "../utils/voiceCommandRunner";
import {
  executeVoiceDomCommand,
  isLikelyDomCommand,
  splitVoiceCommandSegments,
} from "../utils/voiceDomActions";
import {
  setAlwaysListening,
  setHeardText,
  setVoiceAction,
  setVoiceDataset,
  setVoiceError,
  setVoiceRuntime,
} from "../store/voiceAssistantSlice";

const ERROR_MESSAGE_MAP = {
  "not-allowed": "Microphone permission denied. Allow microphone access in browser settings.",
  "service-not-allowed":
    "Microphone permission denied by browser or OS policy. Enable speech input access.",
  "audio-capture": "No microphone detected. Connect a microphone and try again.",
  "no-speech": "No speech detected. Speak clearly and try again.",
  network: "Speech service network issue. Check internet and try again.",
  aborted: "Voice listening stopped.",
  "bad-grammar": "Voice grammar could not be processed. Try another command.",
  "language-not-supported": "Selected language is not supported by this browser.",
};

const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

const resolveSpeechLang = (languageMode, turnIndexRef) => {
  if (languageMode === "bn-BD") return "bn-BD";
  if (languageMode === "en-US") return "en-US";
  const languages = ["en-US", "bn-BD"];
  const resolved = languages[turnIndexRef.current % languages.length];
  turnIndexRef.current += 1;
  return resolved;
};

const GlobalVoiceAssistant = () => {
  const baseUrl = import.meta.env.VITE_API_URL;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const role = resolveUserRole(user);
  const isAssistantVisible =
    role === "admin" && String(location.pathname || "").startsWith("/dashboard");

  const {
    languageMode,
    voiceOutputEnabled,
    alwaysListening,
    supported,
    isSecureContext,
    isListening,
    heardText,
    lastAction,
    lastError,
  } = useSelector((state) => state.voiceAssistant);

  const [marketplaceMode, setMarketplaceMode] = useState("multi");

  const recognitionRef = useRef(null);
  const restartTimerRef = useRef(null);
  const stopRequestedRef = useRef(false);
  const languageTurnRef = useRef(0);
  const commandQueueRef = useRef(Promise.resolve());
  const voiceDatasetRef = useRef(null);
  const alwaysListeningRef = useRef(alwaysListening);
  const previousAlwaysListeningRef = useRef(alwaysListening);

  useEffect(() => {
    alwaysListeningRef.current = alwaysListening;
  }, [alwaysListening]);

  const speakFeedback = useCallback(
    (message) => {
      if (!voiceOutputEnabled) return;
      if (typeof window === "undefined") return;
      if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== "function") {
        return;
      }

      try {
        const text = String(message || "").trim();
        if (!text) return;
        const utterance = new window.SpeechSynthesisUtterance(text);
        utterance.lang = languageMode === "bn-BD" ? "bn-BD" : "en-US";
        utterance.rate = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch {
        // ignore synthesis failures
      }
    },
    [languageMode, voiceOutputEnabled],
  );

  const setAction = useCallback(
    (message, { speak = false } = {}) => {
      const text = String(message || "").trim();
      dispatch(setVoiceAction(text || "Done"));
      if (speak && text) {
        speakFeedback(text);
      }
    },
    [dispatch, speakFeedback],
  );

  const openDashboardTab = useCallback(
    (tab) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("dashboardActiveTab", tab);
      }

      if (location.pathname.startsWith("/dashboard")) {
        window.dispatchEvent(new CustomEvent("voiceDashboardTabChange", { detail: { tab } }));
        return;
      }

      navigate("/dashboard");
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("voiceDashboardTabChange", { detail: { tab } }));
      }, 80);
    },
    [location.pathname, navigate],
  );

  const stopListening = useCallback(
    ({ silent = false } = {}) => {
      stopRequestedRef.current = true;

      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }

      recognitionRef.current = null;
      dispatch(setVoiceRuntime({ isListening: false }));

      if (!silent) {
        dispatch(setVoiceError(""));
        dispatch(setVoiceAction("Voice listening stopped"));
      }
    },
    [dispatch],
  );

  const runCommandSequence = useCallback(
    async (rawText) => {
      if (!isAssistantVisible) {
        dispatch(setVoiceError("Voice assistant is available for admin dashboard only."));
        return { handled: false };
      }

      const segments = splitVoiceCommandSegments(rawText);
      if (segments.length === 0) return { handled: false };

      let handledAny = false;

      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        dispatch(setHeardText(segment));

        const navResult = executeVoiceCommand({
          rawText: segment,
          user,
          marketplaceMode,
          navigateToPath: (path) => navigate(path),
          openDashboardTab,
          setAction,
          logout,
          voiceDataset: voiceDatasetRef.current,
        });

        if (navResult?.handled) {
          handledAny = true;
        }

        if (navResult?.stopListening) {
          if (alwaysListeningRef.current) {
            dispatch(setAlwaysListening(false));
          }
          stopListening({ silent: true });
          return { handled: true, stopListening: true };
        }

        if (navResult?.navigated) {
          await new Promise((resolve) => {
            window.setTimeout(resolve, 1000);
          });
        }

        const shouldTryDom = isLikelyDomCommand(segment) || !navResult?.handled;
        if (shouldTryDom) {
          const maxAttempts = isLikelyDomCommand(segment) ? 5 : 1;
          let domHandled = false;

          for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const domResult = executeVoiceDomCommand({
              rawText: segment,
              setAction,
              voiceDataset: voiceDatasetRef.current,
            });

            if (domResult?.handled) {
              handledAny = true;
              domHandled = true;
              break;
            }

            if (attempt < maxAttempts - 1) {
              await new Promise((resolve) => {
                window.setTimeout(resolve, 320);
              });
            }
          }

          if (!domHandled && !navResult?.handled && index === segments.length - 1) {
            setAction("Command not mapped. Try again with a shorter clear command.");
          }
        }
      }

      window.setTimeout(() => {
        dispatch(setHeardText(""));
      }, 700);

      return { handled: handledAny };
    },
    [
      dispatch,
      isAssistantVisible,
      logout,
      marketplaceMode,
      navigate,
      openDashboardTab,
      setAction,
      stopListening,
      user,
    ],
  );

  const enqueueCommand = useCallback(
    (rawText) => {
      commandQueueRef.current = commandQueueRef.current
        .catch(() => null)
        .then(() => runCommandSequence(rawText))
        .catch(() => {
          dispatch(setVoiceError("Voice command execution failed. Please try again."));
        });
    },
    [dispatch, runCommandSequence],
  );

  const startListening = useCallback(() => {
    if (!isAssistantVisible) {
      dispatch(setVoiceError("Voice assistant is available for admin dashboard only."));
      return;
    }

    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) {
      dispatch(setVoiceRuntime({ supported: false, isListening: false }));
      dispatch(setVoiceError("Voice recognition is unavailable in this browser."));
      return;
    }

    if (!isSecureContext) {
      dispatch(setVoiceError("Voice input requires secure context (HTTPS) or localhost."));
      return;
    }

    stopRequestedRef.current = false;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    dispatch(setVoiceError(""));
    dispatch(setHeardText(""));
    dispatch(setVoiceAction("Listening..."));

    const recognition = new SpeechRecognitionClass();
    const recognitionLang = resolveSpeechLang(languageMode, languageTurnRef);

    recognition.lang = recognitionLang;
    recognition.continuous = alwaysListeningRef.current;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      dispatch(setVoiceError(""));

      const transcript = Array.from(event.results || [])
        .slice(event.resultIndex || 0)
        .map((result) => String(result?.[0]?.transcript || ""))
        .join(" ")
        .trim();

      if (!transcript) return;

      dispatch(setHeardText(transcript));
      enqueueCommand(transcript);
    };

    recognition.onerror = (event) => {
      dispatch(setVoiceRuntime({ isListening: false }));
      const errorCode = String(event?.error || "").toLowerCase();
      let message = ERROR_MESSAGE_MAP[errorCode] || "Voice input failed. Please try again.";

      if (errorCode === "network") {
        const online = typeof navigator === "undefined" ? true : navigator.onLine !== false;
        dispatch(setVoiceRuntime({ isOnline: online }));

        if (!online) {
          message = "Your device is offline. Connect internet and retry voice input.";
        } else {
          message =
            "Speech service network is blocked/unreachable. Disable VPN/proxy/ad-block and retry.";
        }
      }

      dispatch(setVoiceError(message));
      dispatch(setVoiceAction(message));

      if (errorCode === "not-allowed" || errorCode === "service-not-allowed") {
        dispatch(setAlwaysListening(false));
        stopRequestedRef.current = true;
      }
    };

    recognition.onend = () => {
      dispatch(setVoiceRuntime({ isListening: false }));
      recognitionRef.current = null;

      if (!alwaysListeningRef.current || stopRequestedRef.current) {
        return;
      }

      restartTimerRef.current = window.setTimeout(() => {
        startListening();
      }, 450);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      dispatch(setVoiceRuntime({ isListening: true }));
      dispatch(setVoiceAction(`Listening in ${recognitionLang === "bn-BD" ? "Bangla" : "English"}`));
    } catch (error) {
      dispatch(setVoiceRuntime({ isListening: false }));
      const message = String(error?.message || "").toLowerCase().includes("already started")
        ? "Voice listening is already active."
        : "Microphone could not start. Check permission and try again.";
      dispatch(setVoiceError(message));
      dispatch(setVoiceAction(message));
    }
  }, [dispatch, enqueueCommand, isAssistantVisible, isSecureContext, languageMode]);

  useEffect(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    dispatch(
      setVoiceRuntime({
        supported: Boolean(SpeechRecognitionClass),
        isSecureContext:
          typeof window === "undefined"
            ? true
            : Boolean(window.isSecureContext || window.location?.hostname === "localhost"),
        isOnline: typeof navigator === "undefined" ? true : navigator.onLine !== false,
      }),
    );
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleOnline = () => dispatch(setVoiceRuntime({ isOnline: true }));
    const handleOffline = () => dispatch(setVoiceRuntime({ isOnline: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [dispatch]);

  useEffect(() => {
    let mounted = true;

    const checkPermission = async () => {
      if (typeof navigator === "undefined" || !navigator.permissions?.query) {
        dispatch(setVoiceRuntime({ permissionState: "unsupported" }));
        return;
      }

      try {
        const status = await navigator.permissions.query({ name: "microphone" });
        if (!mounted) return;

        dispatch(setVoiceRuntime({ permissionState: String(status.state || "unknown") }));
        status.onchange = () => {
          if (!mounted) return;
          dispatch(setVoiceRuntime({ permissionState: String(status.state || "unknown") }));
        };
      } catch {
        if (mounted) {
          dispatch(setVoiceRuntime({ permissionState: "unsupported" }));
        }
      }
    };

    checkPermission();
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;

    const syncMarketplaceMode = async (force = false) => {
      const settings = await fetchPublicSettings({ force });
      if (!cancelled) {
        setMarketplaceMode(normalizeMarketplaceMode(settings?.marketplaceMode));
      }
    };

    syncMarketplaceMode(false);
    const handleSettingsUpdated = () => syncMarketplaceMode(true);
    window.addEventListener("publicSettingsUpdated", handleSettingsUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("publicSettingsUpdated", handleSettingsUpdated);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadVoiceDataset = async (force = false) => {
      if (!isAssistantVisible) return;
      const token = window.localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await axios.get(`${baseUrl}/auth/admin/voice-dataset`, {
          headers: { Authorization: `Bearer ${token}` },
          params: force ? { force: 1 } : undefined,
          timeout: 12000,
        });

        if (cancelled) return;
        const dataset = response?.data?.dataset || null;
        voiceDatasetRef.current = dataset;
        dispatch(setVoiceDataset(dataset));
      } catch {
        if (cancelled) return;
        voiceDatasetRef.current = null;
        dispatch(setVoiceDataset(null));
      }
    };

    loadVoiceDataset(false);

    const refresh = () => loadVoiceDataset(true);
    window.addEventListener("publicSettingsUpdated", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("publicSettingsUpdated", refresh);
    };
  }, [baseUrl, dispatch, isAssistantVisible]);

  useEffect(() => {
    const handleControl = (event) => {
      if (!isAssistantVisible) return;

      const type = String(event?.detail?.type || "").trim().toLowerCase();
      if (!type) return;

      if (type === "start") {
        startListening();
        return;
      }

      if (type === "stop") {
        stopListening();
        return;
      }

      if (type === "run") {
        const command = String(event?.detail?.command || "").trim();
        if (!command) return;
        dispatch(setHeardText(command));
        dispatch(setVoiceError(""));
        enqueueCommand(command);
      }
    };

    window.addEventListener("voiceAssistantControl", handleControl);
    return () => {
      window.removeEventListener("voiceAssistantControl", handleControl);
    };
  }, [dispatch, enqueueCommand, isAssistantVisible, startListening, stopListening]);

  useEffect(() => {
    if (!isAssistantVisible) {
      if (isListening) {
        stopListening({ silent: true });
      }
      if (alwaysListeningRef.current) {
        dispatch(setAlwaysListening(false));
      }
      voiceDatasetRef.current = null;
      dispatch(setVoiceDataset(null));
      return;
    }

    const wasAlwaysListening = previousAlwaysListeningRef.current;
    previousAlwaysListeningRef.current = alwaysListening;

    if (alwaysListening && !wasAlwaysListening && !isListening) {
      startListening();
      return;
    }

    if (!alwaysListening && wasAlwaysListening && isListening) {
      stopListening({ silent: true });
    }
  }, [alwaysListening, dispatch, isAssistantVisible, isListening, startListening, stopListening]);

  useEffect(
    () => () => {
      stopListening({ silent: true });
    },
    [stopListening],
  );

  const toggleListening = () => {
    if (!supported) {
      dispatch(setVoiceError("Voice recognition is not supported in this browser."));
      return;
    }

    if (isListening) {
      if (alwaysListening) {
        dispatch(setAlwaysListening(false));
      }
      stopListening();
      return;
    }

    startListening();
  };

  const indicatorClass = isListening
    ? "bg-emerald-500 text-white ring-4 ring-emerald-200 animate-pulse"
    : "bg-black text-white";

  if (!isAssistantVisible) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 md:right-6 md:bottom-6 z-[90] flex flex-col items-end gap-2 pointer-events-none">
      <div className="pointer-events-auto rounded-lg border border-gray-200 bg-white/95 backdrop-blur-sm px-3 py-2 shadow-lg min-w-[170px]">
        <p className="text-[11px] font-semibold text-gray-800">
          {isListening ? "Listening now" : alwaysListening ? "Always listen on" : "Voice ready"}
        </p>
        <p className="text-[11px] text-gray-600 truncate">
          {heardText || lastError || lastAction || "Tap mic and speak"}
        </p>
      </div>

      <button
        type="button"
        onClick={toggleListening}
        title={isListening ? "Stop voice listening" : "Start voice listening"}
        className={`pointer-events-auto h-14 w-14 rounded-full shadow-xl border border-black/10 inline-flex items-center justify-center transition-transform hover:scale-105 ${indicatorClass}`}
      >
        {isListening ? <FiMicOff className="h-6 w-6" /> : <FiMic className="h-6 w-6" />}
      </button>
    </div>
  );
};

export default GlobalVoiceAssistant;
