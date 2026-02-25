import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiRefreshCw } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const ModuleGeolocation = () => {
  const { user } = useAuth();
  const [vendorProfile, setVendorProfile] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [search, setSearch] = useState({ lat: "", lng: "", radiusKm: "10" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.userType === "admin";
  const isVendorSide = user?.userType === "vendor" || user?.userType === "staff";

  const fetchVendorProfile = async () => {
    if (!isVendorSide) {
      setVendorProfile(null);
      return;
    }

    const response = await axios.get(`${baseUrl}/vendors/me/profile`, {
      headers: getAuthHeaders(),
    });

    const profile = response.data?.vendor || null;
    setVendorProfile(profile);

    if (profile?.geoLocation) {
      setSearch((prev) => ({
        ...prev,
        lat: profile.geoLocation.lat ?? prev.lat,
        lng: profile.geoLocation.lng ?? prev.lng,
      }));
    }
  };

  const fetchAdminVendors = async () => {
    if (!isAdmin) {
      setVendors([]);
      return;
    }

    const response = await axios.get(`${baseUrl}/vendors/admin/all`, {
      headers: getAuthHeaders(),
    });

    setVendors(response.data?.vendors || []);
  };

  const refresh = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchVendorProfile(), fetchAdminVendors()]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load geolocation data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user]);

  const updateVendorLocation = async () => {
    if (!vendorProfile) return;

    try {
      setSaving(true);
      await axios.put(
        `${baseUrl}/vendors/me/profile`,
        {
          locationLat: search.lat === "" ? null : Number(search.lat),
          locationLng: search.lng === "" ? null : Number(search.lng),
          locationLabel: vendorProfile.geoLocation?.label || "",
          locationMapUrl: vendorProfile.locationMapUrl || "",
        },
        { headers: getAuthHeaders() },
      );

      toast.success("Vendor geolocation updated");
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update geolocation");
    } finally {
      setSaving(false);
    }
  };

  const searchNearby = async () => {
    const lat = Number(search.lat);
    const lng = Number(search.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error("Valid latitude and longitude are required");
      return;
    }

    try {
      const response = await axios.get(`${baseUrl}/vendors/nearby`, {
        params: {
          lat,
          lng,
          radiusKm: Number(search.radiusKm || 10),
        },
      });

      setNearby(response.data?.vendors || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch nearby vendors");
    }
  };

  const updateProfileField = (field, value) => {
    setVendorProfile((prev) => {
      if (!prev) return prev;
      if (field === "locationLabel") {
        return {
          ...prev,
          geoLocation: {
            ...(prev.geoLocation || {}),
            label: value,
          },
        };
      }

      if (field === "locationMapUrl") {
        return {
          ...prev,
          locationMapUrl: value,
        };
      }

      return prev;
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <h1 className="text-2xl font-bold">Geolocation Module</h1>
        <p className="text-zinc-200 mt-1">Store coordinates, map URL, and nearby vendor search.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">Location Search</h2>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="number"
            step="0.000001"
            value={search.lat}
            onChange={(event) => setSearch((prev) => ({ ...prev, lat: event.target.value }))}
            placeholder="Latitude"
            className="px-3 py-2.5 border border-gray-200 rounded-lg"
          />
          <input
            type="number"
            step="0.000001"
            value={search.lng}
            onChange={(event) => setSearch((prev) => ({ ...prev, lng: event.target.value }))}
            placeholder="Longitude"
            className="px-3 py-2.5 border border-gray-200 rounded-lg"
          />
          <input
            type="number"
            min="1"
            max="200"
            value={search.radiusKm}
            onChange={(event) => setSearch((prev) => ({ ...prev, radiusKm: event.target.value }))}
            placeholder="Radius (km)"
            className="px-3 py-2.5 border border-gray-200 rounded-lg"
          />
          <button
            onClick={searchNearby}
            className="px-5 py-2.5 bg-black text-white rounded-lg font-medium"
          >
            Search Nearby
          </button>
        </div>

        {nearby.length > 0 ? (
          <div className="mt-4 space-y-2">
            {nearby.map((vendor) => (
              <div key={vendor._id} className="border border-gray-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-black">{vendor.storeName}</p>
                <p className="text-gray-600">
                  {vendor.city || ""}, {vendor.country || ""} | Distance: {vendor.distanceKm} km
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {isVendorSide && vendorProfile && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-black">My Store Location</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              value={vendorProfile.geoLocation?.label || ""}
              onChange={(event) => updateProfileField("locationLabel", event.target.value)}
              placeholder="Location label"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              value={vendorProfile.locationMapUrl || ""}
              onChange={(event) => updateProfileField("locationMapUrl", event.target.value)}
              placeholder="Google map URL"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
          </div>

          <button
            onClick={updateVendorLocation}
            disabled={saving}
            className="px-5 py-2.5 bg-black text-white rounded-lg font-medium disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Geolocation"}
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
          <h2 className="text-lg font-semibold text-black mb-4">Vendor Coordinates ({vendors.length})</h2>
          {vendors.length === 0 ? (
            <p className="text-gray-600">No vendors found.</p>
          ) : (
            <div className="space-y-2">
              {vendors.map((vendor) => (
                <div
                  key={vendor._id}
                  className="border border-gray-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                >
                  <div>
                    <p className="font-medium text-black">{vendor.storeName}</p>
                    <p className="text-sm text-gray-600">Status: {vendor.status}</p>
                  </div>
                  <div className="text-sm text-gray-700">
                    Lat: {vendor.geoLocation?.lat ?? "N/A"}, Lng: {vendor.geoLocation?.lng ?? "N/A"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModuleGeolocation;
