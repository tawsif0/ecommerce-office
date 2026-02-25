const mongoose = require("mongoose");

const guestInfoSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true, maxlength: 120 },
    email: { type: String, default: "", trim: true, lowercase: true, maxlength: 180 },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
  },
  { _id: false },
);

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    guestInfo: {
      type: guestInfoSchema,
      default: () => ({}),
    },
    bookingType: {
      type: String,
      enum: ["service", "appointment"],
      default: "service",
    },
    appointmentDate: {
      type: Date,
      required: true,
      index: true,
    },
    appointmentSlot: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },
    serviceAddress: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "in_progress", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    cancellationReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true },
);

bookingSchema.pre("validate", function preValidate(next) {
  if (!this.bookingNumber) {
    this.bookingNumber = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  const qty = Number(this.quantity || 1);
  const unitPrice = Number(this.price || 0);
  this.total = Math.max(0, qty * unitPrice);

  next();
});

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
