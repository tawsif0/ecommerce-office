import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FiBarChart2,
  FiDownload,
  FiFilter,
  FiRefreshCw,
  FiXCircle,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const escapeCsv = (value) => {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const downloadCsvFile = (fileName, rows) => {
  const csv = rows.map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const AdminVendorReports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalVendors: 0,
    totalOrders: 0,
    grossSales: 0,
    commissionTotal: 0,
    netEarnings: 0,
  });
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
  });
  const [isApplying, setIsApplying] = useState(false);

  const fetchReports = async (overrideFilters = {}) => {
    const appliedFrom =
      overrideFilters.from !== undefined ? overrideFilters.from : filters.from;
    const appliedTo =
      overrideFilters.to !== undefined ? overrideFilters.to : filters.to;

    try {
      setLoading(true);
      const params = {};
      if (appliedFrom) params.from = appliedFrom;
      if (appliedTo) params.to = appliedTo;

      const response = await axios.get(`${baseUrl}/vendors/admin/reports`, {
        headers: getAuthHeaders(),
        params,
      });

      setSummary(response.data?.summary || {});
      setReports(response.data?.vendorReports || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load vendor reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.userType === "admin") {
      fetchReports();
    }
  }, [user]);

  const handleApplyFilters = async () => {
    try {
      setIsApplying(true);
      await fetchReports();
    } finally {
      setIsApplying(false);
    }
  };

  const handleClearFilters = async () => {
    const reset = { from: "", to: "" };
    setFilters(reset);
    try {
      setIsApplying(true);
      await fetchReports(reset);
    } finally {
      setIsApplying(false);
    }
  };

  const handleDownloadReport = () => {
    if (!reports.length) {
      toast.error("No report rows to download");
      return;
    }

    const rangeLabel =
      filters.from || filters.to
        ? `${filters.from || "start"}_to_${filters.to || "today"}`
        : "all_time";

    const generatedAt = new Date().toLocaleString();
    const rows = [
      ["Vendor Performance Report"],
      ["Generated At", generatedAt],
      ["From", filters.from || "N/A"],
      ["To", filters.to || "N/A"],
      [],
      ["Summary"],
      ["Total Vendors", summary.totalVendors || 0],
      ["Total Orders", summary.totalOrders || 0],
      ["Gross Sales (TK)", Number(summary.grossSales || 0).toFixed(2)],
      ["Commission (TK)", Number(summary.commissionTotal || 0).toFixed(2)],
      ["Net Earnings (TK)", Number(summary.netEarnings || 0).toFixed(2)],
      [],
      ["Rows"],
      [
        "Vendor",
        "Slug",
        "Status",
        "Orders",
        "Pending",
        "Delivered",
        "Gross Sales (TK)",
        "Commission (TK)",
        "Net Earnings (TK)",
      ],
      ...reports.map((row) => [
        row.storeName || "",
        row.slug || "",
        row.status || "",
        Number(row.totalOrders || 0),
        Number(row.pendingOrders || 0),
        Number(row.deliveredOrders || 0),
        Number(row.grossSales || 0).toFixed(2),
        Number(row.commissionTotal || 0).toFixed(2),
        Number(row.netEarnings || 0).toFixed(2),
      ]),
    ];

    downloadCsvFile(`vendor-reports-${rangeLabel}.csv`, rows);
    toast.success("Vendor report downloaded");
  };

  const handleDownloadPdf = () => {
    if (!reports.length) {
      toast.error("No report rows to download");
      return;
    }

    const rangeLabel =
      filters.from || filters.to
        ? `${filters.from || "start"}_to_${filters.to || "today"}`
        : "all_time";

    const generatedAt = new Date().toLocaleString();
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });

    doc.setFontSize(18);
    doc.text("Vendor Performance Report", 40, 40);
    doc.setFontSize(10);
    doc.text(`Generated: ${generatedAt}`, 40, 60);
    doc.text(`From: ${filters.from || "N/A"}  To: ${filters.to || "N/A"}`, 40, 74);

    autoTable(doc, {
      startY: 90,
      head: [["Metric", "Value"]],
      body: [
        ["Total Vendors", Number(summary.totalVendors || 0)],
        ["Total Orders", Number(summary.totalOrders || 0)],
        ["Gross Sales (TK)", Number(summary.grossSales || 0).toFixed(2)],
        ["Commission (TK)", Number(summary.commissionTotal || 0).toFixed(2)],
        ["Net Earnings (TK)", Number(summary.netEarnings || 0).toFixed(2)],
      ],
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [17, 24, 39] },
      margin: { left: 40, right: 40 },
      tableWidth: 320,
    });

    autoTable(doc, {
      startY: (doc.lastAutoTable?.finalY || 90) + 18,
      head: [
        [
          "Vendor",
          "Slug",
          "Status",
          "Orders",
          "Pending",
          "Delivered",
          "Gross (TK)",
          "Commission (TK)",
          "Net (TK)",
        ],
      ],
      body: reports.map((row) => [
        row.storeName || "",
        row.slug || "",
        row.status || "",
        Number(row.totalOrders || 0),
        Number(row.pendingOrders || 0),
        Number(row.deliveredOrders || 0),
        Number(row.grossSales || 0).toFixed(2),
        Number(row.commissionTotal || 0).toFixed(2),
        Number(row.netEarnings || 0).toFixed(2),
      ]),
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 4 },
      headStyles: { fillColor: [17, 24, 39] },
      margin: { left: 40, right: 40 },
    });

    doc.save(`vendor-reports-${rangeLabel}.pdf`);
    toast.success("Vendor PDF downloaded");
  };

  if (user?.userType !== "admin") {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Admin Access Required</h2>
        <p className="text-gray-600">Only admins can view vendor performance reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mb-4">
          <FiBarChart2 className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold">Vendor Performance Reports</h1>
        <p className="text-zinc-200 mt-1">
          Sales, commission and net earnings across all vendors.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
            <FiFilter className="w-4 h-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-black">Report Filters</p>
            <p className="text-xs text-gray-500">
              Apply date range to view vendor performance for a specific period.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-linear-to-br from-white to-gray-50 p-4 mb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full lg:max-w-2xl">
              <label className="block">
                <span className="text-xs font-medium text-gray-600 mb-1 block">From Date</span>
                <input
                  type="date"
                  value={filters.from}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, from: event.target.value }))
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600 mb-1 block">To Date</span>
                <input
                  type="date"
                  value={filters.to}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, to: event.target.value }))
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={handleApplyFilters}
                disabled={isApplying}
                className="inline-flex h-10 items-center justify-center gap-2 px-4 bg-black text-white rounded-lg font-medium whitespace-nowrap disabled:opacity-60"
              >
                <FiRefreshCw className={`w-4 h-4 ${isApplying ? "animate-spin" : ""}`} />
                Apply Filters
              </button>
              <button
                onClick={handleClearFilters}
                disabled={isApplying}
                className="inline-flex h-10 items-center justify-center gap-2 px-4 border border-gray-300 rounded-lg font-medium whitespace-nowrap hover:bg-gray-100 disabled:opacity-60"
              >
                <FiXCircle className="w-4 h-4" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500">Total Vendors</p>
            <p className="text-xl font-semibold text-black mt-1">{summary.totalVendors || 0}</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500">Total Orders</p>
            <p className="text-xl font-semibold text-black mt-1">{summary.totalOrders || 0}</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500">Gross Sales</p>
            <p className="text-xl font-semibold text-black mt-1">
              {Number(summary.grossSales || 0).toFixed(2)} TK
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500">Commission</p>
            <p className="text-xl font-semibold text-black mt-1">
              {Number(summary.commissionTotal || 0).toFixed(2)} TK
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500">Vendor Net Earnings</p>
            <p className="text-xl font-semibold text-black mt-1">
              {Number(summary.netEarnings || 0).toFixed(2)} TK
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold text-black">
            Vendor Report Rows ({reports.length})
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadReport}
              disabled={loading || reports.length === 0}
              className="inline-flex h-10 items-center justify-center gap-2 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-60"
            >
              <FiDownload className="w-4 h-4" />
              Download CSV
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={loading || reports.length === 0}
              className="inline-flex h-10 items-center justify-center gap-2 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-60"
            >
              <FiDownload className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>
        {loading ? (
          <p className="text-gray-600">Loading reports...</p>
        ) : reports.length === 0 ? (
          <p className="text-gray-600">No report data found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="py-2 pr-3">Vendor</th>
                  <th className="py-2 pr-3">Orders</th>
                  <th className="py-2 pr-3">Pending</th>
                  <th className="py-2 pr-3">Delivered</th>
                  <th className="py-2 pr-3">Gross</th>
                  <th className="py-2 pr-3">Commission</th>
                  <th className="py-2 pr-3">Net</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((row) => (
                  <tr key={row.vendorId} className="border-b border-gray-100">
                    <td className="py-2 pr-3">
                      <p className="font-medium text-black">{row.storeName}</p>
                      <p className="text-xs text-gray-500">@{row.slug}</p>
                    </td>
                    <td className="py-2 pr-3">{row.totalOrders}</td>
                    <td className="py-2 pr-3">{row.pendingOrders}</td>
                    <td className="py-2 pr-3">{row.deliveredOrders}</td>
                    <td className="py-2 pr-3">{Number(row.grossSales || 0).toFixed(2)} TK</td>
                    <td className="py-2 pr-3">
                      {Number(row.commissionTotal || 0).toFixed(2)} TK
                    </td>
                    <td className="py-2 pr-3">{Number(row.netEarnings || 0).toFixed(2)} TK</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminVendorReports;
