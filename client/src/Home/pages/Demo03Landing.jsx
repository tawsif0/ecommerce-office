import React, { useEffect, useRef } from "react";

/**
 * Temporary: pixel-perfect clone of https://demo03.arbeitonline.top/
 *
 * We render a static HTML snapshot from /public/demo03/index.html inside an
 * iframe to avoid CSS/JS collisions with the React app. The iframe is same-origin
 * (served from this app), so we can auto-resize to its content height.
 */
export default function Demo03Landing() {
  const iframeRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return undefined;

    let rafId = null;
    let resizeObserver = null;
    let pollTimer = null;

    const computeHeight = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;
        const height = Math.max(
          doc.body?.scrollHeight || 0,
          doc.documentElement?.scrollHeight || 0,
        );
        if (height > 0) {
          iframe.style.height = `${height}px`;
        }
      } catch {
        // ignore cross-origin or transient load errors
      }
    };

    const scheduleResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(computeHeight);
    };

    const handleLoad = () => {
      scheduleResize();

      // Track subsequent height changes (images, sliders, responsive breakpoints).
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;

        resizeObserver = new ResizeObserver(() => scheduleResize());
        resizeObserver.observe(doc.documentElement);

        // A short poll helps when third-party scripts mutate layout.
        pollTimer = window.setInterval(() => scheduleResize(), 750);
      } catch {
        // ignore
      }
    };

    iframe.addEventListener("load", handleLoad);
    window.addEventListener("resize", scheduleResize);

    return () => {
      iframe.removeEventListener("load", handleLoad);
      window.removeEventListener("resize", scheduleResize);
      if (rafId) cancelAnimationFrame(rafId);
      if (resizeObserver) resizeObserver.disconnect();
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, []);

  return (
    <div className="w-full">
      <iframe
        ref={iframeRef}
        title="Landing"
        src="/demo03/index.html"
        className="w-full border-0 block"
        style={{ height: "100vh" }}
        loading="eager"
      />
    </div>
  );
}

