import React, { useEffect, useMemo, useRef } from "react";
import { toast } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { FiGlobe, FiSave, FiSettings, FiUpload } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import {
  getDefaultPublicSettings,
  toPublicAssetUrl,
} from "../utils/publicSettings";
import {
  loadAdminSettings,
  saveAdminSettings,
  selectAdminSettingsDraft,
  selectPublicSettingsState,
  setMarketplaceMode,
  setPublicStockSummaryEnabled,
  setVendorRegistrationEnabled,
  updateAdminNestedField,
  uploadAdminLogo,
} from "../store/publicSettingsSlice";

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const normalizeLogoMode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase() === "text"
    ? "text"
    : "image";

const parseListInput = (value) =>
  Array.from(
    new Set(
      String(value || "")
        .split(/[\n,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );

const normalizeNavLinks = (value, fallback = []) => {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const uniqueValues = new Map();
  value.forEach((entry) => {
    const label = String(entry?.label || "").trim();
    const path = String(entry?.path || "").trim() || "/";
    if (!label) return;
    uniqueValues.set(`${label}|${path}`, { label, path });
  });

  return uniqueValues.size > 0 ? Array.from(uniqueValues.values()) : [...fallback];
};

const parseNavLinkInput = (value, fallback = []) => {
  const links = String(value || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [labelPart, pathPart] = line.split("|");
      const label = String(labelPart || "").trim();
      const path = String(pathPart || "").trim() || "/";
      if (!label) return null;
      return { label, path };
    })
    .filter(Boolean);

  return normalizeNavLinks(links, fallback);
};

const formatNavLinkInput = (links = []) =>
  Array.isArray(links)
    ? links
        .map((entry) => {
          const label = String(entry?.label || "").trim();
          const path = String(entry?.path || "").trim() || "/";
          return label ? `${label} | ${path}` : "";
        })
        .filter(Boolean)
        .join("\n")
    : "";

const DashboardToggle = ({ checked, disabled = false, title, description, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => {
      if (!disabled) {
        onChange(!checked);
      }
    }}
    className={`flex w-full items-start gap-3 rounded-[22px] border px-4 py-3 text-left transition ${
      disabled
        ? "cursor-not-allowed border-black/8 bg-slate-100 opacity-70"
        : checked
          ? "border-black bg-black text-white"
          : "border-black/8 bg-white text-black hover:border-black/20"
    }`}
  >
    <span
      className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-white/25" : "bg-gray-200"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full transition ${
          checked
            ? "left-[1.25rem] bg-white"
            : "left-0.5 bg-black"
        }`}
      />
    </span>
    <span className="space-y-1">
      <span className="block text-sm font-semibold">{title}</span>
      <span
        className={`block text-xs leading-5 ${
          checked ? "text-white/75" : "text-gray-500"
        }`}
      >
        {description}
      </span>
    </span>
  </button>
);

const ModuleWebsiteSetup = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const settings = useSelector(selectAdminSettingsDraft);
  const { adminStatus, saveStatus, logoUploadStatus } = useSelector(selectPublicSettingsState);
  const loading = adminStatus === "idle" || adminStatus === "loading";
  const saving = saveStatus === "loading";
  const logoUploading = logoUploadStatus === "loading";
  const logoInputRef = useRef(null);

  const isAdmin = useMemo(
    () => String(user?.userType || "").toLowerCase() === "admin",
    [user?.userType],
  );
  const isSingleVendorMode =
    String(settings.marketplaceMode || "multi").trim().toLowerCase() === "single";
  const publicStockSummaryEnabled = Boolean(settings.publicStockSummaryEnabled);
  const logoMode = normalizeLogoMode(settings?.website?.logoMode);
  const logoPreviewUrl = useMemo(
    () => toPublicAssetUrl(settings?.website?.logoUrl || ""),
    [settings?.website?.logoUrl],
  );

  useEffect(() => {
    if (!isAdmin) return;

    dispatch(loadAdminSettings())
      .unwrap()
      .catch((message) => {
        toast.error(message || "Failed to load website settings");
      });
  }, [dispatch, isAdmin]);

  const updateNested = (section, key, value) => {
    dispatch(updateAdminNestedField({ section, key, value }));
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await dispatch(uploadAdminLogo(file)).unwrap();
      toast.success(result?.message || "Logo uploaded");
    } catch (error) {
      toast.error(error || "Failed to upload logo");
    } finally {
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  };

  const saveSettings = async (event) => {
    event.preventDefault();

    try {
      const normalizedMarketplaceMode =
        String(settings.marketplaceMode || "multi").toLowerCase() === "single"
          ? "single"
          : "multi";
      const normalizedVendorRegistrationEnabled =
        normalizedMarketplaceMode === "single"
          ? false
          : Boolean(settings.vendorRegistrationEnabled);
      const normalizedPublicStockSummaryEnabled = Boolean(
        settings.publicStockSummaryEnabled,
      );

      const payload = {
        marketplace: {
          marketplaceMode: normalizedMarketplaceMode,
          vendorRegistrationEnabled: normalizedVendorRegistrationEnabled,
          publicStockSummaryEnabled: normalizedPublicStockSummaryEnabled,
        },
        marketplaceMode: normalizedMarketplaceMode,
        vendorRegistrationEnabled: normalizedVendorRegistrationEnabled,
        publicStockSummaryEnabled: normalizedPublicStockSummaryEnabled,
        website: deepClone(settings.website || {}),
        contact: deepClone(settings.contact || {}),
        social: deepClone(settings.social || {}),
        policies: deepClone(settings.policies || {}),
        integrations: deepClone(settings.integrations || {}),
        invoice: deepClone(settings.invoice || {}),
        courier: deepClone(settings.courier || {}),
        locations: deepClone(settings.locations || {}),
        storefront: deepClone(settings.storefront || {}),
      };

      const result = await dispatch(saveAdminSettings(payload)).unwrap();
      toast.success(result?.message || "Settings saved");
    } catch (error) {
      toast.error(error || "Failed to save settings");
    }
  };

  if (!isAdmin) {
    return (
      <div className="app-panel p-8 text-center">
        <h2 className="mb-2 text-xl font-semibold text-black">Admin Access Required</h2>
        <p className="text-gray-600">Only admin can manage website and system settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="app-hero p-6 md:p-8">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <FiSettings className="w-6 h-6" />
        </div>
        <p className="app-kicker !text-white/65">Branding and storefront control</p>
        <h1 className="mt-3 text-2xl font-black md:text-3xl">Website Setup & Config</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-200 md:text-base">
          Control brand details, policies, tracking integrations, courier config, and marketplace mode.
        </p>
      </div>

      {loading ? (
        <div className="app-panel-soft p-6">
          <p className="text-gray-600">Loading settings...</p>
        </div>
      ) : (
        <form onSubmit={saveSettings} className="space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <section className="app-panel p-5 space-y-3">
              <h2 className="text-lg font-semibold text-black flex items-center gap-2">
                <FiGlobe className="w-5 h-5" /> Website
              </h2>

              <input
                value={settings.website.storeName}
                onChange={(event) => updateNested("website", "storeName", event.target.value)}
                placeholder="Store name"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <input
                value={settings.website.tagline}
                onChange={(event) => updateNested("website", "tagline", event.target.value)}
                placeholder="Store tagline"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <div className="app-panel-muted p-4 space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-black">Navbar Logo</p>
                    <p className="text-xs text-gray-500">
                      Use text branding or an uploaded image. Changes are reflected in the public navbar.
                    </p>
                  </div>
                  <select
                    value={logoMode}
                    onChange={(event) =>
                      updateNested(
                        "website",
                        "logoMode",
                        normalizeLogoMode(event.target.value),
                      )
                    }
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 md:w-44"
                  >
                    <option value="image">Image Logo</option>
                    <option value="text">Text Logo</option>
                  </select>
                </div>

                {logoMode === "text" ? (
                  <input
                    value={settings.website.logoText || ""}
                    onChange={(event) => updateNested("website", "logoText", event.target.value)}
                    placeholder="Text logo for navbar"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white"
                  />
                ) : (
                  <div className="space-y-3">
                    <input
                      value={settings.website.logoUrl}
                      onChange={(event) => updateNested("website", "logoUrl", event.target.value)}
                      placeholder="Logo URL or upload a file below"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white"
                    />
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                        className="app-btn-secondary h-11 px-4 text-sm font-semibold disabled:opacity-60"
                      >
                        <FiUpload className="w-4 h-4" />
                        {logoUploading ? "Uploading..." : "Upload Logo"}
                      </button>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, WEBP, or GIF. Upload sets the navbar logo immediately.
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-[24px] border border-dashed border-black/12 bg-white p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Logo Preview</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Preview the logo on light, dark, and transparent-style surfaces.
                      </p>
                    </div>
                  </div>

                  {logoMode === "text" ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="app-panel-soft p-4">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                          Light Surface
                        </p>
                        <div className="inline-flex min-h-11 items-center rounded-xl border border-black/10 bg-black px-4 text-base font-black tracking-[0.08em] text-white">
                          {String(settings?.website?.logoText || settings?.website?.storeName || "LOGO").trim() || "LOGO"}
                        </div>
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-gray-950 p-4 shadow-sm">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                          Dark Surface
                        </p>
                        <div className="inline-flex min-h-11 items-center rounded-xl border border-white/15 bg-white px-4 text-base font-black tracking-[0.08em] text-black">
                          {String(settings?.website?.logoText || settings?.website?.storeName || "LOGO").trim() || "LOGO"}
                        </div>
                      </div>
                    </div>
                  ) : logoPreviewUrl ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="app-panel-soft p-4">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                          Light Surface
                        </p>
                        <div className="flex min-h-[96px] items-center justify-center rounded-[18px] border border-black/8 bg-white px-4 py-3">
                          <img
                            src={logoPreviewUrl}
                            alt={String(settings?.website?.storeName || "Logo")}
                            className="h-14 w-auto max-w-full object-contain"
                          />
                        </div>
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-gray-950 p-4 shadow-sm">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                          Dark Surface
                        </p>
                        <div className="flex min-h-[96px] items-center justify-center rounded-[18px] border border-white/10 bg-gray-950 px-4 py-3">
                          <img
                            src={logoPreviewUrl}
                            alt={String(settings?.website?.storeName || "Logo")}
                            className="h-14 w-auto max-w-full object-contain"
                          />
                        </div>
                      </div>
                      <div className="app-panel-soft p-4">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                          Transparent Surface
                        </p>
                        <div
                          className="flex min-h-[96px] items-center justify-center rounded-[18px] border border-black/8 px-4 py-3"
                          style={{
                            backgroundColor: "#f8fafc",
                            backgroundImage:
                              "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
                            backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                            backgroundSize: "16px 16px",
                          }}
                        >
                          <img
                            src={logoPreviewUrl}
                            alt={String(settings?.website?.storeName || "Logo")}
                            className="h-14 w-auto max-w-full object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No logo uploaded yet.</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={settings.website.themeColor}
                  onChange={(event) => updateNested("website", "themeColor", event.target.value)}
                  placeholder="Theme color"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
                <input
                  value={settings.website.fontFamily}
                  onChange={(event) => updateNested("website", "fontFamily", event.target.value)}
                  placeholder="Font family"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm text-gray-700">
                  Marketplace Mode
                  <select
                    value={settings.marketplaceMode}
                    onChange={(event) => dispatch(setMarketplaceMode(event.target.value))}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  >
                    <option value="multi">Multi Vendor</option>
                    <option value="single">Single Vendor</option>
                  </select>
                </label>

                <div className="space-y-3 md:pt-6">
                  <DashboardToggle
                    checked={Boolean(settings.vendorRegistrationEnabled)}
                    disabled={isSingleVendorMode}
                    onChange={(enabled) => dispatch(setVendorRegistrationEnabled(enabled))}
                    title={
                      isSingleVendorMode
                        ? "Vendor registration locked"
                        : "Allow vendor registration"
                    }
                    description={
                      isSingleVendorMode
                        ? "Single vendor mode keeps vendor signup disabled automatically."
                        : "Control whether vendors can register from the public auth flow."
                    }
                  />
                  <DashboardToggle
                    checked={publicStockSummaryEnabled}
                    onChange={(enabled) =>
                      dispatch(setPublicStockSummaryEnabled(enabled))
                    }
                    title="Show ecommerce stock summary publicly"
                    description="When enabled, landing and shop headers can show overall product and stock totals for the full catalog."
                  />
                </div>
              </div>
            </section>

            <section className="app-panel p-5 space-y-3">
              <h2 className="text-lg font-semibold text-black">Contact & Social</h2>

              <input
                value={settings.contact.address}
                onChange={(event) => updateNested("contact", "address", event.target.value)}
                placeholder="Address"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <input
                value={settings.contact.addressLink}
                onChange={(event) => updateNested("contact", "addressLink", event.target.value)}
                placeholder="Address map link"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={settings.contact.phone1}
                  onChange={(event) => updateNested("contact", "phone1", event.target.value)}
                  placeholder="Primary phone"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
                <input
                  value={settings.contact.phone2}
                  onChange={(event) => updateNested("contact", "phone2", event.target.value)}
                  placeholder="Secondary phone"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </div>
              <input
                value={settings.contact.email}
                onChange={(event) => updateNested("contact", "email", event.target.value)}
                placeholder="Support email"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={settings.social.facebook}
                  onChange={(event) => updateNested("social", "facebook", event.target.value)}
                  placeholder="Facebook URL"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
                <input
                  value={settings.social.whatsapp}
                  onChange={(event) => updateNested("social", "whatsapp", event.target.value)}
                  placeholder="WhatsApp URL"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
                <input
                  value={settings.social.instagram}
                  onChange={(event) => updateNested("social", "instagram", event.target.value)}
                  placeholder="Instagram URL"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
                <input
                  value={settings.social.youtube}
                  onChange={(event) => updateNested("social", "youtube", event.target.value)}
                  placeholder="YouTube URL"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <section className="app-panel p-5 space-y-4">
              <h2 className="text-lg font-semibold text-black">Landing & Navigation</h2>

              <label className="block text-sm text-gray-700">
                Market Label
                <input
                  value={settings.storefront.marketLabel}
                  onChange={(event) =>
                    updateNested("storefront", "marketLabel", event.target.value)
                  }
                  placeholder="Bangladesh marketplace"
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm text-gray-700">
                  Category Eyebrow
                  <input
                    value={settings.storefront.categoryRailEyebrow}
                    onChange={(event) =>
                      updateNested("storefront", "categoryRailEyebrow", event.target.value)
                    }
                    placeholder="Shop by Category"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  Category Title
                  <input
                    value={settings.storefront.categoryRailTitle}
                    onChange={(event) =>
                      updateNested("storefront", "categoryRailTitle", event.target.value)
                    }
                    placeholder="All Departments"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
              </div>

              <label className="block text-sm text-gray-700">
                Category Button
                <input
                  value={settings.storefront.categoryRailButtonLabel}
                  onChange={(event) =>
                    updateNested("storefront", "categoryRailButtonLabel", event.target.value)
                  }
                  placeholder="Explore marketplace"
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </label>

              <label className="block text-sm text-gray-700">
                Hero Title Fallback
                <input
                  value={settings.storefront.heroFallbackTitle}
                  onChange={(event) =>
                    updateNested("storefront", "heroFallbackTitle", event.target.value)
                  }
                  placeholder="{storeName} deals built for Bangladesh shoppers"
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </label>

              <label className="block text-sm text-gray-700">
                Hero Description Fallback
                <textarea
                  value={settings.storefront.heroFallbackDescription}
                  onChange={(event) =>
                    updateNested("storefront", "heroFallbackDescription", event.target.value)
                  }
                  rows={3}
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm text-gray-700">
                  Hero Primary Button
                  <input
                    value={settings.storefront.heroPrimaryLabel}
                    onChange={(event) =>
                      updateNested("storefront", "heroPrimaryLabel", event.target.value)
                    }
                    placeholder="Shop campaign"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  Hero Secondary Button
                  <input
                    value={settings.storefront.heroSecondaryLabel}
                    onChange={(event) =>
                      updateNested("storefront", "heroSecondaryLabel", event.target.value)
                    }
                    placeholder="Browse all products"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
              </div>

              <label className="block text-sm text-gray-700">
                Navbar Quick Links
                <textarea
                  value={formatNavLinkInput(settings?.storefront?.navQuickLinks)}
                  onChange={(event) =>
                    updateNested(
                      "storefront",
                      "navQuickLinks",
                      parseNavLinkInput(
                        event.target.value,
                        getDefaultPublicSettings().storefront.navQuickLinks,
                      ),
                    )
                  }
                  rows={5}
                  placeholder={
                    "Daily Deals | /shop?collection=deals\nTop Categories | /#top-categories\nNew Arrivals | /shop?collection=new-arrivals\nBuyer Protection | /faqs#buyer-protection\nTrack Order | /track-order"
                  }
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
                <p className="mt-1 text-xs text-gray-500">
                  One link per line using <code>Label | /path</code>.
                </p>
              </label>

              <label className="block text-sm text-gray-700">
                Footer Caption
                <input
                  value={settings.storefront.footerCaption}
                  onChange={(event) =>
                    updateNested("storefront", "footerCaption", event.target.value)
                  }
                  placeholder="Built for Bangladesh marketplace operations"
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </label>
            </section>

            <section className="app-panel p-5 space-y-4">
              <h2 className="text-lg font-semibold text-black">Storefront Sections</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm text-gray-700">
                  Highlights Eyebrow
                  <input
                    value={settings.storefront.highlightsEyebrow}
                    onChange={(event) =>
                      updateNested("storefront", "highlightsEyebrow", event.target.value)
                    }
                    placeholder="Marketplace Highlights"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  Highlights Title
                  <input
                    value={settings.storefront.highlightsTitle}
                    onChange={(event) =>
                      updateNested("storefront", "highlightsTitle", event.target.value)
                    }
                    placeholder="{storeName} shopping channels built for fast browsing"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
              </div>

              <label className="block text-sm text-gray-700">
                Highlights Description
                <textarea
                  value={settings.storefront.highlightsDescription}
                  onChange={(event) =>
                    updateNested("storefront", "highlightsDescription", event.target.value)
                  }
                  rows={3}
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm text-gray-700">
                  Flash Eyebrow
                  <input
                    value={settings.storefront.flashEyebrow}
                    onChange={(event) =>
                      updateNested("storefront", "flashEyebrow", event.target.value)
                    }
                    placeholder="Flash Picks"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  Flash Title
                  <input
                    value={settings.storefront.flashTitle}
                    onChange={(event) =>
                      updateNested("storefront", "flashTitle", event.target.value)
                    }
                    placeholder="Deal-driven shelves inspired by global marketplaces"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
              </div>

              <label className="block text-sm text-gray-700">
                Flash Description
                <textarea
                  value={settings.storefront.flashDescription}
                  onChange={(event) =>
                    updateNested("storefront", "flashDescription", event.target.value)
                  }
                  rows={3}
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm text-gray-700">
                  Flash Primary Button
                  <input
                    value={settings.storefront.flashPrimaryLabel}
                    onChange={(event) =>
                      updateNested("storefront", "flashPrimaryLabel", event.target.value)
                    }
                    placeholder="Open shop"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  Flash Secondary Button
                  <input
                    value={settings.storefront.flashSecondaryLabel}
                    onChange={(event) =>
                      updateNested("storefront", "flashSecondaryLabel", event.target.value)
                    }
                    placeholder="Open dashboard"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm text-gray-700">
                  Sidebar Eyebrow
                  <input
                    value={settings.storefront.sidebarControlEyebrow}
                    onChange={(event) =>
                      updateNested("storefront", "sidebarControlEyebrow", event.target.value)
                    }
                    placeholder="Marketplace control"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  Sidebar Title
                  <input
                    value={settings.storefront.sidebarControlTitle}
                    onChange={(event) =>
                      updateNested("storefront", "sidebarControlTitle", event.target.value)
                    }
                    placeholder="Shop by stock, not guesswork"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
              </div>

              <label className="block text-sm text-gray-700">
                Sidebar Description
                <textarea
                  value={settings.storefront.sidebarControlDescription}
                  onChange={(event) =>
                    updateNested(
                      "storefront",
                      "sidebarControlDescription",
                      event.target.value,
                    )
                  }
                  rows={3}
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm text-gray-700">
                  Sidebar Button
                  <input
                    value={settings.storefront.sidebarControlButtonLabel}
                    onChange={(event) =>
                      updateNested(
                        "storefront",
                        "sidebarControlButtonLabel",
                        event.target.value,
                      )
                    }
                    placeholder="Open storefront"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  Discovery Eyebrow
                  <input
                    value={settings.storefront.discoveryEyebrow}
                    onChange={(event) =>
                      updateNested("storefront", "discoveryEyebrow", event.target.value)
                    }
                    placeholder="Top discovery lanes"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm text-gray-700">
                  Trust Eyebrow
                  <input
                    value={settings.storefront.trustEyebrow}
                    onChange={(event) =>
                      updateNested("storefront", "trustEyebrow", event.target.value)
                    }
                    placeholder="Buyer trust"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  Top Categories Eyebrow
                  <input
                    value={settings.storefront.topCategoriesEyebrow}
                    onChange={(event) =>
                      updateNested("storefront", "topCategoriesEyebrow", event.target.value)
                    }
                    placeholder="Top categories"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
              </div>

              <label className="block text-sm text-gray-700">
                Trust Bullets
                <textarea
                  value={Array.isArray(settings?.storefront?.trustBullets)
                    ? settings.storefront.trustBullets.join("\n")
                    : ""}
                  onChange={(event) =>
                    updateNested("storefront", "trustBullets", parseListInput(event.target.value))
                  }
                  rows={4}
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm text-gray-700">
                  Deals Eyebrow
                  <input
                    value={settings.storefront.dealsEyebrow}
                    onChange={(event) =>
                      updateNested("storefront", "dealsEyebrow", event.target.value)
                    }
                    placeholder="Limited-price shelves"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  Deals Title
                  <input
                    value={settings.storefront.dealsTitle}
                    onChange={(event) =>
                      updateNested("storefront", "dealsTitle", event.target.value)
                    }
                    placeholder="Flash deal picks"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm text-gray-700">
                  Deals Button
                  <input
                    value={settings.storefront.dealsButtonLabel}
                    onChange={(event) =>
                      updateNested("storefront", "dealsButtonLabel", event.target.value)
                    }
                    placeholder="See all"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  Category Floor Eyebrow
                  <input
                    value={settings.storefront.categoryFloorEyebrow}
                    onChange={(event) =>
                      updateNested("storefront", "categoryFloorEyebrow", event.target.value)
                    }
                    placeholder="Category channel"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
              </div>

              <label className="block text-sm text-gray-700">
                Category Floor Description
                <textarea
                  value={settings.storefront.categoryFloorDescription}
                  onChange={(event) =>
                    updateNested(
                      "storefront",
                      "categoryFloorDescription",
                      event.target.value,
                    )
                  }
                  rows={3}
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm text-gray-700">
                  Category CTA Button
                  <input
                    value={settings.storefront.categoryFloorButtonLabel}
                    onChange={(event) =>
                      updateNested(
                        "storefront",
                        "categoryFloorButtonLabel",
                        event.target.value,
                      )
                    }
                    placeholder="Browse category"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  Category Panel Button
                  <input
                    value={settings.storefront.categoryFloorPanelButtonLabel}
                    onChange={(event) =>
                      updateNested(
                        "storefront",
                        "categoryFloorPanelButtonLabel",
                        event.target.value,
                      )
                    }
                    placeholder="Shop now"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm text-gray-700">
                  Recommended Eyebrow
                  <input
                    value={settings.storefront.recommendedEyebrow}
                    onChange={(event) =>
                      updateNested("storefront", "recommendedEyebrow", event.target.value)
                    }
                    placeholder="Recommended shelf"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  Recommended Title
                  <input
                    value={settings.storefront.recommendedTitle}
                    onChange={(event) =>
                      updateNested("storefront", "recommendedTitle", event.target.value)
                    }
                    placeholder="New arrivals for the marketplace"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm text-gray-700">
                  Recommended Button
                  <input
                    value={settings.storefront.recommendedButtonLabel}
                    onChange={(event) =>
                      updateNested(
                        "storefront",
                        "recommendedButtonLabel",
                        event.target.value,
                      )
                    }
                    placeholder="View catalog"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  Catalog Title
                  <input
                    value={settings.storefront.catalogTitle}
                    onChange={(event) =>
                      updateNested("storefront", "catalogTitle", event.target.value)
                    }
                    placeholder="{storeName} catalog with stock-aware shopping"
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                </label>
              </div>

              <label className="block text-sm text-gray-700">
                Catalog Description
                <textarea
                  value={settings.storefront.catalogDescription}
                  onChange={(event) =>
                    updateNested("storefront", "catalogDescription", event.target.value)
                  }
                  rows={3}
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </label>
            </section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <section className="app-panel p-5 space-y-3">
              <h2 className="text-lg font-semibold text-black">Policies</h2>

              <label className="block text-sm text-gray-700">
                Shipment Policy
                <textarea
                  value={settings.policies.shipmentPolicy}
                  onChange={(event) => updateNested("policies", "shipmentPolicy", event.target.value)}
                  rows={3}
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </label>

              <label className="block text-sm text-gray-700">
                Delivery Policy
                <textarea
                  value={settings.policies.deliveryPolicy}
                  onChange={(event) => updateNested("policies", "deliveryPolicy", event.target.value)}
                  rows={3}
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </label>

              <label className="block text-sm text-gray-700">
                Terms & Conditions
                <textarea
                  value={settings.policies.termsConditions}
                  onChange={(event) => updateNested("policies", "termsConditions", event.target.value)}
                  rows={3}
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </label>

              <label className="block text-sm text-gray-700">
                Return Policy
                <textarea
                  value={settings.policies.returnPolicy}
                  onChange={(event) => updateNested("policies", "returnPolicy", event.target.value)}
                  rows={3}
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </label>

              <label className="block text-sm text-gray-700">
                Privacy Policy
                <textarea
                  value={settings.policies.privacyPolicy}
                  onChange={(event) => updateNested("policies", "privacyPolicy", event.target.value)}
                  rows={3}
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </label>
            </section>

            <section className="app-panel p-5 space-y-3">
              <h2 className="text-lg font-semibold text-black">Integrations & Setup</h2>

              <input
                value={settings.integrations.facebookPixelId}
                onChange={(event) =>
                  updateNested("integrations", "facebookPixelId", event.target.value)
                }
                placeholder="Facebook Pixel ID"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <input
                value={settings.integrations.googleAnalyticsId}
                onChange={(event) =>
                  updateNested("integrations", "googleAnalyticsId", event.target.value)
                }
                placeholder="Google Analytics ID"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <input
                value={settings.integrations.gtmId}
                onChange={(event) => updateNested("integrations", "gtmId", event.target.value)}
                placeholder="Google Tag Manager ID"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <textarea
                value={settings.integrations.customTrackingCode}
                onChange={(event) =>
                  updateNested("integrations", "customTrackingCode", event.target.value)
                }
                placeholder="Custom tracking code"
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.integrations.enableDataLayer)}
                    onChange={(event) =>
                      updateNested(
                        "integrations",
                        "enableDataLayer",
                        event.target.checked,
                      )
                    }
                  />
                  Enable Data Layer Events
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.integrations.enableGoogleLogin)}
                    onChange={(event) =>
                      updateNested(
                        "integrations",
                        "enableGoogleLogin",
                        event.target.checked,
                      )
                    }
                  />
                  Enable Google Login
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.integrations.enableFacebookLogin)}
                    onChange={(event) =>
                      updateNested(
                        "integrations",
                        "enableFacebookLogin",
                        event.target.checked,
                      )
                    }
                  />
                  Enable Facebook Login
                </label>
              </div>

              <h3 className="text-sm font-semibold text-gray-900 pt-2">Courier</h3>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(settings.courier.enabled)}
                  onChange={(event) =>
                    updateNested("courier", "enabled", event.target.checked)
                  }
                />
                Enable Courier API Integration
              </label>
              <input
                value={settings.courier.providerName}
                onChange={(event) => updateNested("courier", "providerName", event.target.value)}
                placeholder="Courier provider"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <input
                value={settings.courier.apiBaseUrl}
                onChange={(event) => updateNested("courier", "apiBaseUrl", event.target.value)}
                placeholder="Courier API base URL"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={settings.courier.apiToken || ""}
                  onChange={(event) => updateNested("courier", "apiToken", event.target.value)}
                  placeholder="Courier API token (optional)"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
                <input
                  value={settings.courier.apiKey || ""}
                  onChange={(event) => updateNested("courier", "apiKey", event.target.value)}
                  placeholder="Courier API key (optional)"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </div>
              <input
                value={settings.courier.apiSecret || ""}
                onChange={(event) => updateNested("courier", "apiSecret", event.target.value)}
                placeholder="Courier API secret (optional)"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={settings.courier.consignmentPath || ""}
                  onChange={(event) =>
                    updateNested("courier", "consignmentPath", event.target.value)
                  }
                  placeholder="Consignment path (e.g. /consignments)"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
                <input
                  value={settings.courier.trackingPath || ""}
                  onChange={(event) => updateNested("courier", "trackingPath", event.target.value)}
                  placeholder="Tracking path (e.g. /track/{id})"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={settings.courier.labelPath || ""}
                  onChange={(event) => updateNested("courier", "labelPath", event.target.value)}
                  placeholder="Label path (optional)"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={settings.courier.timeoutMs || 12000}
                  onChange={(event) =>
                    updateNested(
                      "courier",
                      "timeoutMs",
                      Math.max(1000, Number(event.target.value || 12000)),
                    )
                  }
                  placeholder="Timeout (ms)"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </div>

              <h3 className="text-sm font-semibold text-gray-900 pt-2">Invoice</h3>
              <input
                value={settings.invoice.logo}
                onChange={(event) => updateNested("invoice", "logo", event.target.value)}
                placeholder="Invoice logo URL"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <input
                value={settings.invoice.address}
                onChange={(event) => updateNested("invoice", "address", event.target.value)}
                placeholder="Invoice address"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <input
                value={settings.invoice.footerText}
                onChange={(event) => updateNested("invoice", "footerText", event.target.value)}
                placeholder="Invoice footer text"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
              />

              <h3 className="text-sm font-semibold text-gray-900 pt-2">Location Management</h3>
              <label className="block text-sm text-gray-700">
                City Options (one per line or comma separated)
                <textarea
                  value={Array.isArray(settings?.locations?.cityOptions)
                    ? settings.locations.cityOptions.join("\n")
                    : ""}
                  onChange={(event) =>
                    updateNested(
                      "locations",
                      "cityOptions",
                      parseListInput(event.target.value),
                    )
                  }
                  rows={3}
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </label>
              <label className="block text-sm text-gray-700">
                Sub-City / District Options (one per line or comma separated)
                <textarea
                  value={Array.isArray(settings?.locations?.subCityOptions)
                    ? settings.locations.subCityOptions.join("\n")
                    : ""}
                  onChange={(event) =>
                    updateNested(
                      "locations",
                      "subCityOptions",
                      parseListInput(event.target.value),
                    )
                  }
                  rows={3}
                  className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                />
              </label>
            </section>
          </div>

          <div className="app-panel flex justify-end p-4">
            <button
              type="submit"
              disabled={saving}
              className="app-btn-primary h-11 px-5 disabled:opacity-60"
            >
              <FiSave className="w-4 h-4" />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ModuleWebsiteSetup;
