const mongoose = require("mongoose");
const Supplier = require("../models/Supplier");
const { isAdmin, getVendorForUser, getUserId } = require("../utils/marketplaceAccess");

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const resolveScope = async (req, res) => {
  if (isAdmin(req.user)) {
    const vendorId = String(req.query?.vendorId || req.body?.vendorId || "").trim();
    return {
      admin: true,
      vendorId: mongoose.Types.ObjectId.isValid(vendorId) ? vendorId : null,
    };
  }

  const access = await getVendorForUser(req.user, {
    approvedOnly: false,
    allowStaff: true,
  });

  if (!access?.vendor) {
    res.status(403).json({
      success: false,
      message: "Vendor or admin access required",
    });
    return null;
  }

  return {
    admin: false,
    vendorId: String(access.vendor._id),
    access,
  };
};

const applyScope = (query, scope) => {
  if (scope.vendorId) {
    query.vendor = scope.vendorId;
  } else if (!scope.admin) {
    query.vendor = null;
  }

  return query;
};

exports.createSupplier = async (req, res) => {
  try {
    const scope = await resolveScope(req, res);
    if (!scope) return;

    const name = String(req.body?.name || "").trim();
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required",
      });
    }

    const openingDue = Math.max(0, parseNumber(req.body?.openingDue, 0));
    const currentDue =
      req.body?.currentDue !== undefined
        ? Math.max(0, parseNumber(req.body.currentDue, openingDue))
        : openingDue;

    const supplier = await Supplier.create({
      vendor: scope.vendorId || null,
      createdBy: getUserId(req.user),
      name,
      phone: String(req.body?.phone || "").trim(),
      email: String(req.body?.email || "").trim().toLowerCase(),
      address: String(req.body?.address || "").trim(),
      openingDue,
      currentDue,
      totalPaid: Math.max(0, parseNumber(req.body?.totalPaid, 0)),
      notes: String(req.body?.notes || "").trim(),
      isActive: req.body?.isActive === undefined ? true : Boolean(req.body?.isActive),
    });

    const populated = await Supplier.findById(supplier._id)
      .populate("vendor", "storeName slug")
      .populate("createdBy", "name email");

    res.status(201).json({
      success: true,
      message: "Supplier created",
      supplier: populated,
    });
  } catch (error) {
    console.error("Create supplier error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating supplier",
    });
  }
};

exports.getSuppliers = async (req, res) => {
  try {
    const scope = await resolveScope(req, res);
    if (!scope) return;

    const page = Math.max(1, Number.parseInt(req.query?.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query?.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    applyScope(query, scope);

    const activeParam = String(req.query?.active || "").trim().toLowerCase();
    if (activeParam === "true") query.isActive = true;
    if (activeParam === "false") query.isActive = false;

    const search = String(req.query?.search || "").trim();
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [suppliers, total, summary] = await Promise.all([
      Supplier.find(query)
        .populate("vendor", "storeName slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Supplier.countDocuments(query),
      Supplier.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalDue: { $sum: "$currentDue" },
            totalPaid: { $sum: "$totalPaid" },
            totalOpeningDue: { $sum: "$openingDue" },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      suppliers,
      summary: {
        count: total,
        totalDue: Number(summary?.[0]?.totalDue || 0),
        totalPaid: Number(summary?.[0]?.totalPaid || 0),
        totalOpeningDue: Number(summary?.[0]?.totalOpeningDue || 0),
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    console.error("Get suppliers error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching suppliers",
    });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const scope = await resolveScope(req, res);
    if (!scope) return;

    const query = { _id: req.params.id };
    applyScope(query, scope);

    const supplier = await Supplier.findOne(query);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const updatableFields = ["name", "phone", "email", "address", "notes"];
    updatableFields.forEach((field) => {
      if (req.body?.[field] !== undefined) {
        const value = String(req.body[field] || "").trim();
        supplier[field] = field === "email" ? value.toLowerCase() : value;
      }
    });

    if (req.body?.isActive !== undefined) {
      supplier.isActive = Boolean(req.body.isActive);
    }

    if (req.body?.openingDue !== undefined) {
      supplier.openingDue = Math.max(0, parseNumber(req.body.openingDue, supplier.openingDue));
    }

    if (req.body?.currentDue !== undefined) {
      supplier.currentDue = Math.max(0, parseNumber(req.body.currentDue, supplier.currentDue));
    }

    if (req.body?.totalPaid !== undefined) {
      supplier.totalPaid = Math.max(0, parseNumber(req.body.totalPaid, supplier.totalPaid));
    }

    if (scope.admin && req.body?.vendorId !== undefined) {
      const vendorId = String(req.body.vendorId || "").trim();
      supplier.vendor = mongoose.Types.ObjectId.isValid(vendorId) ? vendorId : null;
    }

    if (!String(supplier.name || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required",
      });
    }

    await supplier.save();
    await supplier.populate("vendor", "storeName slug");

    res.json({
      success: true,
      message: "Supplier updated",
      supplier,
    });
  } catch (error) {
    console.error("Update supplier error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating supplier",
    });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const scope = await resolveScope(req, res);
    if (!scope) return;

    const query = { _id: req.params.id };
    applyScope(query, scope);

    const deleted = await Supplier.findOneAndDelete(query);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    res.json({
      success: true,
      message: "Supplier deleted",
    });
  } catch (error) {
    console.error("Delete supplier error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting supplier",
    });
  }
};
