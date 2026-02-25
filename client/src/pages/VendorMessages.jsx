import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiMail, FiRefreshCw } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const statusOptions = ["new", "read", "replied", "closed"];

const VendorMessages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/vendors/me/contact-messages`, {
        headers: getAuthHeaders(),
      });
      setMessages(response.data?.messages || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.userType === "vendor") {
      fetchMessages();
    }
  }, [user]);

  const updateStatus = async (messageId, status) => {
    try {
      setUpdatingId(messageId);
      await axios.patch(
        `${baseUrl}/vendors/me/contact-messages/${messageId}/status`,
        { status },
        { headers: getAuthHeaders() },
      );
      setMessages((prev) =>
        prev.map((message) =>
          message._id === messageId ? { ...message, status } : message,
        ),
      );
      toast.success("Message status updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingId("");
    }
  };

  if (user?.userType !== "vendor") {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Vendor Access Required</h2>
        <p className="text-gray-600">Only vendors can view store contact messages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-emerald-900 to-black rounded-xl p-6 md:p-8 text-white">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mb-4">
          <FiMail className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold">Vendor Messages</h1>
        <p className="text-emerald-100 mt-1">Customer contact requests sent to your store.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">Messages ({messages.length})</h2>
          <button
            onClick={fetchMessages}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-600">No customer messages yet.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-black">
                      {message.subject || "No subject"}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">{message.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      From: {message.name} ({message.email})
                      {message.phone ? ` | ${message.phone}` : ""}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(message.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-full md:w-44">
                    <select
                      value={message.status}
                      onChange={(event) => updateStatus(message._id, event.target.value)}
                      disabled={updatingId === message._id}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorMessages;
