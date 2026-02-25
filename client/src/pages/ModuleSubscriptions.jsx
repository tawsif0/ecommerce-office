import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiRefreshCw, FiTrash2 } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const initialPlanForm = {
  name: "",
  description: "",
  billingCycle: "monthly",
  price: "",
  productLimit: "",
  uploadLimitPerMonth: "",
  featuredProductAccess: false,
  commissionType: "inherit",
  commissionValue: "",
  isActive: true,
  sortOrder: "0",
};

const ModuleSubscriptions = () => {
  const { user } = useAuth();
  const [publicPlans, setPublicPlans] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [recurringSubscriptions, setRecurringSubscriptions] = useState([]);
  const [mySubscription, setMySubscription] = useState(null);
  const [myHistory, setMyHistory] = useState([]);
  const [myLimits, setMyLimits] = useState(null);
  const [planForm, setPlanForm] = useState(initialPlanForm);
  const [savingPlan, setSavingPlan] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [durationCount, setDurationCount] = useState("1");
  const [subscribing, setSubscribing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [runningRecurringJob, setRunningRecurringJob] = useState(false);

  const isAdmin = user?.userType === "admin";
  const canSubscribe = user?.userType === "vendor" || user?.userType === "staff";

  const selectedPublicPlan = useMemo(
    () => publicPlans.find((plan) => String(plan._id) === String(selectedPlanId)),
    [publicPlans, selectedPlanId],
  );

  const fetchPublicPlans = async () => {
    try {
      const response = await axios.get(`${baseUrl}/subscriptions/public/plans`);
      setPublicPlans(response.data?.plans || []);
    } catch {
      setPublicPlans([]);
    }
  };

  const fetchAdminData = async () => {
    const [planRes, subRes, recurringRes] = await Promise.all([
      axios.get(`${baseUrl}/subscriptions/plans`, { headers: getAuthHeaders() }),
      axios.get(`${baseUrl}/subscriptions/admin/subscriptions`, {
        headers: getAuthHeaders(),
      }),
      axios.get(`${baseUrl}/subscriptions/recurring/admin`, {
        headers: getAuthHeaders(),
      }),
    ]);

    setPlans(planRes.data?.plans || []);
    setSubscriptions(subRes.data?.subscriptions || []);
    setRecurringSubscriptions(recurringRes.data?.subscriptions || []);
  };

  const fetchMyData = async () => {
    const [response, recurringRes] = await Promise.allSettled([
      axios.get(`${baseUrl}/subscriptions/me`, {
        headers: getAuthHeaders(),
      }),
      axios.get(`${baseUrl}/subscriptions/recurring/vendor`, {
        headers: getAuthHeaders(),
      }),
    ]);

    if (response.status === "fulfilled") {
      setMySubscription(response.value.data?.current || null);
      setMyHistory(response.value.data?.history || []);
      setMyLimits(response.value.data?.limits || null);
    } else {
      setMySubscription(null);
      setMyHistory([]);
      setMyLimits(null);
    }

    if (recurringRes.status === "fulfilled") {
      setRecurringSubscriptions(recurringRes.value.data?.subscriptions || []);
    } else {
      setRecurringSubscriptions([]);
    }
  };

  const refresh = async () => {
    try {
      setLoading(true);
      await fetchPublicPlans();

      if (isAdmin) {
        await fetchAdminData();
      } else if (canSubscribe) {
        await fetchMyData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user]);

  const resetPlanForm = () => {
    setPlanForm(initialPlanForm);
    setEditingPlanId("");
  };

  const handlePlanInput = (event) => {
    const { name, value, type, checked } = event.target;
    setPlanForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const savePlan = async (event) => {
    event.preventDefault();

    if (!planForm.name.trim()) {
      toast.error("Plan name is required");
      return;
    }

    try {
      setSavingPlan(true);
      const payload = {
        ...planForm,
        name: planForm.name.trim(),
        description: planForm.description.trim(),
        price: Number(planForm.price || 0),
        productLimit: Number(planForm.productLimit || 0),
        uploadLimitPerMonth: Number(planForm.uploadLimitPerMonth || 0),
        commissionValue: Number(planForm.commissionValue || 0),
        sortOrder: Number(planForm.sortOrder || 0),
      };

      if (editingPlanId) {
        await axios.put(`${baseUrl}/subscriptions/plans/${editingPlanId}`, payload, {
          headers: getAuthHeaders(),
        });
        toast.success("Plan updated");
      } else {
        await axios.post(`${baseUrl}/subscriptions/plans`, payload, {
          headers: getAuthHeaders(),
        });
        toast.success("Plan created");
      }

      resetPlanForm();
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save plan");
    } finally {
      setSavingPlan(false);
    }
  };

  const editPlan = (plan) => {
    setEditingPlanId(plan._id);
    setPlanForm({
      name: plan.name || "",
      description: plan.description || "",
      billingCycle: plan.billingCycle || "monthly",
      price: String(plan.price ?? ""),
      productLimit: String(plan.productLimit ?? ""),
      uploadLimitPerMonth: String(plan.uploadLimitPerMonth ?? ""),
      featuredProductAccess: Boolean(plan.featuredProductAccess),
      commissionType: plan.commissionType || "inherit",
      commissionValue: String(plan.commissionValue ?? ""),
      isActive: Boolean(plan.isActive),
      sortOrder: String(plan.sortOrder ?? "0"),
    });
  };

  const deletePlan = async (planId) => {
    if (!window.confirm("Delete this plan?")) return;

    try {
      await axios.delete(`${baseUrl}/subscriptions/plans/${planId}`, {
        headers: getAuthHeaders(),
      });
      toast.success("Plan deleted");
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete plan");
    }
  };

  const subscribePlan = async () => {
    if (!selectedPlanId) {
      toast.error("Select a plan first");
      return;
    }

    try {
      setSubscribing(true);
      await axios.post(
        `${baseUrl}/subscriptions/me/subscribe`,
        {
          planId: selectedPlanId,
          durationCount: Number(durationCount || 1),
        },
        { headers: getAuthHeaders() },
      );
      toast.success("Plan subscribed successfully");
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to subscribe");
    } finally {
      setSubscribing(false);
    }
  };

  const updateSubscriptionStatus = async (subscriptionId, status) => {
    try {
      await axios.patch(
        `${baseUrl}/subscriptions/admin/subscriptions/${subscriptionId}/status`,
        { status },
        { headers: getAuthHeaders() },
      );
      toast.success("Subscription status updated");
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const updateRecurringStatus = async (subscriptionId, status) => {
    try {
      await axios.patch(
        `${baseUrl}/subscriptions/recurring/${subscriptionId}/status`,
        { status },
        { headers: getAuthHeaders() },
      );
      toast.success("Recurring subscription updated");
      refresh();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update recurring subscription",
      );
    }
  };

  const runRecurringCycle = async () => {
    try {
      setRunningRecurringJob(true);
      const response = await axios.post(
        `${baseUrl}/subscriptions/recurring/admin/process`,
        {},
        { headers: getAuthHeaders() },
      );
      const summary = response.data?.summary || {};
      toast.success(
        `Renewal cycle done: ${summary.createdOrders || 0} order(s) generated`,
      );
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to run renewal cycle");
    } finally {
      setRunningRecurringJob(false);
    }
  };

  if (!isAdmin && !canSubscribe) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Access Required</h2>
        <p className="text-gray-600">Only admin, vendor, or authorized staff can access subscriptions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <h1 className="text-2xl font-bold">Subscription Plans & Limits</h1>
        <p className="text-zinc-200 mt-1">
          Control plan pricing, limits, and vendor subscriptions.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">Available Plans</h2>
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {publicPlans.length === 0 ? (
          <p className="text-gray-600">No active subscription plans available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {publicPlans.map((plan) => (
              <button
                key={plan._id}
                type="button"
                onClick={() => setSelectedPlanId(plan._id)}
                className={`text-left border rounded-lg p-4 transition-colors ${
                  selectedPlanId === plan._id
                    ? "border-black bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="font-semibold text-black">{plan.name}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {plan.price} TK / {plan.billingCycle}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Product limit: {plan.productLimit || "Unlimited"} | Upload/month:{" "}
                  {plan.uploadLimitPerMonth || "Unlimited"}
                </p>
              </button>
            ))}
          </div>
        )}

        {canSubscribe && (
          <div className="mt-4 flex flex-col md:flex-row gap-3 md:items-end">
            <div>
              <label className="text-sm text-gray-700 block mb-1">Duration multiplier</label>
              <input
                type="number"
                min="1"
                step="1"
                value={durationCount}
                onChange={(event) => setDurationCount(event.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg w-40"
              />
            </div>
            <button
              type="button"
              onClick={subscribePlan}
              disabled={!selectedPublicPlan || subscribing}
              className="px-5 py-2.5 bg-black text-white rounded-lg font-medium disabled:opacity-60"
            >
              {subscribing ? "Subscribing..." : "Subscribe Selected Plan"}
            </button>
          </div>
        )}
      </div>

      {canSubscribe && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
          <h2 className="text-lg font-semibold text-black mb-3">My Subscription</h2>
          {mySubscription ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                Plan: <span className="font-semibold text-black">{mySubscription.plan?.name}</span>
              </p>
              <p className="text-sm text-gray-700">Status: {mySubscription.status}</p>
              <p className="text-sm text-gray-700">
                Expires: {new Date(mySubscription.expiresAt).toLocaleString()}
              </p>
              {myLimits && (
                <p className="text-sm text-gray-700">
                  Limits: max products {myLimits.maxProducts || "Unlimited"}, uploads/month{" "}
                  {myLimits.maxUploadsPerMonth || "Unlimited"}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-600">No active subscription yet.</p>
          )}

          {myHistory.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
              <p className="text-sm font-semibold text-black">History</p>
              {myHistory.slice(0, 5).map((item) => (
                <div key={item._id} className="text-xs text-gray-600">
                  {item.plan?.name || "Plan"} - {item.status} - expires{" "}
                  {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : "N/A"}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {canSubscribe && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
          <h2 className="text-lg font-semibold text-black mb-4">
            Recurring Product Subscriptions ({recurringSubscriptions.length})
          </h2>
          {recurringSubscriptions.length === 0 ? (
            <p className="text-gray-600">No recurring product subscriptions found.</p>
          ) : (
            <div className="space-y-3">
              {recurringSubscriptions.map((item) => (
                <div
                  key={item._id}
                  className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-black">
                      {item.product?.title || "Product"}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {item.subscriptionNumber} | Next billing:{" "}
                      {item.nextBillingAt
                        ? new Date(item.nextBillingAt).toLocaleDateString()
                        : "N/A"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Interval: {item.billingIntervalCount} {item.billingInterval} | Cycles:{" "}
                      {item.totalCycles > 0
                        ? `${item.completedCycles}/${item.totalCycles}`
                        : `${item.completedCycles}/Unlimited`}
                    </p>
                  </div>
                  <select
                    value={item.status}
                    onChange={(event) => updateRecurringStatus(item._id, event.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-black">
                Recurring Product Subscriptions ({recurringSubscriptions.length})
              </h2>
              <button
                type="button"
                onClick={runRecurringCycle}
                disabled={runningRecurringJob}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {runningRecurringJob ? "Running..." : "Run Renewal Cycle"}
              </button>
            </div>

            {recurringSubscriptions.length === 0 ? (
              <p className="text-gray-600">No recurring subscriptions found.</p>
            ) : (
              <div className="space-y-3">
                {recurringSubscriptions.map((item) => (
                  <div
                    key={item._id}
                    className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-black">
                        {item.vendor?.storeName || "Vendor"} - {item.product?.title || "Product"}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {item.subscriptionNumber} | Next billing:{" "}
                        {item.nextBillingAt
                          ? new Date(item.nextBillingAt).toLocaleDateString()
                          : "N/A"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Interval: {item.billingIntervalCount} {item.billingInterval} | Cycles:{" "}
                        {item.totalCycles > 0
                          ? `${item.completedCycles}/${item.totalCycles}`
                          : `${item.completedCycles}/Unlimited`}
                      </p>
                    </div>
                    <select
                      value={item.status}
                      onChange={(event) => updateRecurringStatus(item._id, event.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="completed">Completed</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={savePlan}
            className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold text-black">
              {editingPlanId ? "Edit Plan" : "Create Plan"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <input
                name="name"
                value={planForm.name}
                onChange={handlePlanInput}
                placeholder="Plan name"
                className="px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={planForm.price}
                onChange={handlePlanInput}
                placeholder="Price"
                className="px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <select
                name="billingCycle"
                value={planForm.billingCycle}
                onChange={handlePlanInput}
                className="px-3 py-2.5 border border-gray-200 rounded-lg"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
              <input
                name="productLimit"
                type="number"
                min="0"
                step="1"
                value={planForm.productLimit}
                onChange={handlePlanInput}
                placeholder="Product limit (0 = unlimited)"
                className="px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <input
                name="uploadLimitPerMonth"
                type="number"
                min="0"
                step="1"
                value={planForm.uploadLimitPerMonth}
                onChange={handlePlanInput}
                placeholder="Upload/month limit (0 = unlimited)"
                className="px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <select
                name="commissionType"
                value={planForm.commissionType}
                onChange={handlePlanInput}
                className="px-3 py-2.5 border border-gray-200 rounded-lg"
              >
                <option value="inherit">Inherit Commission</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed</option>
              </select>
              <input
                name="commissionValue"
                type="number"
                min="0"
                step="0.01"
                value={planForm.commissionValue}
                onChange={handlePlanInput}
                placeholder="Commission value"
                className="px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <input
                name="sortOrder"
                type="number"
                step="1"
                value={planForm.sortOrder}
                onChange={handlePlanInput}
                placeholder="Sort order"
                className="px-3 py-2.5 border border-gray-200 rounded-lg"
              />
              <label className="text-sm text-gray-700 flex items-center gap-2">
                <input
                  type="checkbox"
                  name="featuredProductAccess"
                  checked={planForm.featuredProductAccess}
                  onChange={handlePlanInput}
                />
                Featured product access
              </label>
              <label className="text-sm text-gray-700 flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={planForm.isActive}
                  onChange={handlePlanInput}
                />
                Plan active
              </label>
            </div>

            <textarea
              name="description"
              value={planForm.description}
              onChange={handlePlanInput}
              rows={3}
              placeholder="Plan description"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
            />

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingPlan}
                className="px-5 py-2.5 bg-black text-white rounded-lg font-medium disabled:opacity-60"
              >
                {savingPlan ? "Saving..." : editingPlanId ? "Update Plan" : "Create Plan"}
              </button>
              {editingPlanId && (
                <button
                  type="button"
                  onClick={resetPlanForm}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
            <h2 className="text-lg font-semibold text-black mb-4">Plan List ({plans.length})</h2>
            {plans.length === 0 ? (
              <p className="text-gray-600">No plans created yet.</p>
            ) : (
              <div className="space-y-3">
                {plans.map((plan) => (
                  <div
                    key={plan._id}
                    className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-black">{plan.name}</p>
                      <p className="text-sm text-gray-600">
                        {plan.price} TK / {plan.billingCycle} | Products: {plan.productLimit || "Unlimited"} | Upload/month: {plan.uploadLimitPerMonth || "Unlimited"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Status: {plan.isActive ? "Active" : "Inactive"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editPlan(plan)}
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePlan(plan._id)}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg"
                      >
                        <FiTrash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
            <h2 className="text-lg font-semibold text-black mb-4">
              Vendor Subscriptions ({subscriptions.length})
            </h2>
            {subscriptions.length === 0 ? (
              <p className="text-gray-600">No vendor subscriptions found.</p>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((subscription) => (
                  <div
                    key={subscription._id}
                    className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-black">
                        {subscription.vendor?.storeName || "Vendor"} - {subscription.plan?.name || "Plan"}
                      </p>
                      <p className="text-sm text-gray-600">
                        Status: {subscription.status} | Expires: {new Date(subscription.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <select
                      value={subscription.status}
                      onChange={(event) =>
                        updateSubscriptionStatus(subscription._id, event.target.value)
                      }
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ModuleSubscriptions;
