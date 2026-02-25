const VendorAd = require("../models/VendorAd");
const { isAdmin, getUserId, getVendorForUser } = require("../utils/marketplaceAccess");

const normalizeStatus = (value) => String(value || "").toLowerCase().trim();

const syncAdRuntimeStatus = async (ad) => {
  if (!ad) return ad;

  const now = new Date();
  const current = normalizeStatus(ad.status);

  let nextStatus = current;

  if (current === "approved") {
    if (ad.startDate <= now && ad.endDate >= now) {
      nextStatus = "active";
    }
  }

  if (current === "active" && ad.endDate < now) {
    nextStatus = "completed";
  }

  if (nextStatus !== current) {
    ad.status = nextStatus;
    await ad.save();
  }

  return ad;
};

const ensureVendorAdAccess = async (req, res) => {
  if (isAdmin(req.user)) {
    return { source: "admin", vendor: null };
  }

  const access = await getVendorForUser(req.user, { approvedOnly: false, allowStaff: true });
  if (!access?.vendor) {
    res.status(404).json({
      success: false,
      message: "Vendor profile not found",
    });
    return null;
  }

  if (access.source === "staff") {
    const canManageAds = Boolean(access.staffMember?.permissions?.manageAds);
    if (!canManageAds) {
      res.status(403).json({
        success: false,
        message: "Staff permission denied for ad management",
      });
      return null;
    }
  }

  return access;
};

exports.getPublicAds = async (req, res) => {
  try {
    const { placement } = req.query;
    const now = new Date();

    const query = {
      status: { $in: ["approved", "active"] },
      startDate: { $lte: now },
      endDate: { $gte: now },
    };

    if (placement) {
      query.placement = placement;
    }

    const ads = await VendorAd.find(query)
      .populate("vendor", "storeName slug logo")
      .sort({ createdAt: -1 })
      .limit(20);

    const normalizedAds = [];
    for (const ad of ads) {
      // eslint-disable-next-line no-await-in-loop
      const synced = await syncAdRuntimeStatus(ad);
      normalizedAds.push(synced);
    }

    res.json({
      success: true,
      ads: normalizedAds,
    });
  } catch (error) {
    console.error("Get public ads error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching ads",
    });
  }
};

exports.createVendorAd = async (req, res) => {
  try {
    const access = await ensureVendorAdAccess(req, res);
    if (!access?.vendor) return;

    const {
      title,
      description = "",
      bannerUrl,
      targetUrl = "",
      placement = "home_sidebar",
      budget = 0,
      costModel = "fixed",
      bidAmount = 0,
      startDate,
      endDate,
      status = "draft",
    } = req.body || {};

    if (!title || !bannerUrl || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Title, banner URL, start date and end date are required",
      });
    }

    const ad = await VendorAd.create({
      vendor: access.vendor._id,
      createdBy: getUserId(req.user),
      title: String(title).trim(),
      description: String(description || "").trim(),
      bannerUrl: String(bannerUrl).trim(),
      targetUrl: String(targetUrl || "").trim(),
      placement,
      budget: Math.max(0, Number(budget || 0) || 0),
      costModel,
      bidAmount: Math.max(0, Number(bidAmount || 0) || 0),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: ["draft", "pending"].includes(normalizeStatus(status))
        ? normalizeStatus(status)
        : "draft",
    });

    const populated = await VendorAd.findById(ad._id).populate("vendor", "storeName slug");

    res.status(201).json({
      success: true,
      message: "Vendor ad created",
      ad: populated,
    });
  } catch (error) {
    console.error("Create vendor ad error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating ad",
    });
  }
};

exports.getVendorAds = async (req, res) => {
  try {
    const access = await ensureVendorAdAccess(req, res);
    if (!access?.vendor) return;

    const ads = await VendorAd.find({ vendor: access.vendor._id }).sort({ createdAt: -1 });

    for (const ad of ads) {
      // eslint-disable-next-line no-await-in-loop
      await syncAdRuntimeStatus(ad);
    }

    res.json({
      success: true,
      ads,
    });
  } catch (error) {
    console.error("Get vendor ads error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching vendor ads",
    });
  }
};

exports.updateVendorAd = async (req, res) => {
  try {
    const access = await ensureVendorAdAccess(req, res);
    if (!access?.vendor) return;

    const ad = await VendorAd.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Ad not found",
      });
    }

    if (String(ad.vendor) !== String(access.vendor._id)) {
      return res.status(403).json({
        success: false,
        message: "Cannot manage another vendor ad",
      });
    }

    const updates = { ...req.body };
    const blockedStatuses = ["approved", "active", "completed"];
    if (blockedStatuses.includes(normalizeStatus(ad.status))) {
      const safeFields = ["targetUrl", "endDate", "status"];
      Object.keys(updates).forEach((key) => {
        if (!safeFields.includes(key)) delete updates[key];
      });
    }

    if (updates.startDate !== undefined) updates.startDate = new Date(updates.startDate);
    if (updates.endDate !== undefined) updates.endDate = new Date(updates.endDate);
    if (updates.budget !== undefined) updates.budget = Math.max(0, Number(updates.budget || 0));
    if (updates.bidAmount !== undefined) {
      updates.bidAmount = Math.max(0, Number(updates.bidAmount || 0));
    }

    Object.assign(ad, updates);
    await ad.save();

    await syncAdRuntimeStatus(ad);

    res.json({
      success: true,
      message: "Ad updated",
      ad,
    });
  } catch (error) {
    console.error("Update vendor ad error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating ad",
    });
  }
};

exports.getAdminAds = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    const ads = await VendorAd.find(query)
      .populate("vendor", "storeName slug status")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    for (const ad of ads) {
      // eslint-disable-next-line no-await-in-loop
      await syncAdRuntimeStatus(ad);
    }

    res.json({
      success: true,
      ads,
    });
  } catch (error) {
    console.error("Get admin ads error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching ads",
    });
  }
};

exports.reviewAdStatus = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { status, rejectionReason = "" } = req.body || {};
    const normalized = normalizeStatus(status);
    const allowed = ["pending", "approved", "active", "paused", "rejected", "completed"];

    if (!allowed.includes(normalized)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ad status",
      });
    }

    const ad = await VendorAd.findById(req.params.id)
      .populate("vendor", "storeName slug")
      .populate("createdBy", "name email");

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Ad not found",
      });
    }

    ad.status = normalized;
    ad.rejectionReason = normalized === "rejected" ? String(rejectionReason || "").trim() : "";

    if (["approved", "active"].includes(normalized)) {
      ad.approvedBy = getUserId(req.user);
      ad.approvedAt = new Date();
    }

    await ad.save();
    await syncAdRuntimeStatus(ad);

    res.json({
      success: true,
      message: "Ad status updated",
      ad,
    });
  } catch (error) {
    console.error("Review ad status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while reviewing ad",
    });
  }
};

exports.trackAdImpression = async (req, res) => {
  try {
    const ad = await VendorAd.findByIdAndUpdate(
      req.params.id,
      { $inc: { impressions: 1 } },
      { new: true },
    );

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Ad not found",
      });
    }

    res.json({
      success: true,
      message: "Impression tracked",
      impressions: ad.impressions,
    });
  } catch (error) {
    console.error("Track ad impression error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while tracking impression",
    });
  }
};

exports.trackAdClick = async (req, res) => {
  try {
    const ad = await VendorAd.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } }, { new: true });

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "Ad not found",
      });
    }

    res.json({
      success: true,
      message: "Click tracked",
      clicks: ad.clicks,
    });
  } catch (error) {
    console.error("Track ad click error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while tracking click",
    });
  }
};
