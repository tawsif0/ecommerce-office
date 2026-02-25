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

const statusOptions = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
];

const ModuleBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.userType === "admin";
  const isVendorSide = user?.userType === "vendor" || user?.userType === "staff";

  const fetchBookings = async () => {
    try {
      setLoading(true);

      let endpoint = `${baseUrl}/bookings/me`;
      if (isAdmin) endpoint = `${baseUrl}/bookings/admin`;
      if (isVendorSide) endpoint = `${baseUrl}/bookings/vendor`;

      const response = await axios.get(endpoint, {
        headers: getAuthHeaders(),
      });
      setBookings(response.data?.bookings || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchBookings();
  }, [user]);

  const updateStatus = async (bookingId, status) => {
    try {
      await axios.patch(
        `${baseUrl}/bookings/${bookingId}/status`,
        { status },
        { headers: getAuthHeaders() },
      );
      toast.success("Booking status updated");
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update booking");
    }
  };

  const canManageStatus = isAdmin || isVendorSide;

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <h1 className="text-2xl font-bold">Booking Management</h1>
        <p className="text-zinc-200 mt-1">
          Track service and appointment bookings with status controls.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">Bookings ({bookings.length})</h2>
          <button
            onClick={fetchBookings}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600">Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <p className="text-gray-600">No bookings found.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div
                key={booking._id}
                className="border border-gray-200 rounded-lg p-4 grid grid-cols-1 xl:grid-cols-12 gap-3 items-center"
              >
                <div className="xl:col-span-4">
                  <p className="font-semibold text-black">{booking.bookingNumber}</p>
                  <p className="text-sm text-gray-600">
                    {booking.product?.title || "Service Booking"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Date: {booking.appointmentDate ? new Date(booking.appointmentDate).toLocaleString() : "N/A"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Slot: {booking.appointmentSlot || "N/A"}
                  </p>
                </div>

                <div className="xl:col-span-3">
                  <p className="text-sm text-gray-700">
                    Vendor: {booking.vendor?.storeName || "N/A"}
                  </p>
                  <p className="text-sm text-gray-700">
                    Customer: {booking.customer?.name || booking.guestInfo?.name || "Guest"}
                  </p>
                  <p className="text-sm text-gray-700">
                    Phone: {booking.guestInfo?.phone || booking.customer?.phone || "N/A"}
                  </p>
                </div>

                <div className="xl:col-span-2">
                  <p className="text-sm text-gray-700">Amount: {booking.total || 0} TK</p>
                  <p className="text-sm text-gray-700">Type: {booking.bookingType}</p>
                  <p className="text-sm text-gray-700">Payment: {booking.paymentStatus}</p>
                </div>

                <div className="xl:col-span-3">
                  {canManageStatus ? (
                    <select
                      value={booking.status}
                      onChange={(event) => updateStatus(booking._id, event.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="inline-flex px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-700">
                      {booking.status}
                    </span>
                  )}
                  {booking.notes ? (
                    <p className="text-xs text-gray-500 mt-2">Note: {booking.notes}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleBookings;
