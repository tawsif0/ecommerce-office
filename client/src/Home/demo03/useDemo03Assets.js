import { useEffect } from "react";

export const DEMO03_SCOPE_CLASS = "demo03-scope";
export const DEMO03_THEME_CLASSES = [];

const useDemo03Assets = (enabled = true) => {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return undefined;

    document.body.classList.add(DEMO03_SCOPE_CLASS);
    return () => {
      document.body.classList.remove(DEMO03_SCOPE_CLASS);
    };
  }, [enabled]);
};

export default useDemo03Assets;
