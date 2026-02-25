const Booking = require("../models/Booking");
const Product = require("../models/Product");
const Vendor = require("../models/Vendor");
const {
  isAdmin,
  getUserId,
  getVendorForUser,
} = require("../utils/marketplaceAccess");

const normalizeStatus = (value) => String(value || "").toLowerCase().trim();

const normalizeBookingPayload = (body = {}) => ({
  productId: body.productId || null,
  vendorId: body.vendorId || null,
  bookingType:
    String(body.bookingType || "service").toLowerCase() === "appointment"
      ? "appointment"
      : "service",
  appointmentDate: body.appointmentDate,
  appointmentSlot: String(body.appointmentSlot || "").trim(),
  serviceAddress: String(body.serviceAddress || "").trim(),
  notes: String(body.notes || "").trim(),
  quantity: Math.max(1, Number.parseInt(body.quantity, 10) || 1),
  price: Math.max(0, Number(body.price || 0) || 0),
  guestInfo: {
    name: String(body.guestName || body?.guestInfo?.name || "").trim(),
    email: String(body.guestEmail || body?.guestInfo?.email || "")
      .trim()
      .toLowerCase(),
    phone: String(body.guestPhone || body?.guestInfo?.phone || "").trim(),
  },
});

const resolveVendorAndProduct = async ({ productId, vendorId }) => {
  let product = null;
  let resolvedVendorId = vendorId || null;

  if (productId) {
    product = await Product.findById(productId).select("_id vendor title price");
    if (!product) {
      return { error: "Product not found" };
    }

    resolvedVendorId = product.vendor;
  }

  if (!resolvedVendorId) {
    return { error: "Vendor is required for booking" };
  }

  const vendor = await Vendor.findById(resolvedVendorId).select("_id storeName slug status");
  if (!vendor) {
    return { error: "Vendor not found" };
  }

  return {
    vendor,
    product,
  };
};

exports.createGuestBooking = async (req, res) => {
  try {
    const payload = normalizeBookingPayload(req.body || {});

    if (!payload.appointmentDate) {
      return res.status(400).json({
        success: false,
        message: "Appointment date is required",
      });
    }

    if (!payload.guestInfo.name || !payload.guestInfo.phone) {
      return res.status(400).json({
        success: false,
        message: "Guest name and phone are required",
      });
    }

    const resolved = await resolveVendorAndProduct(payload);
    if (resolved.error) {
      return res.status(400).json({
        success: false,
        message: resolved.error,
      });
    }

    const booking = await Booking.create({
      vendor: resolved.vendor._id,
      product: resolved.product?._id || null,
      customer: null,
      guestInfo: payload.guestInfo,
      bookingType: payload.bookingType,
      appointmentDate: new Date(payload.appointmentDate),
      appointmentSlot: payload.appointmentSlot,
      serviceAddress: payload.serviceAddress,
      notes: payload.notes,
      quantity: payload.quantity,
      price: payload.price || Number(resolved.product?.price || 0),
      status: "pending",
      paymentStatus: "pending",
    });

    const populated = await Booking.findById(booking._id)
      .populate("vendor", "storeName slug")
      .populate("product", "title price");

    res.status(201).json({
      success: true,
      message: "Booking request submitted",
      booking: populated,
    });
  } catch (error) {
    console.error("Create guest booking error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating booking",
    });
  }
};

exports.createMyBooking = async (req, res) => {
  try {
    const payload = normalizeBookingPayload(req.body || {});

    if (!payload.appointmentDate) {
      return res.status(400).json({
        success: false,
        message: "Appointment date is required",
      });
    }

    const resolved = await resolveVendorAndProduct(payload);
    if (resolved.error) {
      return res.status(400).json({
        success: false,
        message: resolved.error,
      });
    }

    const booking = await Booking.create({
      vendor: resolved.vendor._id,
      product: resolved.product?._id || null,
      customer: getUserId(req.user),
      guestInfo: {
        name: req.user?.name || "",
        email: req.user?.email || "",
        phone: req.user?.phone || req.user?.originalPhone || "",
      },
      bookingType: payload.bookingType,
      appointmentDate: new Date(payload.appointmentDate),
      appointmentSlot: payload.appointmentSlot,
      serviceAddress: payload.serviceAddress,
      notes: payload.notes,
      quantity: payload.quantity,
      price: payload.price || Number(resolved.product?.price || 0),
      status: "pending",
      paymentStatus: "pending",
    });

    const populated = await Booking.findById(booking._id)
      .populate("vendor", "storeName slug")
      .populate("product", "title price");

    res.status(201).json({
      success: true,
      message: "Booking request submitted",
      booking: populated,
    });
  } catch (error) {
    console.error("Create my booking error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating booking",
    });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const userId = getUserId(req.user);

    const bookings = await Booking.find({ customer: userId })
      .populate("vendor", "storeName slug")
      .populate("product", "title price")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error("Get my bookings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching bookings",
    });
  }
};

exports.getVendorBookings = async (req, res) => {
  try {
    const access = await getVendorForUser(req.user, { approvedOnly: false, allowStaff: true });

    if (!access?.vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile not found",
      });
    }

    if (access.source === "staff") {
      const canManageBookings = Boolean(access.staffMember?.permissions?.manageBookings);
      if (!canManageBookings) {
        return res.status(403).json({
          success: false,
          message: "Staff permission denied for bookings",
        });
      }
    }

    const bookings = await Booking.find({ vendor: access.vendor._id })
      .populate("customer", "name email phone")
      .populate("product", "title price")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error("Get vendor bookings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching vendor bookings",
    });
  }
};

exports.getAdminBookings = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { status } = req.query;
    const query = {};
    if (status) query.status = normalizeStatus(status);

    const bookings = await Booking.find(query)
      .populate("vendor", "storeName slug status")
      .populate("customer", "name email phone")
      .populate("product", "title")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error("Get admin bookings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching bookings",
    });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { status, cancellationReason = "" } = req.body || {};
    const normalized = normalizeStatus(status);

    if (
      !["pending", "confirmed", "in_progress", "completed", "cancelled"].includes(
        normalized,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking status",
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const admin = isAdmin(req.user);

    if (!admin) {
      const access = await getVendorForUser(req.user, {
        approvedOnly: false,
        allowStaff: true,
      });

      if (!access?.vendor || String(access.vendor._id) !== String(booking.vendor)) {
        return res.status(403).json({
          success: false,
          message: "Permission denied for this booking",
        });
      }

      if (access.source === "staff") {
        const canManageBookings = Boolean(access.staffMember?.permissions?.manageBookings);
        if (!canManageBookings) {
          return res.status(403).json({
            success: false,
            message: "Staff permission denied for bookings",
          });
        }
      }
    }

    booking.status = normalized;
    booking.cancellationReason =
      normalized === "cancelled" ? String(cancellationReason || "").trim() : "";

    if (normalized === "completed") {
      booking.paymentStatus = booking.paymentStatus === "paid" ? "paid" : "pending";
    }

    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate("vendor", "storeName slug")
      .populate("customer", "name email phone")
      .populate("product", "title");

    res.json({
      success: true,
      message: "Booking status updated",
      booking: populated,
    });
  } catch (error) {
    console.error("Update booking status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating booking",
    });
  }
};
