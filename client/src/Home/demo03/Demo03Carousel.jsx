import React, { useMemo, useState } from "react";

const MOBILE_GRID_CLASS = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

const TABLET_GRID_CLASS = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

const DESKTOP_GRID_CLASS = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
};

const GAP_CLASS = {
  "gap-sm": "gap-3",
  "gap-base": "gap-4",
};

const clampCount = (value) => {
  const numeric = Number(value || 1);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1;
  return Math.max(1, Math.min(5, Math.round(numeric)));
};

const Demo03Carousel = ({
  items = [],
  renderItem,
  className = "",
  gapClass = "gap-base",
  itemsDesktop = 1,
  itemsTablet = 1,
  itemsMobile = 1,
  arrows = false,
}) => {
  const normalizedItems = Array.isArray(items) ? items : [];
  const [activeIndex, setActiveIndex] = useState(0);

  const desktopCount = clampCount(itemsDesktop);
  const tabletCount = clampCount(itemsTablet);
  const mobileCount = clampCount(itemsMobile);
  const gap = GAP_CLASS[gapClass] || GAP_CLASS["gap-base"];

  const usesSingleSlideView = desktopCount === 1 && tabletCount === 1 && mobileCount === 1;

  const gridClassName = useMemo(
    () =>
      [
        "grid",
        gap,
        MOBILE_GRID_CLASS[mobileCount] || MOBILE_GRID_CLASS[1],
        TABLET_GRID_CLASS[tabletCount] || TABLET_GRID_CLASS[1],
        DESKTOP_GRID_CLASS[desktopCount] || DESKTOP_GRID_CLASS[1],
      ]
        .filter(Boolean)
        .join(" "),
    [desktopCount, gap, mobileCount, tabletCount],
  );

  if (!normalizedItems.length || typeof renderItem !== "function") {
    return null;
  }

  if (usesSingleSlideView) {
    const activeItem = normalizedItems[Math.max(0, Math.min(activeIndex, normalizedItems.length - 1))];

    return (
      <div className={className}>
        <div>{renderItem(activeItem, activeIndex)}</div>
        {arrows && normalizedItems.length > 1 ? (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() =>
                setActiveIndex((prev) => (prev - 1 + normalizedItems.length) % normalizedItems.length)
              }
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
              aria-label="Previous slide"
            >
              {"<"}
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => (prev + 1) % normalizedItems.length)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
              aria-label="Next slide"
            >
              {">"}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className={gridClassName}>
        {normalizedItems.map((item, index) => (
          <div key={item?.id || item?._id || index}>{renderItem(item, index)}</div>
        ))}
      </div>
    </div>
  );
};

export default Demo03Carousel;
