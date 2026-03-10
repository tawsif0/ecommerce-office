import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const BREAKPOINT_TABLET = 768;
const BREAKPOINT_DESKTOP = 1024;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getViewport = () => {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth || 0;
  if (width >= BREAKPOINT_DESKTOP) return "desktop";
  if (width >= BREAKPOINT_TABLET) return "tablet";
  return "mobile";
};

function useViewportBucket() {
  const [bucket, setBucket] = useState(() => getViewport());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let raf = null;

    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setBucket(getViewport()));
    };

    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return bucket;
}

export default function Demo03Carousel({
  items,
  renderItem,
  className = "",
  style,
  gapClass = "",
  itemsDesktop = 1,
  itemsTablet = 1,
  itemsMobile = 1,
  arrows = true,
  dotsDesktop = false,
  dotsTablet = false,
  dotsMobile = false,
  autoplay = false,
  autoplayMs = 5000,
  loop = false,
}) {
  const viewport = useViewportBucket();
  const itemsToShow = useMemo(() => {
    if (viewport === "desktop") return Math.max(1, Number(itemsDesktop) || 1);
    if (viewport === "tablet") return Math.max(1, Number(itemsTablet) || 1);
    return Math.max(1, Number(itemsMobile) || 1);
  }, [itemsDesktop, itemsMobile, itemsTablet, viewport]);

  const showDots = useMemo(() => {
    if (viewport === "desktop") return Boolean(dotsDesktop);
    if (viewport === "tablet") return Boolean(dotsTablet);
    return Boolean(dotsMobile);
  }, [dotsDesktop, dotsMobile, dotsTablet, viewport]);

  const slideCount = Array.isArray(items) ? items.length : 0;
  const maxIndex = Math.max(0, slideCount - itemsToShow);

  const [index, setIndex] = useState(0);
  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    // Keep the index valid on viewport changes / item changes.
    setIndex((current) => clamp(current, 0, maxIndex));
  }, [maxIndex]);

  const goPrev = useCallback(() => {
    setIndex((current) => {
      if (loop && slideCount > itemsToShow) return current <= 0 ? maxIndex : current - 1;
      return clamp(current - 1, 0, maxIndex);
    });
  }, [loop, maxIndex, slideCount, itemsToShow]);

  const goNext = useCallback(() => {
    setIndex((current) => {
      if (loop && slideCount > itemsToShow) return current >= maxIndex ? 0 : current + 1;
      return clamp(current + 1, 0, maxIndex);
    });
  }, [loop, maxIndex, slideCount, itemsToShow]);

  useEffect(() => {
    if (!autoplay) return undefined;
    if (slideCount <= itemsToShow) return undefined;

    const timer = window.setInterval(() => {
      goNext();
    }, Math.max(900, Number(autoplayMs) || 0));

    return () => window.clearInterval(timer);
  }, [autoplay, autoplayMs, goNext, loop, maxIndex, slideCount, itemsToShow]);

  const trackTransform = useMemo(() => {
    const step = 100 / itemsToShow;
    return `translate3d(-${index * step}%, 0, 0)`;
  }, [index, itemsToShow]);

  const slideBasis = useMemo(() => `${100 / itemsToShow}%`, [itemsToShow]);

  const dotCount = useMemo(() => {
    if (!showDots) return 0;
    if (slideCount <= itemsToShow) return 0;
    return maxIndex + 1;
  }, [maxIndex, showDots, slideCount, itemsToShow]);

  const dots = useMemo(() => {
    if (dotCount <= 0) return [];
    return Array.from({ length: dotCount }, (_, i) => i);
  }, [dotCount]);

  const rootClassName = useMemo(() => {
    return [
      "site-slider",
      "slick-slider",
      "loader-default",
      "slick-initialized",
      gapClass,
      className,
    ]
      .filter(Boolean)
      .join(" ");
  }, [className, gapClass]);

  const trackStyle = useMemo(
    () => ({
      width: `${(slideCount * 100) / itemsToShow}%`,
      transform: trackTransform,
      transition: "transform 600ms cubic-bezier(0.42, 0, 0.58, 1)",
    }),
    [itemsToShow, slideCount, trackTransform],
  );

  const canNavigate = slideCount > itemsToShow;
  const disablePrev = !loop && index <= 0;
  const disableNext = !loop && index >= maxIndex;

  return (
    <div className={rootClassName} style={style}>
      {arrows && canNavigate && (
        <>
          <button
            type="button"
            className={`slick-nav slick-prev${disablePrev ? " slick-disabled" : ""}`}
            onClick={goPrev}
            aria-label="Previous"
            disabled={disablePrev}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
              <path
                d="M15 18l-6-6 6-6"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
          <button
            type="button"
            className={`slick-nav slick-next${disableNext ? " slick-disabled" : ""}`}
            onClick={goNext}
            aria-label="Next"
            disabled={disableNext}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
              <path
                d="M9 6l6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
        </>
      )}

      <div className="slick-list" style={{ overflow: "hidden" }}>
        <div className="slick-track" style={trackStyle}>
          {(items || []).map((item, itemIndex) => (
            <div
              key={item?.id || item?.key || itemIndex}
              className="site-slider-item slick-slide"
              style={{ flex: `0 0 ${slideBasis}`, maxWidth: slideBasis }}
            >
              {renderItem(item, itemIndex)}
            </div>
          ))}
        </div>
      </div>

      {showDots && dots.length > 0 && (
        <ul className="slick-dots">
          {dots.map((dotIndex) => (
            <li key={dotIndex} className={dotIndex === index ? "slick-active" : ""}>
              <button
                type="button"
                onClick={() => setIndex(dotIndex)}
                aria-label={`Go to slide ${dotIndex + 1}`}
              >
                {dotIndex + 1}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
