import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  FiMail,
  FiRefreshCw,
  FiSend,
  FiMessageSquare,
  FiUser,
  FiShoppingBag,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getShortPreview = (message, max = 90) => {
  const text = String(message || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
};

const VendorMessages = () => {
  const { user } = useAuth();
  const userRole = String(user?.userType || "").toLowerCase();
  const isCustomer = userRole === "user";
  const isVendorSide = userRole === "vendor" || userRole === "staff";

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [newConversation, setNewConversation] = useState({
    vendorId: "",
    subject: "",
    message: "",
  });

  const selectedConversationUnreadCount = useMemo(() => {
    if (!selectedConversation) return 0;
    if (isVendorSide) return Number(selectedConversation.unreadByVendor || 0);
    return Number(selectedConversation.unreadByCustomer || 0);
  }, [selectedConversation, isVendorSide]);

  const fetchConversations = async (preferredId = "") => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/vendor-messages`, {
        headers: getAuthHeaders(),
      });
      const rows = response.data?.conversations || [];
      setConversations(rows);

      const nextId = preferredId || selectedConversationId || rows[0]?._id || "";
      setSelectedConversationId(nextId);
      if (nextId) {
        await fetchConversationDetail(nextId);
      } else {
        setSelectedConversation(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load conversations");
      setConversations([]);
      setSelectedConversation(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationDetail = async (conversationId) => {
    if (!conversationId) {
      setSelectedConversation(null);
      return;
    }

    try {
      setDetailLoading(true);
      const response = await axios.get(`${baseUrl}/vendor-messages/${conversationId}`, {
        headers: getAuthHeaders(),
      });
      setSelectedConversation(response.data?.conversation || null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load conversation");
      setSelectedConversation(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchVendorsForCustomer = async () => {
    if (!isCustomer) return;
    try {
      const response = await axios.get(`${baseUrl}/vendors`);
      const rows = response.data?.vendors || response.data?.data || response.data || [];
      setVendors(Array.isArray(rows) ? rows : []);
    } catch (_error) {
      setVendors([]);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchConversations();
    fetchVendorsForCustomer();
  }, [user]);

  const handleSelectConversation = async (conversationId) => {
    setSelectedConversationId(conversationId);
    await fetchConversationDetail(conversationId);
  };

  const handleReply = async () => {
    const text = String(replyMessage || "").trim();
    if (!selectedConversation?._id) return;
    if (!text) {
      toast.error("Reply message is required");
      return;
    }

    try {
      setSendingReply(true);
      await axios.post(
        `${baseUrl}/vendor-messages/${selectedConversation._id}/reply`,
        { message: text },
        { headers: getAuthHeaders() },
      );
      setReplyMessage("");
      await fetchConversations(selectedConversation._id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    if (!selectedConversation?._id) return;
    try {
      setUpdatingStatus(true);
      await axios.patch(
        `${baseUrl}/vendor-messages/${selectedConversation._id}/status`,
        { status },
        { headers: getAuthHeaders() },
      );
      await fetchConversations(selectedConversation._id);
      toast.success("Conversation status updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCreateConversation = async (event) => {
    event.preventDefault();

    const payload = {
      vendorId: String(newConversation.vendorId || "").trim(),
      subject: String(newConversation.subject || "").trim(),
      message: String(newConversation.message || "").trim(),
    };

    if (!payload.vendorId) {
      toast.error("Please select a vendor");
      return;
    }
    if (!payload.message) {
      toast.error("Please write your message");
      return;
    }

    try {
      setCreatingConversation(true);
      const response = await axios.post(`${baseUrl}/vendor-messages`, payload, {
        headers: getAuthHeaders(),
      });
      const conversationId = response.data?.conversation?._id || "";
      setNewConversation({ vendorId: "", subject: "", message: "" });
      toast.success("Message sent to vendor");
      await fetchConversations(conversationId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to start conversation");
    } finally {
      setCreatingConversation(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Login Required</h2>
        <p className="text-gray-600">Please login to access vendor messaging.</p>
      </div>
    );
  }

  if (!["user", "vendor", "staff", "admin"].includes(userRole)) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Access Required</h2>
        <p className="text-gray-600">Your account type cannot access vendor messaging.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mb-4">
          <FiMail className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold">Vendor Messaging</h1>
        <p className="text-zinc-200 mt-1">
          Direct customer-vendor conversation inbox for smooth support.
        </p>
      </div>

      {isCustomer && (
        <form
          onSubmit={handleCreateConversation}
          className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-black">Start New Conversation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={newConversation.vendorId}
              onChange={(event) =>
                setNewConversation((prev) => ({ ...prev, vendorId: event.target.value }))
              }
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">Select vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor._id} value={vendor._id}>
                  {vendor.storeName || "Vendor"} ({vendor.slug || "store"})
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newConversation.subject}
              onChange={(event) =>
                setNewConversation((prev) => ({ ...prev, subject: event.target.value }))
              }
              placeholder="Subject (optional)"
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <textarea
            value={newConversation.message}
            onChange={(event) =>
              setNewConversation((prev) => ({ ...prev, message: event.target.value }))
            }
            rows={3}
            placeholder="Write your message to vendor..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
          />
          <button
            type="submit"
            disabled={creatingConversation}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-60"
          >
            <FiSend className="w-4 h-4" />
            {creatingConversation ? "Sending..." : "Send Message"}
          </button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">
            Conversations ({conversations.length})
          </h2>
          <button
            type="button"
            onClick={() => fetchConversations(selectedConversationId)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-4 border border-gray-200 rounded-lg max-h-[520px] overflow-auto">
            {loading ? (
              <p className="p-4 text-sm text-gray-600">Loading conversations...</p>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-gray-600">No conversations yet.</p>
            ) : (
              conversations.map((item) => {
                const lastMessage = item.messages?.[item.messages.length - 1];
                const unread = isVendorSide
                  ? Number(item.unreadByVendor || 0)
                  : Number(item.unreadByCustomer || 0);

                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => handleSelectConversation(item._id)}
                    className={`w-full text-left p-3 border-b border-gray-100 transition-colors ${
                      selectedConversationId === item._id ? "bg-gray-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-black line-clamp-1">
                      {item.subject || item.product?.title || "Conversation"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {isVendorSide ? (
                        <span className="inline-flex items-center gap-1">
                          <FiUser className="w-3.5 h-3.5" />
                          {item.customer?.name || "Customer"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <FiShoppingBag className="w-3.5 h-3.5" />
                          {item.vendor?.storeName || "Vendor"}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {getShortPreview(lastMessage?.message || "No messages yet")}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">
                        {item.lastMessageAt
                          ? new Date(item.lastMessageAt).toLocaleString()
                          : ""}
                      </span>
                      {unread > 0 && (
                        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-black text-white text-[11px]">
                          {unread}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="xl:col-span-8 border border-gray-200 rounded-lg min-h-[420px] flex flex-col">
            {!selectedConversationId ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                Select a conversation to view messages
              </div>
            ) : detailLoading ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                Loading conversation...
              </div>
            ) : !selectedConversation ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                Conversation not found
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-gray-200">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-black">
                        {selectedConversation.subject ||
                          selectedConversation.product?.title ||
                          "Conversation"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedConversation.conversationNumber} | Status:{" "}
                        {selectedConversation.status}
                        {selectedConversationUnreadCount > 0 &&
                          ` | Unread: ${selectedConversationUnreadCount}`}
                      </p>
                    </div>
                    <select
                      value={selectedConversation.status}
                      onChange={(event) => handleStatusUpdate(event.target.value)}
                      disabled={updatingStatus}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full md:w-36"
                    >
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div className="flex-1 p-4 space-y-3 overflow-auto max-h-[320px]">
                  {(selectedConversation.messages || []).map((msg) => {
                    const isSelf =
                      String(msg.senderUser?._id || msg.senderUser || "") ===
                      String(user?._id || "");
                    return (
                      <div
                        key={msg._id}
                        className={`rounded-lg p-3 text-sm ${
                          isSelf ? "bg-black text-white ml-6" : "bg-gray-100 text-gray-800 mr-6"
                        }`}
                      >
                        <p className="text-[11px] opacity-80 mb-1">
                          {msg.senderUser?.name || msg.senderRole} •{" "}
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
                        </p>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-gray-200 space-y-2">
                  <textarea
                    value={replyMessage}
                    onChange={(event) => setReplyMessage(event.target.value)}
                    rows={3}
                    placeholder="Write your reply..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                    disabled={selectedConversation.status === "closed"}
                  />
                  <button
                    type="button"
                    onClick={handleReply}
                    disabled={sendingReply || selectedConversation.status === "closed"}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-60"
                  >
                    <FiMessageSquare className="w-4 h-4" />
                    {sendingReply ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorMessages;
