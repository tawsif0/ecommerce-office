import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchPublicSettings } from "../../utils/publicSettings";

const POLICY_MAP = {
  shipment: {
    title: "Shipment Policy",
    key: "shipmentPolicy",
  },
  delivery: {
    title: "Delivery Policy",
    key: "deliveryPolicy",
  },
  terms: {
    title: "Terms & Conditions",
    key: "termsConditions",
  },
  return: {
    title: "Return Policy",
    key: "returnPolicy",
  },
  privacy: {
    title: "Privacy Policy",
    key: "privacyPolicy",
  },
};

const PolicyPage = () => {
  const { policyType } = useParams();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  const policy = useMemo(() => POLICY_MAP[String(policyType || "").toLowerCase()] || null, [policyType]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchPublicSettings();
        if (!cancelled) {
          setSettings(data);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!policy) {
    return (
      <section className="min-h-screen bg-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-black">Policy Not Found</h1>
          <p className="text-gray-600 mt-2">Requested policy page is not available.</p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="min-h-screen bg-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-gray-600">Loading policy...</p>
        </div>
      </section>
    );
  }

  const content = String(settings?.policies?.[policy.key] || "").trim();

  return (
    <section className="min-h-screen bg-white py-12">
      <div className="max-w-4xl mx-auto px-4 space-y-4">
        <Link to="/" className="text-sm text-gray-600 hover:text-black">
          Back to home
        </Link>
        <h1 className="text-3xl font-bold text-black">{policy.title}</h1>
        <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
          {content ? (
            <div className="prose max-w-none whitespace-pre-line text-gray-700">
              {content}
            </div>
          ) : (
            <p className="text-gray-600">This policy has not been configured yet.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default PolicyPage;
