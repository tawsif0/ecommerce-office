const mongoose = require("mongoose");

const vendorAdSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    bannerUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    targetUrl: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    placement: {
      type: String,
      enum: ["home_hero", "home_sidebar", "category", "search", "product"],
      default: "home_sidebar",
      index: true,
    },
    budget: {
      type: Number,
      default: 0,
      min: 0,
    },
    costModel: {
      type: String,
      enum: ["fixed", "cpc", "cpm"],
      default: "fixed",
    },
    bidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "active", "paused", "rejected", "completed"],
      default: "draft",
      index: true,
    },
    impressions: {
      type: Number,
      default: 0,
      min: 0,
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true },
);

vendorAdSchema.index({ status: 1, placement: 1, startDate: 1, endDate: 1 });
vendorAdSchema.index({ vendor: 1, createdAt: -1 });

vendorAdSchema.pre("validate", function preValidate(next) {
  if (this.endDate && this.startDate && this.endDate <= this.startDate) {
    this.invalidate("endDate", "Ad end date must be greater than start date");
  }
  next();
});

const VendorAd = mongoose.model("VendorAd", vendorAdSchema);

module.exports = VendorAd;
