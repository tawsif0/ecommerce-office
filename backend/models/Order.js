// models/Order.js
const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: false,
    index: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  variationId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  variationLabel: {
    type: String,
    default: "",
    trim: true,
  },
  sku: {
    type: String,
    default: "",
    trim: true,
  },
  color: {
    type: String,
    default: "",
  },
  dimensions: {
    type: String,
    default: "",
  },
  vendorCommissionAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  vendorCommissionSource: {
    type: String,
    enum: ["none", "global", "vendor", "category", "product"],
    default: "global",
  },
  vendorCommissionType: {
    type: String,
    enum: ["inherit", "percentage", "fixed", "hybrid"],
    default: "inherit",
  },
  vendorCommissionValue: {
    type: Number,
    default: 0,
    min: 0,
  },
  vendorCommissionFixed: {
    type: Number,
    default: 0,
    min: 0,
  },
  vendorNetAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const addressSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  alternativePhone: {
    type: String,
    trim: true,
    default: "",
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  subCity: {
    type: String,
    trim: true,
    default: "",
  },
  district: {
    type: String,
    trim: true,
    default: "",
  },
  postalCode: {
    type: String,
    required: true,
    trim: true,
  },
  country: {
    type: String,
    trim: true,
    default: "Bangladesh",
  },
  notes: {
    type: String,
    trim: true,
    default: "",
  },
});
const paymentDetailsSchema = new mongoose.Schema({
  method: {
    type: String,
    required: true,
  },
  providerType: {
    type: String,
    default: "",
    trim: true,
  },
  transactionId: {
    type: String,
    default: "",
  },
  gatewayPaymentId: {
    type: String,
    default: "",
    trim: true,
  },
  paymentUrl: {
    type: String,
    default: "",
    trim: true,
  },
  accountNo: {
    type: String,
    default: "",
  },
  sentFrom: {
    type: String,
    default: "",
  },
  sentTo: {
    type: String,
    default: "",
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

const ORDER_STATUS_FLOW = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

const orderStatusTimelineSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ORDER_STATUS_FLOW,
      required: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    changedByRole: {
      type: String,
      default: "system",
      trim: true,
      maxlength: 40,
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  items: [orderItemSchema],
  shippingAddress: addressSchema,
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  shippingFee: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  shippingMeta: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
  couponCode: {
    type: String,
    default: "",
    trim: true,
    uppercase: true,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMethod: {
    type: String,
    required: true,
    // REMOVE ENUM - Get from database
  },
  paymentDetails: paymentDetailsSchema,
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  orderStatus: {
    type: String,
    enum: ORDER_STATUS_FLOW,
    default: "pending",
  },
  adminNotes: {
    type: String,
    default: "",
    trim: true,
    maxlength: 3000,
  },
  statusTimeline: {
    type: [orderStatusTimelineSchema],
    default: [],
  },
  source: {
    type: String,
    default: "shop",
    trim: true,
    maxlength: 120,
    index: true,
  },
  landingPage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LandingPage",
    default: null,
    index: true,
  },
  landingPageSlug: {
    type: String,
    default: "",
    trim: true,
    lowercase: true,
    maxlength: 220,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

orderSchema.pre("validate", function preValidate(next) {
  if (!this.paymentDetails) {
    this.paymentDetails = {};
  }

  if (!this.paymentDetails.method && this.paymentMethod) {
    this.paymentDetails.method = this.paymentMethod;
  }

  if (!this.paymentMethod && this.paymentDetails?.method) {
    this.paymentMethod = this.paymentDetails.method;
  }

  if (this.isNew && (!Array.isArray(this.statusTimeline) || this.statusTimeline.length === 0)) {
    this.statusTimeline = [
      {
        status: this.orderStatus || "pending",
        note: "Order created",
        changedAt: this.createdAt || new Date(),
        changedBy: null,
        changedByRole: "system",
      },
    ];
  }

  next();
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
