const mongoose = require("mongoose");

const shippingRuleSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },
    country: {
      type: String,
      default: "Bangladesh",
      trim: true,
      maxlength: 120,
    },
    district: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },
    city: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },
    minSubtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxSubtotal: {
      type: Number,
      default: null,
      min: 0,
    },
    shippingFee: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedMinDays: {
      type: Number,
      default: 2,
      min: 0,
    },
    estimatedMaxDays: {
      type: Number,
      default: 5,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true },
);

const shippingZoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    scope: {
      type: String,
      enum: ["global", "vendor"],
      default: "global",
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true,
    },
    priority: {
      type: Number,
      default: 100,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    rules: {
      type: [shippingRuleSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true },
);

shippingZoneSchema.index({ scope: 1, vendor: 1, isActive: 1, priority: 1 });

const ShippingZone = mongoose.model("ShippingZone", shippingZoneSchema);
module.exports = ShippingZone;
