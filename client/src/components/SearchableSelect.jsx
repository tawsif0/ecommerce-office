import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiCheck, FiChevronDown, FiSearch, FiX } from "react-icons/fi";

const SearchableSelect = ({
  value = "",
  onChange,
  options = [],
  placeholder = "Select",
  searchPlaceholder = "Search...",
  emptyLabel = "No options found",
  className = "",
}) => {
  const shellRef = useRef(null);
  const searchRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalizedOptions = useMemo(
    () =>
      (Array.isArray(options) ? options : []).map((option) => ({
        value: String(option?.value || "").trim(),
        label: String(option?.label || option?.value || "").trim(),
        description: String(option?.description || "").trim(),
      })),
    [options],
  );

  const selectedOption = normalizedOptions.find(
    (option) => option.value === String(value || "").trim(),
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = String(query || "").trim().toLowerCase();
    if (!normalizedQuery) return normalizedOptions;
    return normalizedOptions.filter((option) =>
      `${option.label} ${option.description}`.toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedOptions, query]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (!shellRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }

    window.setTimeout(() => searchRef.current?.focus(), 0);
  }, [isOpen]);

  return (
    <div ref={shellRef} className={`relative ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-[46px] w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left text-sm text-black transition hover:border-black"
      >
        <span
          className={
            selectedOption || String(value || "").trim() ? "text-black" : "text-gray-400"
          }
        >
          {selectedOption?.label || String(value || "").trim() || placeholder}
        </span>
        <FiChevronDown className={`h-4 w-4 text-gray-500 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div className="absolute z-[120] mt-2 w-full rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <FiSearch className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 border-0 bg-transparent text-sm outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-gray-400 transition hover:text-black"
              >
                <FiX className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="rounded-lg px-3 py-2 text-sm text-gray-500">{emptyLabel}</div>
            ) : (
              filteredOptions.map((option) => {
                const active = option.value === String(value || "").trim();
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange?.(option.value);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition ${
                      active ? "bg-black text-white" : "hover:bg-gray-50 text-black"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{option.label}</p>
                      {option.description ? (
                        <p className={`mt-0.5 text-xs ${active ? "text-white/70" : "text-gray-500"}`}>
                          {option.description}
                        </p>
                      ) : null}
                    </div>
                    {active ? <FiCheck className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SearchableSelect;
