const Auction = require("../models/Auction");
const AuctionBid = require("../models/AuctionBid");
const Product = require("../models/Product");
const {
  isAdmin,
  getUserId,
  getVendorForUser,
} = require("../utils/marketplaceAccess");

const VALID_AUCTION_STATUSES = ["draft", "live", "ended", "cancelled"];

const syncAuctionLifecycle = async (auction) => {
  if (!auction) return null;

  const now = new Date();
  let changed = false;

  if (auction.status === "draft" && auction.startsAt <= now && auction.endsAt > now) {
    auction.status = "live";
    changed = true;
  }

  if ((auction.status === "live" || auction.status === "draft") && auction.endsAt <= now) {
    const topBid = await AuctionBid.findOne({ auction: auction._id })
      .sort({ amount: -1, createdAt: 1 })
      .lean();

    auction.status = "ended";
    auction.winningBid = topBid?._id || null;
    auction.winningAmount = Number(topBid?.amount || 0);
    changed = true;

    if (topBid?._id) {
      await AuctionBid.updateMany(
        { auction: auction._id, _id: { $ne: topBid._id } },
        { $set: { status: "outbid" } },
      );
      await AuctionBid.updateOne(
        { _id: topBid._id },
        { $set: { status: "winning" } },
      );
    }
  }

  if (changed) {
    await auction.save();
  }

  return auction;
};

const normalizeAmount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

exports.getPublicAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find({ status: { $in: ["live", "draft"] } })
      .populate("product", "title images price salePrice priceType")
      .populate("vendor", "storeName slug logo")
      .sort({ endsAt: 1, createdAt: -1 });

    const synced = [];
    for (const auction of auctions) {
      // eslint-disable-next-line no-await-in-loop
      const updated = await syncAuctionLifecycle(auction);
      if (updated?.status === "live") {
        synced.push(updated);
      }
    }

    res.json({
      success: true,
      auctions: synced,
    });
  } catch (error) {
    console.error("Get public auctions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching auctions",
    });
  }
};

exports.getAuctionById = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate("product", "title images price salePrice priceType")
      .populate("vendor", "storeName slug logo")
      .populate("winningBid");

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found",
      });
    }

    await syncAuctionLifecycle(auction);

    const bids = await AuctionBid.find({ auction: auction._id })
      .populate("bidder", "name")
      .sort({ amount: -1, createdAt: 1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      auction,
      bids,
    });
  } catch (error) {
    console.error("Get auction by id error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching auction",
    });
  }
};

exports.createAuction = async (req, res) => {
  try {
    const { productId, title, startingPrice, reservePrice, buyNowPrice, minIncrement, startsAt, endsAt, status = "draft" } =
      req.body || {};

    if (!productId || !title || !startsAt || !endsAt) {
      return res.status(400).json({
        success: false,
        message: "Product, title, start and end time are required",
      });
    }

    const product = await Product.findById(productId).select("_id title vendor");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let vendorId = product.vendor;

    if (!isAdmin(req.user)) {
      const access = await getVendorForUser(req.user, { approvedOnly: false, allowStaff: true });
      if (!access?.vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor profile not found",
        });
      }

      if (String(access.vendor._id) !== String(product.vendor || "")) {
        return res.status(403).json({
          success: false,
          message: "You can create auction only for your own products",
        });
      }

      if (access.source === "staff") {
        const canManageProducts = Boolean(access.staffMember?.permissions?.manageProducts);
        if (!canManageProducts) {
          return res.status(403).json({
            success: false,
            message: "Staff permission denied for product/auction management",
          });
        }
      }

      vendorId = access.vendor._id;
    }

    const normalizedStatus = VALID_AUCTION_STATUSES.includes(String(status || ""))
      ? String(status)
      : "draft";

    const auction = await Auction.create({
      product: product._id,
      vendor: vendorId,
      title: String(title).trim(),
      startingPrice: Math.max(0, normalizeAmount(startingPrice) || 0),
      reservePrice: Math.max(0, normalizeAmount(reservePrice) || 0),
      buyNowPrice:
        buyNowPrice === null || buyNowPrice === ""
          ? null
          : Math.max(0, normalizeAmount(buyNowPrice) || 0),
      minIncrement: Math.max(0.01, normalizeAmount(minIncrement) || 1),
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      status: normalizedStatus,
      currentBid: Math.max(0, normalizeAmount(startingPrice) || 0),
    });

    const populated = await Auction.findById(auction._id)
      .populate("product", "title")
      .populate("vendor", "storeName slug");

    res.status(201).json({
      success: true,
      message: "Auction created successfully",
      auction: populated,
    });
  } catch (error) {
    console.error("Create auction error:", error);
    if (error?.name === "ValidationError") {
      const messages = Object.values(error.errors || {}).map((item) => item.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", ") || "Validation failed",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while creating auction",
    });
  }
};

exports.getVendorAuctions = async (req, res) => {
  try {
    const access = await getVendorForUser(req.user, { approvedOnly: false, allowStaff: true });
    if (!access?.vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile not found",
      });
    }

    if (access.source === "staff") {
      const canManageProducts = Boolean(access.staffMember?.permissions?.manageProducts);
      if (!canManageProducts) {
        return res.status(403).json({
          success: false,
          message: "Staff permission denied for auctions",
        });
      }
    }

    const auctions = await Auction.find({ vendor: access.vendor._id })
      .populate("product", "title")
      .sort({ createdAt: -1 });

    for (const auction of auctions) {
      // eslint-disable-next-line no-await-in-loop
      await syncAuctionLifecycle(auction);
    }

    res.json({
      success: true,
      auctions,
    });
  } catch (error) {
    console.error("Get vendor auctions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching vendor auctions",
    });
  }
};

exports.getAdminAuctions = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const auctions = await Auction.find()
      .populate("product", "title")
      .populate("vendor", "storeName slug")
      .sort({ createdAt: -1 });

    for (const auction of auctions) {
      // eslint-disable-next-line no-await-in-loop
      await syncAuctionLifecycle(auction);
    }

    res.json({
      success: true,
      auctions,
    });
  } catch (error) {
    console.error("Get admin auctions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching auctions",
    });
  }
};

exports.placeBid = async (req, res) => {
  try {
    const bidderId = getUserId(req.user);
    const amount = normalizeAmount(req.body?.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid bid amount is required",
      });
    }

    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found",
      });
    }

    await syncAuctionLifecycle(auction);

    if (auction.status !== "live") {
      return res.status(400).json({
        success: false,
        message: "Auction is not live",
      });
    }

    const now = new Date();
    if (now < auction.startsAt || now > auction.endsAt) {
      return res.status(400).json({
        success: false,
        message: "Auction is outside bidding window",
      });
    }

    const vendorAccess = await getVendorForUser(req.user, {
      approvedOnly: false,
      allowStaff: false,
    });
    if (vendorAccess?.vendor && String(vendorAccess.vendor._id) === String(auction.vendor)) {
      return res.status(400).json({
        success: false,
        message: "Vendor cannot bid on own auction",
      });
    }

    const minRequired =
      Number(auction.totalBids || 0) > 0
        ? Number(auction.currentBid || 0) + Number(auction.minIncrement || 1)
        : Number(auction.startingPrice || 0);

    if (amount < minRequired) {
      return res.status(400).json({
        success: false,
        message: `Bid too low. Minimum required is ${minRequired.toFixed(2)} TK`,
      });
    }

    const bid = await AuctionBid.create({
      auction: auction._id,
      product: auction.product,
      vendor: auction.vendor,
      bidder: bidderId,
      amount,
      status: "active",
    });

    if (auction.winningBid) {
      await AuctionBid.updateOne({ _id: auction.winningBid }, { $set: { status: "outbid" } });
    }

    auction.currentBid = amount;
    auction.winningBid = bid._id;
    auction.winningAmount = amount;
    auction.totalBids = Number(auction.totalBids || 0) + 1;
    auction.lastBidAt = now;

    const msLeft = auction.endsAt.getTime() - now.getTime();
    const extensionMs = Number(auction.autoExtendMinutes || 5) * 60 * 1000;
    if (auction.allowAutoExtend && msLeft > 0 && msLeft <= extensionMs) {
      auction.endsAt = new Date(auction.endsAt.getTime() + extensionMs);
    }

    await auction.save();

    await AuctionBid.updateOne({ _id: bid._id }, { $set: { status: "winning" } });

    const populatedBid = await AuctionBid.findById(bid._id).populate("bidder", "name");

    res.status(201).json({
      success: true,
      message: "Bid placed successfully",
      bid: populatedBid,
      auction,
    });
  } catch (error) {
    console.error("Place bid error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while placing bid",
    });
  }
};

exports.getMyBids = async (req, res) => {
  try {
    const userId = getUserId(req.user);

    const bids = await AuctionBid.find({ bidder: userId })
      .populate({
        path: "auction",
        populate: [{ path: "product", select: "title" }, { path: "vendor", select: "storeName slug" }],
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      bids,
    });
  } catch (error) {
    console.error("Get my bids error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching bids",
    });
  }
};

exports.updateAuctionStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    const normalizedStatus = String(status || "").toLowerCase().trim();

    if (!VALID_AUCTION_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid auction status",
      });
    }

    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: "Auction not found",
      });
    }

    if (!isAdmin(req.user)) {
      const access = await getVendorForUser(req.user, { approvedOnly: false, allowStaff: true });

      if (!access?.vendor || String(access.vendor._id) !== String(auction.vendor)) {
        return res.status(403).json({
          success: false,
          message: "Permission denied for this auction",
        });
      }

      if (access.source === "staff") {
        const canManageProducts = Boolean(access.staffMember?.permissions?.manageProducts);
        if (!canManageProducts) {
          return res.status(403).json({
            success: false,
            message: "Staff permission denied for auctions",
          });
        }
      }
    }

    auction.status = normalizedStatus;

    if (normalizedStatus === "ended") {
      const topBid = await AuctionBid.findOne({ auction: auction._id })
        .sort({ amount: -1, createdAt: 1 })
        .lean();

      auction.winningBid = topBid?._id || null;
      auction.winningAmount = Number(topBid?.amount || 0);

      if (topBid?._id) {
        await AuctionBid.updateMany(
          { auction: auction._id, _id: { $ne: topBid._id } },
          { $set: { status: "outbid" } },
        );
        await AuctionBid.updateOne({ _id: topBid._id }, { $set: { status: "winning" } });
      }
    }

    await auction.save();

    res.json({
      success: true,
      message: "Auction status updated",
      auction,
    });
  } catch (error) {
    console.error("Update auction status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating auction",
    });
  }
};
