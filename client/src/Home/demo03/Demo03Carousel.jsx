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
  scrollPerPage = false,
  arrows = true,
  dotsDesktop = false,
  dotsTablet = false,
  dotsMobile = false,
  autoplay = false,
  autoplayMs = 5000,
  autoplayDirection = "next",
  autoplayContinuous = false,
  loop = false,
  arrowPlacement = "default",
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
  const shouldContinuousAutoplay =
    Boolean(autoplay) &&
    Boolean(autoplayContinuous) &&
    Boolean(loop) &&
    slideCount > itemsToShow;
  const isReversed = autoplayDirection === "prev";
  const shouldLoopWithClones = Boolean(loop) && slideCount > itemsToShow && !shouldContinuousAutoplay;
  const cloneCount = shouldLoopWithClones ? itemsToShow : 0;

  const [index, setIndex] = useState(0);
  const indexRef = useRef(index);
  indexRef.current = index;

  const [position, setPosition] = useState(() => cloneCount);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const transitionResetRafRef = useRef(null);

  const scrollBy = useMemo(() => {
    const base = scrollPerPage ? itemsToShow : 1;
    if (slideCount <= itemsToShow) return 1;
    return clamp(base, 1, Math.max(1, maxIndex));
  }, [itemsToShow, maxIndex, scrollPerPage, slideCount]);

  const pageStarts = useMemo(() => {
    if (scrollBy <= 1) return [];
    const starts = [];
    for (let i = 0; i <= maxIndex; i += scrollBy) starts.push(i);
    if (starts.length === 0) return [0];
    if (starts[starts.length - 1] !== maxIndex) starts.push(maxIndex);
    return starts;
  }, [maxIndex, scrollBy]);

  const trackRef = useRef(null);
  const continuousOffsetRef = useRef(0);
  const continuousRafRef = useRef(null);
  const continuousLastTickRef = useRef(null);

  const scheduleTransitionReenable = useCallback(() => {
    if (typeof window === "undefined") return;
    if (transitionResetRafRef.current) cancelAnimationFrame(transitionResetRafRef.current);
    transitionResetRafRef.current = requestAnimationFrame(() => {
      transitionResetRafRef.current = requestAnimationFrame(() => {
        transitionResetRafRef.current = null;
        setTransitionEnabled(true);
      });
    });
  }, []);

  useEffect(() => {
    return () => {
      if (transitionResetRafRef.current) cancelAnimationFrame(transitionResetRafRef.current);
    };
  }, []);

  useEffect(() => {
    if (!shouldLoopWithClones) return undefined;
    if (typeof window === "undefined") return undefined;

    setTransitionEnabled(false);
    setPosition(cloneCount);
    const raf = requestAnimationFrame(() => setTransitionEnabled(true));
    return () => cancelAnimationFrame(raf);
  }, [cloneCount, shouldLoopWithClones]);

  useEffect(() => {
    // Keep the index valid on viewport changes / item changes.
    setIndex((current) => clamp(current, 0, maxIndex));
  }, [maxIndex]);

  const goPrev = useCallback(() => {
    setIndex((current) => {
      if (scrollBy <= 1) {
        if (loop && slideCount > itemsToShow) return current <= 0 ? maxIndex : current - 1;
        return clamp(current - 1, 0, maxIndex);
      }

      const bounded = clamp(current, 0, maxIndex);
      let currentStart = 0;
      for (let i = 0; i < pageStarts.length; i += 1) {
        if (pageStarts[i] <= bounded) currentStart = pageStarts[i];
        else break;
      }

      const pos = pageStarts.indexOf(currentStart);
      if (pos <= 0) return loop && slideCount > itemsToShow ? maxIndex : 0;
      return pageStarts[pos - 1];
    });
  }, [itemsToShow, loop, maxIndex, pageStarts, scrollBy, slideCount]);

  const goNext = useCallback(() => {
    setIndex((current) => {
      if (scrollBy <= 1) {
        if (loop && slideCount > itemsToShow) return current >= maxIndex ? 0 : current + 1;
        return clamp(current + 1, 0, maxIndex);
      }

      const bounded = clamp(current, 0, maxIndex);
      let currentStart = 0;
      for (let i = 0; i < pageStarts.length; i += 1) {
        if (pageStarts[i] <= bounded) currentStart = pageStarts[i];
        else break;
      }

      const pos = pageStarts.indexOf(currentStart);
      if (pos < 0) return bounded;
      if (pos >= pageStarts.length - 1) return loop && slideCount > itemsToShow ? 0 : maxIndex;
      return pageStarts[pos + 1];
    });
  }, [itemsToShow, loop, maxIndex, pageStarts, scrollBy, slideCount]);

  const moveLoopBy = useCallback(
    (direction) => {
      setTransitionEnabled(true);
      setPosition((current) => {
        if (scrollBy <= 1) return current + (direction === "next" ? 1 : -1);

        const logicalStart = current - cloneCount;
        const bounded = clamp(logicalStart, 0, maxIndex);

        let currentStart = 0;
        for (let i = 0; i < pageStarts.length; i += 1) {
          if (pageStarts[i] <= bounded) currentStart = pageStarts[i];
          else break;
        }

        const pos = pageStarts.indexOf(currentStart);
        if (direction === "next") {
          if (pos >= pageStarts.length - 1) return current + scrollBy;
          return current + (pageStarts[pos + 1] - currentStart);
        }

        if (pos <= 0) return current - scrollBy;
        return current + (pageStarts[pos - 1] - currentStart);
      });
    },
    [cloneCount, maxIndex, pageStarts, scrollBy],
  );

  useEffect(() => {
    if (!shouldContinuousAutoplay) return undefined;
    if (!trackRef.current) return undefined;

    continuousOffsetRef.current = clamp(
      Number(indexRef.current || 0),
      0,
      Math.max(0, slideCount - 1),
    );
    continuousLastTickRef.current = null;

    const step = 100 / itemsToShow;
    const speedMs = Math.max(900, Number(autoplayMs) || 0);
    const directionMultiplier = autoplayDirection === "prev" ? -1 : 1;

    trackRef.current.style.transition = "none";
    trackRef.current.style.transform = `translate3d(-${continuousOffsetRef.current * step}%, 0, 0)`;

    const tick = (now) => {
      if (!trackRef.current) return;
      if (continuousLastTickRef.current == null) {
        continuousLastTickRef.current = now;
      }

      const deltaMs = Math.max(0, now - continuousLastTickRef.current);
      continuousLastTickRef.current = now;

      const deltaSlides = (deltaMs / speedMs) * directionMultiplier;
      let nextOffset = continuousOffsetRef.current + deltaSlides;

      if (slideCount > 0) {
        nextOffset = ((nextOffset % slideCount) + slideCount) % slideCount;
      }

      continuousOffsetRef.current = nextOffset;
      trackRef.current.style.transform = `translate3d(-${nextOffset * step}%, 0, 0)`;
      continuousRafRef.current = requestAnimationFrame(tick);
    };

    continuousRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (continuousRafRef.current) cancelAnimationFrame(continuousRafRef.current);
      continuousRafRef.current = null;
      continuousLastTickRef.current = null;
    };
  }, [autoplayDirection, autoplayMs, itemsToShow, shouldContinuousAutoplay, slideCount]);

  useEffect(() => {
    if (!autoplay) return undefined;
    if (autoplayContinuous) return undefined;
    if (slideCount <= itemsToShow) return undefined;

    const timer = window.setInterval(() => {
      if (shouldLoopWithClones) {
        moveLoopBy(isReversed ? "prev" : "next");
        return;
      }

      const advance = isReversed ? goPrev : goNext;
      advance();
    }, Math.max(900, Number(autoplayMs) || 0));

    return () => window.clearInterval(timer);
  }, [
    autoplay,
    autoplayContinuous,
    autoplayMs,
    goNext,
    goPrev,
    isReversed,
    itemsToShow,
    moveLoopBy,
    scrollBy,
    shouldLoopWithClones,
    slideCount,
  ]);

  const trackTransform = useMemo(() => {
    const step = 100 / itemsToShow;
    const activeIndex = shouldLoopWithClones ? position : index;
    return `translate3d(-${activeIndex * step}%, 0, 0)`;
  }, [index, itemsToShow, position, shouldLoopWithClones]);

  const activeSlideIndex = useMemo(() => {
    if (slideCount <= 0) return 0;
    if (!shouldLoopWithClones) return clamp(index, 0, maxIndex);

    const rawIndex = position - cloneCount;
    const normalizedIndex = ((rawIndex % slideCount) + slideCount) % slideCount;
    return clamp(normalizedIndex, 0, maxIndex);
  }, [cloneCount, index, maxIndex, position, shouldLoopWithClones, slideCount]);

  const slideBasis = useMemo(() => `${100 / itemsToShow}%`, [itemsToShow]);

  const dotCount = useMemo(() => {
    if (!showDots) return 0;
    if (slideCount <= itemsToShow) return 0;
    if (scrollBy <= 1) return maxIndex + 1;
    const baseCount = Math.floor(maxIndex / scrollBy) + 1;
    const needsLast = maxIndex % scrollBy !== 0 ? 1 : 0;
    return baseCount + needsLast;
  }, [itemsToShow, maxIndex, scrollBy, showDots, slideCount]);

  const dots = useMemo(() => {
    if (dotCount <= 0) return [];
    if (scrollBy <= 1) return Array.from({ length: dotCount }, (_, i) => i);
    const pages = [];
    for (let i = 0; i <= maxIndex; i += scrollBy) pages.push(i);
    if (pages.length === 0) return [0];
    if (pages[pages.length - 1] !== maxIndex) pages.push(maxIndex);
    return pages;
  }, [dotCount, maxIndex, scrollBy]);

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
      transform: shouldContinuousAutoplay ? "translate3d(0, 0, 0)" : trackTransform,
      transition:
        shouldContinuousAutoplay || !transitionEnabled
          ? "none"
          : "transform 600ms cubic-bezier(0.42, 0, 0.58, 1)",
      display: "flex",
      flexWrap: "nowrap",
      width: "100%",
      willChange: "transform",
    }),
    [shouldContinuousAutoplay, trackTransform, transitionEnabled],
  );

  const canNavigate = slideCount > itemsToShow;
  const disablePrev = !loop && (isReversed ? index >= maxIndex : index <= 0);
  const disableNext = !loop && (isReversed ? index <= 0 : index >= maxIndex);
  const useBottomDotArrows = arrowPlacement === "above-dots";
  const arrowStrokeColor = "#0f172a";

  const sharedArrowStyle = useMemo(
    () => ({
      background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(243,244,246,0.96))",
      color: arrowStrokeColor,
      borderColor: "#d1d5db",
      borderWidth: "1px",
      borderStyle: "solid",
      borderRadius: "9999px",
      boxShadow: "0 18px 45px rgba(15, 23, 42, 0.24)",
      ...(useBottomDotArrows
          ? {
              top: "auto",
              bottom: showDots ? "4.75rem" : "1.5rem",
              opacity: 1,
              visibility: "visible",
              pointerEvents: "auto",
              width: "3.25rem",
              height: "3.25rem",
              zIndex: 4,
              padding: 0,
              lineHeight: 0,
              minWidth: 0,
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              outline: "1px solid rgba(255,255,255,0.72)",
            }
        : {}),
    }),
    [arrowStrokeColor, showDots, useBottomDotArrows],
  );

  const prevArrowStyle = useMemo(
    () => ({
      ...sharedArrowStyle,
      ...(useBottomDotArrows
        ? {
            left: "50%",
            right: "auto",
            transform: "translateX(-125%)",
          }
        : {}),
    }),
    [sharedArrowStyle, useBottomDotArrows],
  );

  const nextArrowStyle = useMemo(
    () => ({
      ...sharedArrowStyle,
      ...(useBottomDotArrows
        ? {
            left: "50%",
            right: "auto",
            transform: "translateX(25%)",
          }
        : {}),
    }),
    [sharedArrowStyle, useBottomDotArrows],
  );

  const handlePrev = useCallback(() => {
    if (shouldLoopWithClones) {
      moveLoopBy(isReversed ? "next" : "prev");
      return;
    }

    if (isReversed) goNext();
    else goPrev();
  }, [goNext, goPrev, isReversed, moveLoopBy, shouldLoopWithClones]);

  const handleNext = useCallback(() => {
    if (shouldLoopWithClones) {
      moveLoopBy(isReversed ? "prev" : "next");
      return;
    }

    if (isReversed) goPrev();
    else goNext();
  }, [goNext, goPrev, isReversed, moveLoopBy, shouldLoopWithClones]);

  const handleTrackTransitionEnd = useCallback(() => {
    if (!shouldLoopWithClones) return;

    const maxPosition = cloneCount + slideCount;
    if (position >= maxPosition) {
      setTransitionEnabled(false);
      setPosition((current) => current - slideCount);
      scheduleTransitionReenable();
      return;
    }

    if (position < cloneCount) {
      setTransitionEnabled(false);
      setPosition((current) => current + slideCount);
      scheduleTransitionReenable();
    }
  }, [cloneCount, position, scheduleTransitionReenable, shouldLoopWithClones, slideCount]);

  const renderItems = useMemo(() => {
    const base = Array.isArray(items) ? items : [];

    if (shouldContinuousAutoplay) return base.length > 0 ? [...base, ...base] : [];
    if (!shouldLoopWithClones) return base;
    if (base.length === 0) return base;

    const head = cloneCount > 0 ? base.slice(-cloneCount) : [];
    const tail = cloneCount > 0 ? base.slice(0, cloneCount) : [];
    return [...head, ...base, ...tail];
  }, [cloneCount, items, shouldContinuousAutoplay, shouldLoopWithClones]);

  return (
    <div className={rootClassName} style={style}>
      {arrows && canNavigate && (
        <>
          <button
            type="button"
            className={`slick-nav slick-arrow slick-prev${disablePrev ? " slick-disabled" : ""}`}
            onClick={handlePrev}
            aria-label="Previous"
            disabled={disablePrev}
            style={prevArrowStyle}
          >
            <svg
              className="slick-nav-icon"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              style={{ display: "block" }}
            >
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className={`slick-nav slick-arrow slick-next${disableNext ? " slick-disabled" : ""}`}
            onClick={handleNext}
            aria-label="Next"
            disabled={disableNext}
            style={nextArrowStyle}
          >
            <svg
              className="slick-nav-icon"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              style={{ display: "block" }}
            >
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      )}

      <div className="slick-list">
        <div
          className="slick-track"
          style={trackStyle}
          ref={trackRef}
          onTransitionEnd={handleTrackTransitionEnd}
        >
          {(renderItems || []).map((item, itemIndex) => (
            <div
              key={`${item?.id || item?.key || "item"}-${itemIndex}`}
              className="site-slider-item slick-slide"
              style={{
                flex: `0 0 ${slideBasis}`,
                maxWidth: slideBasis,
                boxSizing: "border-box",
              }}
            >
              {renderItem(item, itemIndex)}
            </div>
          ))}
        </div>
      </div>

      {showDots && dots.length > 0 && (
        <ul className="slick-dots">
          {dots.map((dotIndex) => {
            const activeIndex =
              scrollBy > 1
                ? activeSlideIndex >= maxIndex
                  ? maxIndex
                  : Math.floor(activeSlideIndex / scrollBy) * scrollBy
                : activeSlideIndex;

            return (
              <li key={dotIndex} className={dotIndex === activeIndex ? "slick-active" : ""}>
                <button
                  type="button"
                  onClick={() => {
                    setIndex(dotIndex);
                    if (shouldLoopWithClones) {
                      setTransitionEnabled(true);
                      setPosition(dotIndex + cloneCount);
                    }
                  }}
                  aria-label={`Go to slide ${dotIndex + 1}`}
                >
                  {dotIndex + 1}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
