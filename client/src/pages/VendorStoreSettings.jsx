import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const initialForm = {
  storeName: "",
  description: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "Bangladesh",
  logo: "",
  banner: "",
  seoTitle: "",
  seoDescription: "",
  openingHours: "",
  vacationMode: false,
  locationMapUrl: "",
  contactFormEnabled: true,
  storePrivacy: "public",
  socialLinks: {
    facebook: "",
    instagram: "",
    website: "",
  },
  storePolicies: {
    shippingPolicy: "",
    refundPolicy: "",
    privacyPolicy: "",
    termsConditions: "",
  },
};

const VendorStoreSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [vendorStatus, setVendorStatus] = useState("pending");
  const [hasProfile, setHasProfile] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchVendorProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/vendors/me/profile`, {
        headers: getAuthHeaders(),
      });
      const vendor = response.data?.vendor;
      if (!vendor) {
        setHasProfile(false);
        return;
      }

      setHasProfile(true);
      setVendorStatus(vendor.status || "pending");
      setForm({
        ...initialForm,
        ...vendor,
        socialLinks: {
          ...initialForm.socialLinks,
          ...(vendor.socialLinks || {}),
        },
        storePolicies: {
          ...initialForm.storePolicies,
          ...(vendor.storePolicies || {}),
        },
      });
    } catch {
      setHasProfile(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorProfile();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSocialChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      socialLinks: {
        ...(prev.socialLinks || {}),
        [key]: value,
      },
    }));
  };

  const submitApplyVendor = async () => {
    if (!String(form.storeName || "").trim()) {
      toast.error("Store name is required");
      return;
    }

    try {
      setSaving(true);
      await axios.post(
        `${baseUrl}/vendors/register`,
        {
          storeName: form.storeName,
          description: form.description,
          phone: form.phone || user?.phone || "",
          email: form.email || user?.email || "",
          address: form.address,
          city: form.city,
          country: form.country || "Bangladesh",
        },
        { headers: getAuthHeaders() },
      );

      toast.success("Vendor profile created and sent for approval");
      fetchVendorProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create vendor profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!String(form.storeName || "").trim()) {
      toast.error("Store name is required");
      return;
    }

    try {
      setSaving(true);
      await axios.put(
        `${baseUrl}/vendors/me/profile`,
        {
          storeName: form.storeName,
          description: form.description,
          email: form.email,
          phone: form.phone,
          address: form.address,
          city: form.city,
          country: form.country,
          logo: form.logo,
          banner: form.banner,
          seoTitle: form.seoTitle,
          seoDescription: form.seoDescription,
          openingHours: form.openingHours,
          vacationMode: Boolean(form.vacationMode),
          locationMapUrl: form.locationMapUrl,
          contactFormEnabled: Boolean(form.contactFormEnabled),
          storePrivacy: form.storePrivacy || "public",
          socialLinks: form.socialLinks || {},
          storePolicies: form.storePolicies || {},
        },
        { headers: getAuthHeaders() },
      );
      toast.success("Store settings updated");
      fetchVendorProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[220px]">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-cyan-900 to-black rounded-xl p-6 md:p-8 text-white">
        <h1 className="text-2xl md:text-3xl font-bold">Vendor Store Settings</h1>
        <p className="text-cyan-100 mt-2">
          Status: <span className="font-semibold uppercase">{vendorStatus}</span>
        </p>
      </div>

      {!hasProfile ? (
        <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
          <h2 className="text-lg font-semibold text-black mb-3">Create Vendor Profile</h2>
          <p className="text-sm text-gray-600 mb-4">
            Start your multi-vendor store by creating your vendor profile.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              name="storeName"
              value={form.storeName}
              onChange={handleChange}
              placeholder="Store name*"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Store email"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Store phone"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="City"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
          </div>
          <textarea
            name="description"
            rows={3}
            value={form.description}
            onChange={handleChange}
            placeholder="Store description"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg mb-4"
          />
          <button
            onClick={submitApplyVendor}
            disabled={saving}
            className="px-5 py-2.5 bg-black text-white rounded-lg font-medium disabled:opacity-60"
          >
            {saving ? "Submitting..." : "Apply As Vendor"}
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 space-y-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="storeName"
              value={form.storeName}
              onChange={handleChange}
              placeholder="Store name*"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Store email"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Store phone"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="City"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              name="country"
              value={form.country}
              onChange={handleChange}
              placeholder="Country"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              name="openingHours"
              value={form.openingHours}
              onChange={handleChange}
              placeholder="Opening hours (e.g. 10AM-10PM)"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              name="logo"
              value={form.logo}
              onChange={handleChange}
              placeholder="Logo URL"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              name="banner"
              value={form.banner}
              onChange={handleChange}
              placeholder="Banner URL"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
          </div>

          <textarea
            name="address"
            rows={2}
            value={form.address}
            onChange={handleChange}
            placeholder="Store address"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <textarea
            name="description"
            rows={3}
            value={form.description}
            onChange={handleChange}
            placeholder="Store description"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="seoTitle"
              value={form.seoTitle}
              onChange={handleChange}
              placeholder="SEO title"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              name="seoDescription"
              value={form.seoDescription}
              onChange={handleChange}
              placeholder="SEO description"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              name="locationMapUrl"
              value={form.locationMapUrl}
              onChange={handleChange}
              placeholder="Google Map URL (optional)"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <select
              name="storePrivacy"
              value={form.storePrivacy || "public"}
              onChange={handleChange}
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            >
              <option value="public">Public Store</option>
              <option value="private">Private Store</option>
            </select>
            <input
              value={form.socialLinks?.facebook || ""}
              onChange={(e) => handleSocialChange("facebook", e.target.value)}
              placeholder="Facebook URL"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              value={form.socialLinks?.instagram || ""}
              onChange={(e) => handleSocialChange("instagram", e.target.value)}
              placeholder="Instagram URL"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              value={form.socialLinks?.website || ""}
              onChange={(e) => handleSocialChange("website", e.target.value)}
              placeholder="Website URL"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="vacationMode"
              checked={Boolean(form.vacationMode)}
              onChange={handleChange}
            />
            Enable vacation mode
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700 ml-4">
            <input
              type="checkbox"
              name="contactFormEnabled"
              checked={Boolean(form.contactFormEnabled)}
              onChange={handleChange}
            />
            Enable store contact form
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <textarea
              rows={4}
              value={form.storePolicies?.shippingPolicy || ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  storePolicies: {
                    ...(prev.storePolicies || {}),
                    shippingPolicy: e.target.value,
                  },
                }))
              }
              placeholder="Shipping policy"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <textarea
              rows={4}
              value={form.storePolicies?.refundPolicy || ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  storePolicies: {
                    ...(prev.storePolicies || {}),
                    refundPolicy: e.target.value,
                  },
                }))
              }
              placeholder="Refund policy"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <textarea
              rows={4}
              value={form.storePolicies?.privacyPolicy || ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  storePolicies: {
                    ...(prev.storePolicies || {}),
                    privacyPolicy: e.target.value,
                  },
                }))
              }
              placeholder="Privacy policy"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <textarea
              rows={4}
              value={form.storePolicies?.termsConditions || ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  storePolicies: {
                    ...(prev.storePolicies || {}),
                    termsConditions: e.target.value,
                  },
                }))
              }
              placeholder="Terms & conditions"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-black text-white rounded-lg font-medium disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Store Settings"}
          </button>
        </form>
      )}
    </div>
  );
};

export default VendorStoreSettings;
