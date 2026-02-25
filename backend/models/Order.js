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
  transactionId: {
    type: String,
    default: "",
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
});
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
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
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

  next();
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
