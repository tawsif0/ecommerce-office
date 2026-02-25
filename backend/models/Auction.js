const mongoose = require("mongoose");

const auctionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    startingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    reservePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    buyNowPrice: {
      type: Number,
      default: null,
      min: 0,
    },
    minIncrement: {
      type: Number,
      default: 1,
      min: 0.01,
    },
    startsAt: {
      type: Date,
      required: true,
      index: true,
    },
    endsAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "live", "ended", "cancelled"],
      default: "draft",
      index: true,
    },
    winningBid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuctionBid",
      default: null,
    },
    winningAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentBid: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalBids: {
      type: Number,
      default: 0,
      min: 0,
    },
    allowAutoExtend: {
      type: Boolean,
      default: true,
    },
    autoExtendMinutes: {
      type: Number,
      default: 5,
      min: 1,
      max: 60,
    },
    lastBidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

auctionSchema.index({ status: 1, startsAt: 1, endsAt: 1 });
auctionSchema.index({ vendor: 1, createdAt: -1 });

auctionSchema.pre("validate", function preValidate(next) {
  if (this.endsAt && this.startsAt && this.endsAt <= this.startsAt) {
    this.invalidate("endsAt", "Auction end time must be greater than start time");
  }

  if (this.currentBid < this.startingPrice) {
    this.currentBid = this.startingPrice;
  }

  next();
});

const Auction = mongoose.model("Auction", auctionSchema);

module.exports = Auction;
