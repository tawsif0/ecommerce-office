import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiGlobe, FiSave, FiSettings } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import {
  fetchPublicSettings,
  getDefaultPublicSettings,
  invalidatePublicSettingsCache,
} from "../utils/publicSettings";

const baseUrl = import.meta.env.VITE_API_URL;

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const parseListInput = (value) =>
  Array.from(
    new Set(
      String(value || "")
        .split(/[\n,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );

const ModuleWebsiteSetup = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(() => getDefaultPublicSettings());

  const isAdmin = useMemo(
    () => String(user?.userType || "").toLowerCase() === "admin",
    [user?.userType],
  );
  const isSingleVendorMode =
    String(settings.marketplaceMode || "multi").trim().toLowerCase() === "single";

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;

    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${baseUrl}/auth/admin/settings`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (cancelled) return;

        const defaults = getDefaultPublicSettings();
        const payload = response.data || {};
        const normalizedMarketplaceMode =
          String(
            payload?.marketplace?.marketplaceMode ||
              payload?.marketplaceMode ||
              defaults.marketplaceMode,
          )
            .trim()
            .toLowerCase() === "single"
            ? "single"
            : "multi";
        const vendorRegistrationSource =
          payload?.marketplace?.vendorRegistrationEnabled === undefined
            ? payload?.vendorRegistrationEnabled
            : payload.marketplace.vendorRegistrationEnabled;
        const vendorRegistrationEnabled =
          normalizedMarketplaceMode === "single"
            ? false
            : vendorRegistrationSource === undefined
              ? defaults.vendorRegistrationEnabled
              : Boolean(vendorRegistrationSource);

        const normalized = {
          ...defaults,
          marketplaceMode: normalizedMarketplaceMode,
          vendorRegistrationEnabled,
          website: {
            ...defaults.website,
            ...(payload.website || {}),
          },
          contact: {
            ...defaults.contact,
            ...(payload.contact || {}),
          },
          social: {
            ...defaults.social,
            ...(payload.social || {}),
          },
          policies: {
            ...defaults.policies,
            ...(payload.policies || {}),
          },
          integrations: {
            ...defaults.integrations,
            ...(payload.integrations || {}),
          },
          invoice: {
            ...defaults.invoice,
            ...(payload.invoice || {}),
          },
          courier: {
            ...defaults.courier,
            ...(payload.courier || {}),
          },
          locations: {
            ...defaults.locations,
            ...(payload.locations || {}),
            cityOptions: Array.isArray(payload?.locations?.cityOptions)
              ? payload.locations.cityOptions
              : defaults.locations.cityOptions,
            subCityOptions: Array.isArray(payload?.locations?.subCityOptions)
              ? payload.locations.subCityOptions
              : defaults.locations.subCityOptions,
          },
        };

        setSettings(normalized);
      } catch (error) {
        toast.error(error.response?.data?.error || "Failed to load website settings");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const updateNested = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [key]: value,
      },
    }));
  };

  const saveSettings = async (event) => {
    event.preventDefault();

    setSaving(true);
    try {
      const normalizedMarketplaceMode =
        String(settings.marketplaceMode || "multi").toLowerCase() === "single"
          ? "single"
          : "multi";
      const normalizedVendorRegistrationEnabled =
        normalizedMarketplaceMode === "single"
          ? false
          : Boolean(settings.vendorRegistrationEnabled);

      const payload = {
        marketplace: {
          marketplaceMode: normalizedMarketplaceMode,
          vendorRegistrationEnabled: normalizedVendorRegistrationEnabled,
        },
        marketplaceMode: normalizedMarketplaceMode,
        vendorRegistrationEnabled: normalizedVendorRegistrationEnabled,
        website: deepClone(settings.website || {}),
        contact: deepClone(settings.contact || {}),
        social: deepClone(settings.social || {}),
        policies: deepClone(settings.policies || {}),
        integrations: deepClone(settings.integrations || {}),
        invoice: deepClone(settings.invoice || {}),
        courier: deepClone(settings.courier || {}),
        locations: deepClone(settings.locations || {}),
      };

      const response = await axios.put(`${baseUrl}/auth/admin/settings`, payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const responseSettings = response?.data?.settings || {};
      const responseMarketplaceMode =
        String(
          responseSettings?.marketplace?.marketplaceMode ||
            responseSettings?.marketplaceMode ||
            normalizedMarketplaceMode,
        )
          .trim()
          .toLowerCase() === "single"
          ? "single"
          : "multi";
      const responseVendorSource =
        responseSettings?.marketplace?.vendorRegistrationEnabled === undefined
          ? responseSettings?.vendorRegistrationEnabled
          : responseSettings.marketplace.vendorRegistrationEnabled;
      const responseVendorRegistrationEnabled =
        responseMarketplaceMode === "single"
          ? false
          : responseVendorSource === undefined
            ? normalizedVendorRegistrationEnabled
            : Boolean(responseVendorSource);

      setSettings((prev) => ({
        ...prev,
        marketplaceMode: responseMarketplaceMode,
        vendorRegistrationEnabled: responseVendorRegistrationEnabled,
      }));

      invalidatePublicSettingsCache();
      await fetchPublicSettings({ force: true });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("publicSettingsUpdated"));
      }
      toast.success(response.data?.message || "Settings saved");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Admin Access Required</h2>
        <p className="text-gray-600">Only admin can manage website and system settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mb-4">
          <FiSettings className="w-6 h-6" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Website Setup & Config</h1>
        <p className="text-zinc-200 mt-2">
          Control brand details, policies, tracking integrations, courier config, and marketplace mode.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-600">Loading settings...</p>
        </div>
      ) : (
        <form onSubmit={saveSettings} className="space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
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
              <input
                value={settings.website.logoUrl}
                onChange={(event) => updateNested("website", "logoUrl", event.target.value)}
                placeholder="Logo URL"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
              />
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
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        marketplaceMode:
                          String(event.target.value || "").toLowerCase() === "single"
                            ? "single"
                            : "multi",
                        vendorRegistrationEnabled:
                          String(event.target.value || "").toLowerCase() === "single"
                            ? false
                            : prev.vendorRegistrationEnabled,
                      }))
                    }
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  >
                    <option value="multi">Multi Vendor</option>
                    <option value="single">Single Vendor</option>
                  </select>
                </label>

                <label className="flex items-center gap-2 mt-6 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.vendorRegistrationEnabled)}
                    disabled={isSingleVendorMode}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        vendorRegistrationEnabled: event.target.checked,
                      }))
                    }
                  />
                  {isSingleVendorMode
                    ? "Vendor registration is disabled in single vendor mode"
                    : "Allow vendor registration"}
                </label>
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
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
            <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
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

            <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
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

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center gap-2 px-5 bg-black text-white rounded-lg font-medium disabled:opacity-60"
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
