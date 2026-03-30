const getNotificationUserRole = (user) =>
  String(user?.userType || "user")
    .trim()
    .toLowerCase();

const resolveRoleAwareTargetTab = (notification, user, fallbackTab = "") => {
  const type = String(notification?.type || "").trim();
  const role = getNotificationUserRole(user);

  const isOrderNotification = [
    "admin_order_created",
    "vendor_order_created",
    "order_created",
    "order_status_updated",
    "payment_status_updated",
    "order_cancellation_requested",
    "order_cancelled",
    "order_cancellation_updated",
  ].includes(type);

  if (role === "admin" && isOrderNotification) {
    return "order-list";
  }

  if (role === "vendor" && isOrderNotification) {
    return "vendor-orders";
  }

  if (role === "user" && isOrderNotification) {
    return "my-orders";
  }

  if (role === "admin" && ["review_pending", "review_status_updated"].includes(type)) {
    return "product-reviews";
  }

  if (role === "admin" && type === "contact_submission") {
    return "contacted-list";
  }

  return String(fallbackTab || "").trim();
};

export const formatNotificationTime = (value) => {
  if (!value) return "";

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const getNotificationTarget = (notification, user) => {
  const meta =
    notification?.meta &&
    typeof notification.meta === "object" &&
    !Array.isArray(notification.meta)
      ? notification.meta
      : {};

  const resolvedMetaTargetTab = resolveRoleAwareTargetTab(
    notification,
    user,
    meta.targetTab,
  );

  if (resolvedMetaTargetTab) {
    return {
      ...meta,
      targetTab: resolvedMetaTargetTab,
    };
  }

  switch (String(notification?.type || "").trim()) {
    case "admin_order_created":
    case "order_cancellation_requested":
    case "order_cancelled":
      return {
        ...meta,
        targetTab: "order-list",
      };
    case "vendor_order_created":
      return {
        ...meta,
        targetTab: "vendor-orders",
      };
    case "order_created":
    case "order_status_updated":
    case "payment_status_updated":
    case "order_cancellation_updated":
      return {
        ...meta,
        targetTab:
          user?.userType === "vendor" ? "vendor-orders" : "my-orders",
      };
    case "review_pending":
      return {
        ...meta,
        targetTab: "product-reviews",
      };
    case "contact_submission":
      return {
        ...meta,
        targetTab: "contacted-list",
      };
    default:
      return null;
  }
};

export const getNotificationTypeLabel = (notification) => {
  switch (String(notification?.type || "").trim()) {
    case "admin_order_created":
    case "vendor_order_created":
    case "order_created":
    case "order_status_updated":
    case "order_cancellation_requested":
    case "order_cancelled":
    case "order_cancellation_updated":
      return "Order";
    case "payment_status_updated":
      return "Payment";
    case "review_pending":
    case "review_status_updated":
      return "Review";
    case "contact_submission":
      return "Contact";
    default:
      return "Update";
  }
};

export const getNotificationRoleCopy = (user) => {
  const role = String(user?.userType || "user").trim().toLowerCase();

  if (role === "admin") {
    return {
      title: "Admin Notifications",
      subtitle:
        "Orders, review approvals, contact submissions, and operational updates appear here live.",
      empty:
        "No admin notifications yet. New commerce and moderation updates will appear here.",
    };
  }

  if (role === "vendor") {
    return {
      title: "Vendor Notifications",
      subtitle:
        "New vendor orders and status changes arrive here without refreshing the dashboard.",
      empty:
        "No vendor notifications yet. Store order updates will appear here.",
    };
  }

  if (role === "staff") {
    return {
      title: "Staff Notifications",
      subtitle:
        "Assigned workflow and dashboard updates appear here as they happen.",
      empty:
        "No staff notifications yet. New workflow updates will appear here.",
    };
  }

  return {
    title: "My Notifications",
    subtitle:
      "Your order, payment, and review updates appear here instantly without refreshing.",
    empty:
      "No notifications yet. Your order and review updates will appear here.",
  };
};
