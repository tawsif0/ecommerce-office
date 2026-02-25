import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiRefreshCw } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const initialForm = {
  verificationType: "mixed",
  businessName: "",
  tradeLicenseNo: "",
  nationalIdNo: "",
  tinNo: "",
  address: "",
  documentsText: "",
  facebook: "",
  instagram: "",
  youtube: "",
  website: "",
};

const ModuleVerifications = () => {
  const { user } = useAuth();
  const [myVerification, setMyVerification] = useState(null);
  const [adminList, setAdminList] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [selectedReviewId, setSelectedReviewId] = useState("");

  const isAdmin = user?.userType === "admin";
  const canSubmit = user?.userType === "vendor" || user?.userType === "staff";

  const parsedDocuments = useMemo(() => {
    return String(form.documentsText || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, ...rest] = line.split("|");
        const url = rest.join("|").trim();
        return {
          label: String(label || "Document").trim(),
          url: url || String(label || "").trim(),
        };
      })
      .filter((item) => item.url);
  }, [form.documentsText]);

  const fetchMine = async () => {
    const response = await axios.get(`${baseUrl}/verifications/me`, {
      headers: getAuthHeaders(),
    });

    const verification = response.data?.verification || null;
    setMyVerification(verification);

    if (verification) {
      setForm({
        verificationType: verification.verificationType || "mixed",
        businessName: verification.businessName || "",
        tradeLicenseNo: verification.tradeLicenseNo || "",
        nationalIdNo: verification.nationalIdNo || "",
        tinNo: verification.tinNo || "",
        address: verification.address || "",
        documentsText: (verification.documents || [])
          .map((doc) => `${doc.label || "Document"}|${doc.url || ""}`)
          .join("\n"),
        facebook: verification.socialProfiles?.facebook || "",
        instagram: verification.socialProfiles?.instagram || "",
        youtube: verification.socialProfiles?.youtube || "",
        website: verification.socialProfiles?.website || "",
      });
    }
  };

  const fetchAdmin = async () => {
    const response = await axios.get(`${baseUrl}/verifications/admin`, {
      headers: getAuthHeaders(),
    });

    setAdminList(response.data?.verifications || []);
  };

  const refresh = async () => {
    try {
      setLoading(true);
      if (isAdmin) {
        await fetchAdmin();
      } else if (canSubmit) {
        await fetchMine();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load verification data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user]);

  const handleInput = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const submitVerification = async (submitForReview) => {
    try {
      setSaving(true);
      await axios.post(
        `${baseUrl}/verifications/me`,
        {
          verificationType: form.verificationType,
          businessName: form.businessName.trim(),
          tradeLicenseNo: form.tradeLicenseNo.trim(),
          nationalIdNo: form.nationalIdNo.trim(),
          tinNo: form.tinNo.trim(),
          address: form.address.trim(),
          documents: parsedDocuments,
          socialProfiles: {
            facebook: form.facebook.trim(),
            instagram: form.instagram.trim(),
            youtube: form.youtube.trim(),
            website: form.website.trim(),
          },
          submitForReview,
        },
        { headers: getAuthHeaders() },
      );
      toast.success(submitForReview ? "Submitted for review" : "Draft saved");
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit verification");
    } finally {
      setSaving(false);
    }
  };

  const reviewVerification = async (id, status) => {
    try {
      await axios.patch(
        `${baseUrl}/verifications/admin/${id}/status`,
        {
          status,
          adminNote: adminNote.trim(),
        },
        { headers: getAuthHeaders() },
      );
      toast.success("Verification reviewed");
      setSelectedReviewId("");
      setAdminNote("");
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to review verification");
    }
  };

  if (!isAdmin && !canSubmit) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Access Required</h2>
        <p className="text-gray-600">Only admin/vendor/staff can use verification module.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <h1 className="text-2xl font-bold">Vendor Verification</h1>
        <p className="text-zinc-200 mt-1">Manage KYC and social verification workflow.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">
            {isAdmin ? `Verification Requests (${adminList.length})` : "My Verification"}
          </h2>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {isAdmin ? (
          adminList.length === 0 ? (
            <p className="text-gray-600">No verification requests found.</p>
          ) : (
            <div className="space-y-3">
              {adminList.map((item) => (
                <div
                  key={item._id}
                  className="border border-gray-200 rounded-lg p-4 grid grid-cols-1 xl:grid-cols-12 gap-3"
                >
                  <div className="xl:col-span-5">
                    <p className="font-semibold text-black">{item.vendor?.storeName || "Vendor"}</p>
                    <p className="text-sm text-gray-600">Type: {item.verificationType}</p>
                    <p className="text-sm text-gray-600">Business: {item.businessName || "N/A"}</p>
                    <p className="text-xs text-gray-500 mt-1">Status: {item.status}</p>
                  </div>

                  <div className="xl:col-span-4 text-sm text-gray-600">
                    <p>Trade License: {item.tradeLicenseNo || "N/A"}</p>
                    <p>NID: {item.nationalIdNo || "N/A"}</p>
                    <p>TIN: {item.tinNo || "N/A"}</p>
                    <p>Documents: {(item.documents || []).length}</p>
                  </div>

                  <div className="xl:col-span-3 space-y-2">
                    <textarea
                      value={selectedReviewId === item._id ? adminNote : ""}
                      onChange={(event) => {
                        setSelectedReviewId(item._id);
                        setAdminNote(event.target.value);
                      }}
                      rows={2}
                      placeholder="Admin note"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => reviewVerification(item._id, "approved")}
                        className="px-3 py-2 text-xs bg-green-600 text-white rounded-lg"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reviewVerification(item._id, "rejected")}
                        className="px-3 py-2 text-xs bg-red-600 text-white rounded-lg"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => reviewVerification(item._id, "pending")}
                        className="px-3 py-2 text-xs border border-gray-300 rounded-lg"
                      >
                        Pending
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-4">
            {myVerification && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                Current status: <span className="font-semibold text-black">{myVerification.status}</span>
                {myVerification.adminNote ? ` | Note: ${myVerification.adminNote}` : ""}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <select
                name="verificationType"
                value={form.verificationType}
                onChange={handleInput}
                className="px-3 py-2.5 border border-gray-200 rounded-lg"
              >
                <option value="mixed">Mixed</option>
                <option value="nid">NID</option>
                <option value="trade_license">Trade License</option>
                <option value="social">Social</option>
              </select>
              <input
                name="businessName"
                value={form.businessName}
                onChange={handleInput}
                placeholder="Business name"
                className="px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <input
                name="tradeLicenseNo"
                value={form.tradeLicenseNo}
                onChange={handleInput}
                placeholder="Trade license no"
                className="px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <input
                name="nationalIdNo"
                value={form.nationalIdNo}
                onChange={handleInput}
                placeholder="NID no"
                className="px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <input
                name="tinNo"
                value={form.tinNo}
                onChange={handleInput}
                placeholder="TIN no"
                className="px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <input
                name="address"
                value={form.address}
                onChange={handleInput}
                placeholder="Address"
                className="px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <input
                name="facebook"
                value={form.facebook}
                onChange={handleInput}
                placeholder="Facebook URL"
                className="px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <input
                name="instagram"
                value={form.instagram}
                onChange={handleInput}
                placeholder="Instagram URL"
                className="px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <input
                name="youtube"
                value={form.youtube}
                onChange={handleInput}
                placeholder="YouTube URL"
                className="px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <input
                name="website"
                value={form.website}
                onChange={handleInput}
                placeholder="Website"
                className="px-3 py-2.5 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="text-sm text-gray-700 block mb-1">
                Documents (one per line: label|url)
              </label>
              <textarea
                name="documentsText"
                value={form.documentsText}
                onChange={handleInput}
                rows={4}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => submitVerification(false)}
                disabled={saving}
                className="px-5 py-2.5 border border-gray-300 rounded-lg"
              >
                Save Draft
              </button>
              <button
                onClick={() => submitVerification(true)}
                disabled={saving}
                className="px-5 py-2.5 bg-black text-white rounded-lg font-medium disabled:opacity-60"
              >
                Submit For Review
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleVerifications;
