const mongoose = require("mongoose");

const auctionBidSchema = new mongoose.Schema(
  {
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      required: true,
      index: true,
    },
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
    bidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "outbid", "winning", "cancelled"],
      default: "active",
      index: true,
    },
    isAutoBid: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

auctionBidSchema.index({ auction: 1, amount: -1, createdAt: -1 });
auctionBidSchema.index({ bidder: 1, createdAt: -1 });

const AuctionBid = mongoose.model("AuctionBid", auctionBidSchema);

module.exports = AuctionBid;
