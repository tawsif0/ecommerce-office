import { useEffect } from "react";

const DEMO03_STYLESHEETS = [
  {
    id: "demo03-font-inter",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&subset=latin,latin-ext&display=swap",
  },
  { id: "demo03-bootstrap", href: "/demo03-assets/css/bootstrap.min.css" },
  { id: "demo03-slick", href: "/demo03-assets/css/slick.css" },
  { id: "demo03-klb-social", href: "/demo03-assets/css/klbtheme-social.css" },
  { id: "demo03-klb-icons", href: "/demo03-assets/css/klbtheme.css" },
  { id: "demo03-magnific", href: "/demo03-assets/css/magnific-popup.css" },
  { id: "demo03-base", href: "/demo03-assets/css/base.css" },
  { id: "demo03-style", href: "/demo03-assets/css/style.css" },
];

// These classes affect layout/rounding in the Fynode theme CSS.
const DEMO03_BODY_CLASSES = [
  "home",
  "content-rounded",
  "theme-fynode",
  "wp-theme-fynode",
  "klb-bottom-menu",
  "klb-swatches",
];

export default function useDemo03Assets(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    if (typeof document === "undefined") return undefined;

    const addedLinks = [];
    DEMO03_STYLESHEETS.forEach(({ id, href }) => {
      if (!href) return;
      const existing = document.getElementById(id);
      if (existing) return;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.demo03 = "true";
      document.head.appendChild(link);
      addedLinks.push(link);
    });

    DEMO03_BODY_CLASSES.forEach((cls) => document.body.classList.add(cls));

    return () => {
      addedLinks.forEach((link) => link.parentNode?.removeChild(link));
      DEMO03_BODY_CLASSES.forEach((cls) => document.body.classList.remove(cls));
    };
  }, [enabled]);
}

