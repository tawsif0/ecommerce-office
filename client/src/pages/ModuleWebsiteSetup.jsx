import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { FiGlobe, FiSave, FiSettings, FiUpload, FiX } from "react-icons/fi";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import { toPublicAssetUrl } from "../utils/publicSettings";
import {
  loadAdminSettings,
  saveAdminSettings,
  selectAdminSettingsDraft,
  selectPublicSettingsState,
  setPublicStockSummaryEnabled,
  updateAdminField,
  updateAdminNestedField,
  uploadAdminLogo,
} from "../store/publicSettingsSlice";

const baseUrl = import.meta.env.VITE_API_URL;

const sectionClass =
  "app-panel space-y-4 p-5 md:p-6";
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-black outline-none transition focus:border-black";
const textareaClass = `${inputClass} min-h-[104px] resize-y`;

const normalizeLogoMode = (value) =>
  String(value || "").trim().toLowerCase() === "text" ? "text" : "image";

const parseIdList = (value) =>
  Array.isArray(value)
    ? value
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
        .filter((entry, index, list) => list.indexOf(entry) === index)
    : [];

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const ModuleWebsiteSetup = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const settings = useSelector(selectAdminSettingsDraft);
  const { adminStatus, saveStatus, logoUploadStatus } = useSelector(selectPublicSettingsState);
  const loading = adminStatus === "idle" || adminStatus === "loading";
  const saving = saveStatus === "loading";
  const logoUploading = logoUploadStatus === "loading";
  const logoInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const logoMode = normalizeLogoMode(settings?.website?.logoMode);
  const logoPreviewUrl = useMemo(
    () => toPublicAssetUrl(settings?.website?.logoUrl || ""),
    [settings?.website?.logoUrl],
  );
  const publicStockCategoryIds = useMemo(
    () => parseIdList(settings?.publicStockCategoryIds || settings?.marketplace?.publicStockCategoryIds),
    [settings?.marketplace?.publicStockCategoryIds, settings?.publicStockCategoryIds],
  );
  const publicStockSummaryEnabled = Boolean(
    settings?.publicStockSummaryEnabled ?? settings?.marketplace?.publicStockSummaryEnabled,
  );

  const isAdmin = useMemo(
    () => String(user?.userType || "").toLowerCase() === "admin",
    [user?.userType],
  );

  useEffect(() => {
    if (!isAdmin) return;

    dispatch(loadAdminSettings())
      .unwrap()
      .catch((message) => {
        toast.error(message || "Failed to load website settings");
      });
  }, [dispatch, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await axios.get(`${baseUrl}/categories`, {
          headers: getAuthHeaders(),
        });

        const nextCategories = response.data?.success
          ? response.data.categories || []
          : Array.isArray(response.data?.data)
            ? response.data.data
            : Array.isArray(response.data)
              ? response.data
              : [];

        setCategories(nextCategories);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load categories");
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, [isAdmin]);

  const updateNested = (section, key, value) => {
    dispatch(updateAdminNestedField({ section, key, value }));
  };

  const updateRoot = (key, value) => {
    dispatch(updateAdminField({ key, value }));
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

  const togglePublicStockCategory = (categoryId) => {
    const normalizedId = String(categoryId || "").trim();
    if (!normalizedId) return;

    updateRoot(
      "publicStockCategoryIds",
      publicStockCategoryIds.includes(normalizedId)
        ? publicStockCategoryIds.filter((id) => id !== normalizedId)
        : [...publicStockCategoryIds, normalizedId],
    );
  };

  const saveSettings = async (event) => {
    event.preventDefault();

    try {
      const payload = {
        website: { ...(settings.website || {}) },
        contact: { ...(settings.contact || {}) },
        social: { ...(settings.social || {}) },
        policies: { ...(settings.policies || {}) },
        integrations: { ...(settings.integrations || {}) },
        storefront: {
          ...(settings.storefront || {}),
          footerCaption: String(settings?.storefront?.footerCaption || "").trim(),
        },
        publicStockSummaryEnabled,
        publicStockCategoryIds,
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
        <p className="text-gray-600">Only admin can manage website settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="app-hero p-6 md:p-8">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <FiSettings className="h-6 w-6" />
        </div>
        <p className="app-kicker !text-white/65">Website setup</p>
        <h1 className="mt-3 text-2xl font-black md:text-3xl">Website Setup</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-200 md:text-base">
          Keep only the public-site settings this project actually uses: branding, contact details, tracking and pixels, category-based public stock visibility, policies, and footer copy.
        </p>
      </div>

      {loading ? (
        <div className="app-panel-soft p-6">
          <p className="text-gray-600">Loading settings...</p>
        </div>
      ) : (
        <form onSubmit={saveSettings} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <section className={sectionClass}>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-black">
                <FiGlobe className="h-5 w-5" /> Brand & Theme
              </h2>

              <input
                value={settings.website.storeName}
                onChange={(event) => updateNested("website", "storeName", event.target.value)}
                placeholder="Store name"
                className={inputClass}
              />
              <input
                value={settings.website.tagline}
                onChange={(event) => updateNested("website", "tagline", event.target.value)}
                placeholder="Store tagline"
                className={inputClass}
              />

              <div className="app-panel-muted space-y-3 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-black">Navbar Logo</p>
                    <p className="text-xs text-gray-500">
                      Use a text logo or upload an image for the public website.
                    </p>
                  </div>
                  <select
                    value={logoMode}
                    onChange={(event) =>
                      updateNested("website", "logoMode", normalizeLogoMode(event.target.value))
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
                    className={inputClass}
                  />
                ) : (
                  <div className="space-y-3">
                    <input
                      value={settings.website.logoUrl}
                      onChange={(event) => updateNested("website", "logoUrl", event.target.value)}
                      placeholder="Logo URL or upload a file below"
                      className={inputClass}
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
                        <FiUpload className="h-4 w-4" />
                        {logoUploading ? "Uploading..." : "Upload Logo"}
                      </button>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, WEBP, or GIF.
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-[24px] border border-dashed border-black/12 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Logo Preview</p>
                  <div className="mt-3 flex min-h-[96px] items-center justify-center rounded-[18px] border border-black/8 bg-white px-4 py-3">
                    {logoMode === "text" ? (
                      <div className="inline-flex min-h-11 items-center rounded-xl border border-black/10 bg-black px-4 text-base font-black tracking-[0.08em] text-white">
                        {String(settings?.website?.logoText || settings?.website?.storeName || "LOGO").trim() || "LOGO"}
                      </div>
                    ) : logoPreviewUrl ? (
                      <img
                        src={logoPreviewUrl}
                        alt={String(settings?.website?.storeName || "Logo")}
                        className="h-14 w-auto max-w-full object-contain"
                      />
                    ) : (
                      <p className="text-sm text-gray-500">No logo uploaded yet.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  value={settings.website.themeColor}
                  onChange={(event) => updateNested("website", "themeColor", event.target.value)}
                  placeholder="Theme color"
                  className={inputClass}
                />
                <input
                  value={settings.website.fontFamily}
                  onChange={(event) => updateNested("website", "fontFamily", event.target.value)}
                  placeholder="Font family"
                  className={inputClass}
                />
              </div>
            </section>

            <section className={sectionClass}>
              <h2 className="text-lg font-semibold text-black">Public Stock Visibility</h2>
              <p className="text-sm text-gray-600">
                Use website settings as the single source of truth for public stock. When enabled, only the selected categories will show stock counts.
              </p>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <input
                    type="checkbox"
                    checked={publicStockSummaryEnabled}
                    onChange={(event) =>
                      dispatch(setPublicStockSummaryEnabled(event.target.checked))
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <div>
                    <p className="text-sm font-semibold text-black">
                      Enable category-based public stock
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      When disabled, stock stays hidden everywhere on the public site. When enabled, only the categories below can show stock.
                    </p>
                  </div>
                </label>

                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-black">
                    Selected categories: {publicStockCategoryIds.length}
                  </p>
                  {publicStockCategoryIds.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => updateRoot("publicStockCategoryIds", [])}
                      className="text-xs font-semibold text-gray-700 transition hover:text-black"
                    >
                      Clear all
                    </button>
                  ) : null}
                </div>

                <div className={!publicStockSummaryEnabled ? "pointer-events-none opacity-55" : ""}>
                  {categoriesLoading ? (
                    <p className="text-sm text-gray-500">Loading categories...</p>
                  ) : categories.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No categories found yet. Create categories first, then choose which ones can show public stock.
                    </p>
                  ) : (
                    <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                      {categories.map((category) => {
                        const categoryId = String(category._id || "");
                        const checked = publicStockCategoryIds.includes(categoryId);

                        return (
                          <label
                            key={categoryId}
                            className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
                              checked
                                ? "border-white/15 bg-slate-900 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePublicStockCategory(categoryId)}
                              className="sr-only"
                            />
                            <span
                              className={`mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full border px-1 transition ${
                                checked
                                  ? "justify-end border-white bg-slate-950/30"
                                  : "justify-start border-slate-300 bg-slate-100"
                              }`}
                            >
                              <span
                                className={`h-4 w-4 rounded-full transition ${
                                  checked
                                    ? "bg-white shadow-sm"
                                    : "border border-slate-300 bg-white"
                                }`}
                              />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{category.name}</p>
                              <p className={`mt-1 text-xs ${checked ? "text-white/75" : "text-slate-500"}`}>
                                {category.type || "General"}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {publicStockCategoryIds.map((categoryId) => {
                    const category = categories.find((entry) => String(entry._id || "") === categoryId);
                    if (!category) return null;

                    return (
                      <button
                        key={categoryId}
                        type="button"
                        onClick={() => togglePublicStockCategory(categoryId)}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-black"
                      >
                        <span>{category.name}</span>
                        <FiX className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <section className={sectionClass}>
              <h2 className="text-lg font-semibold text-black">Contact & Social</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  value={settings.contact.address}
                  onChange={(event) => updateNested("contact", "address", event.target.value)}
                  placeholder="Store address"
                  className={inputClass}
                />
                <input
                  value={settings.contact.addressLink}
                  onChange={(event) => updateNested("contact", "addressLink", event.target.value)}
                  placeholder="Google Maps link"
                  className={inputClass}
                />
                <input
                  value={settings.contact.phone1}
                  onChange={(event) => updateNested("contact", "phone1", event.target.value)}
                  placeholder="Primary phone"
                  className={inputClass}
                />
                <input
                  value={settings.contact.phone2}
                  onChange={(event) => updateNested("contact", "phone2", event.target.value)}
                  placeholder="Secondary phone"
                  className={inputClass}
                />
                <input
                  value={settings.contact.email}
                  onChange={(event) => updateNested("contact", "email", event.target.value)}
                  placeholder="Support email"
                  className={inputClass}
                />
                <input
                  value={settings.social.facebook}
                  onChange={(event) => updateNested("social", "facebook", event.target.value)}
                  placeholder="Facebook URL"
                  className={inputClass}
                />
                <input
                  value={settings.social.whatsapp}
                  onChange={(event) => updateNested("social", "whatsapp", event.target.value)}
                  placeholder="WhatsApp URL"
                  className={inputClass}
                />
                <input
                  value={settings.social.instagram}
                  onChange={(event) => updateNested("social", "instagram", event.target.value)}
                  placeholder="Instagram URL"
                  className={inputClass}
                />
                <input
                  value={settings.social.youtube}
                  onChange={(event) => updateNested("social", "youtube", event.target.value)}
                  placeholder="YouTube URL"
                  className={`${inputClass} md:col-span-2`}
                />
              </div>
            </section>

            <section className={sectionClass}>
              <h2 className="text-lg font-semibold text-black">Tracking & Pixels</h2>
              <p className="text-sm text-gray-600">
                These integrations are applied to the public storefront and landing experience through the shared app shell.
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  value={settings?.integrations?.facebookPixelId || ""}
                  onChange={(event) =>
                    updateNested("integrations", "facebookPixelId", event.target.value)
                  }
                  placeholder="Facebook Pixel ID"
                  className={inputClass}
                />
                <input
                  value={settings?.integrations?.googleAnalyticsId || ""}
                  onChange={(event) =>
                    updateNested("integrations", "googleAnalyticsId", event.target.value)
                  }
                  placeholder="Google Analytics ID"
                  className={inputClass}
                />
                <input
                  value={settings?.integrations?.gtmId || ""}
                  onChange={(event) =>
                    updateNested("integrations", "gtmId", event.target.value)
                  }
                  placeholder="Google Tag Manager ID"
                  className={inputClass}
                />
                <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={Boolean(settings?.integrations?.enableDataLayer)}
                    onChange={(event) =>
                      updateNested("integrations", "enableDataLayer", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Enable data layer events
                </label>
              </div>
              <textarea
                value={settings?.integrations?.customTrackingCode || ""}
                onChange={(event) =>
                  updateNested("integrations", "customTrackingCode", event.target.value)
                }
                placeholder="Custom tracking script"
                className={textareaClass}
              />
            </section>
          </div>

          <div className="grid grid-cols-1 gap-5">
            <section className={sectionClass}>
              <h2 className="text-lg font-semibold text-black">Policies & Footer</h2>
              <textarea
                value={settings.policies.shipmentPolicy}
                onChange={(event) => updateNested("policies", "shipmentPolicy", event.target.value)}
                placeholder="Shipment policy"
                className={textareaClass}
              />
              <textarea
                value={settings.policies.deliveryPolicy}
                onChange={(event) => updateNested("policies", "deliveryPolicy", event.target.value)}
                placeholder="Delivery policy"
                className={textareaClass}
              />
              <textarea
                value={settings.policies.termsConditions}
                onChange={(event) => updateNested("policies", "termsConditions", event.target.value)}
                placeholder="Terms and conditions"
                className={textareaClass}
              />
              <textarea
                value={settings.policies.returnPolicy}
                onChange={(event) => updateNested("policies", "returnPolicy", event.target.value)}
                placeholder="Return policy"
                className={textareaClass}
              />
              <textarea
                value={settings.policies.privacyPolicy}
                onChange={(event) => updateNested("policies", "privacyPolicy", event.target.value)}
                placeholder="Privacy policy"
                className={textareaClass}
              />
              <input
                value={settings?.storefront?.footerCaption || ""}
                onChange={(event) => updateNested("storefront", "footerCaption", event.target.value)}
                placeholder="Footer caption"
                className={inputClass}
              />
            </section>
          </div>

          <div className="app-panel flex justify-end p-4">
            <button
              type="submit"
              disabled={saving}
              className="app-btn-primary h-11 px-5 disabled:opacity-60"
            >
              <FiSave className="h-4 w-4" />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ModuleWebsiteSetup;
