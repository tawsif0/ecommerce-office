const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const Order = require("../models/Order");
const Vendor = require("../models/Vendor");
const { buildUniqueStoreSlug } = require("../utils/vendorUtils");

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const sendEmail = async (mailOptions) => {
  const transporter = createTransporter();
  if (!transporter) return;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      ...mailOptions,
    });
  } catch (error) {
    // Email failure should not block auth flows.
    console.warn("Email send skipped:", error.message);
  }
};

const isAdmin = (user) => String(user?.userType || "").toLowerCase() === "admin";

const toSafeUser = (userDoc) => {
  if (!userDoc) return null;
  if (typeof userDoc.toSafeObject === "function") return userDoc.toSafeObject();

  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete user.password;
  delete user.tokens;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  user.phone = user.originalPhone || user.phone;
  return user;
};

exports.registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      accountType = "user",
      vendorData = {},
      storeName,
      storeDescription,
      storeAddress,
      storeCity,
      storeCountry,
      storePhone,
      storeEmail,
    } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        error: "Name, email, phone and password are required",
      });
    }

    if (!User.validateBangladeshiPhone(phone)) {
      return res.status(400).json({
        error:
          "Invalid Bangladeshi phone number. Format: 01XXXXXXXXX or +8801XXXXXXXXX",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = User.normalizePhone(phone);

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        return res.status(400).json({ error: "Email already in use" });
      }
      return res.status(400).json({ error: "Phone number already in use" });
    }

    const isVendorRegistration =
      String(accountType || "")
        .trim()
        .toLowerCase() === "vendor";

    const normalizedStoreName = String(
      vendorData.storeName || storeName || "",
    ).trim();

    if (isVendorRegistration && !normalizedStoreName) {
      return res.status(400).json({
        error: "Store name is required for vendor registration",
      });
    }

    const userCount = await User.countDocuments();
    const userType =
      userCount === 0 ? "admin" : isVendorRegistration ? "vendor" : "user";

    const user = new User({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      originalPhone: String(phone).trim(),
      password,
      userType,
      status: "active",
    });

    await user.save();

    let createdVendor = null;
    if (isVendorRegistration && userType !== "admin") {
      const slug = await buildUniqueStoreSlug(Vendor, normalizedStoreName);
      createdVendor = await Vendor.create({
        user: user._id,
        storeName: normalizedStoreName,
        slug,
        description: String(
          vendorData.description || storeDescription || "",
        ).trim(),
        address: String(vendorData.address || storeAddress || "").trim(),
        city: String(vendorData.city || storeCity || "").trim(),
        country: String(
          vendorData.country || storeCountry || "Bangladesh",
        ).trim(),
        phone: String(vendorData.phone || storePhone || phone || "").trim(),
        email: String(vendorData.email || storeEmail || email || "")
          .trim()
          .toLowerCase(),
        status: "pending",
      });
    }

    const token = await user.generateAuthToken();

    await sendEmail({
      to: user.email,
      subject: isVendorRegistration
        ? "Vendor application received"
        : "Welcome to our store",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111;">Welcome, ${user.name}!</h2>
          <p>Your account has been created successfully.</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Phone:</strong> ${user.originalPhone || user.phone}</p>
          ${
            isVendorRegistration
              ? `<p><strong>Vendor Store:</strong> ${normalizedStoreName}</p>
                 <p>Your vendor account is pending admin approval.</p>`
              : ""
          }
        </div>
      `,
    });

    return res.status(201).json({
      message: isVendorRegistration
        ? "Vendor account created and sent for approval"
        : "User registered successfully",
      user: toSafeUser(user),
      vendor: createdVendor,
      token,
    });
  } catch (error) {
    console.error("Register user error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res
        .status(400)
        .json({ error: "Email or phone and password are required" });
    }

    const user = await User.findByCredentials(loginId, password);
    user.lastLogin = new Date();
    await user.save();

    const token = await user.generateAuthToken();

    return res.json({
      message: "Login successful",
      user: toSafeUser(user),
      token,
    });
  } catch (error) {
    return res.status(401).json({ error: "Invalid login credentials" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: "Password reset link sent to email" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.passwordResetExpires = Date.now() + 30 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Password reset request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111;">Password Reset</h2>
          <p>You requested a password reset.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:4px;">
              Reset Password
            </a>
          </p>
          <p>This link is valid for 30 minutes.</p>
        </div>
      `,
    });

    return res.json({ message: "Password reset link sent to email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Failed to send reset email" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || String(password).length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Token is invalid or expired" });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.tokens = [];
    await user.save();

    return res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

exports.getUserProfile = async (req, res) => {
  return res.json(toSafeUser(req.user));
};

exports.updateUserProfile = async (req, res) => {
  try {
    const user = req.user;
    const { name, email } = req.body;

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({ error: "Name cannot be empty" });
      }
      user.name = trimmedName;
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({ error: "Email cannot be empty" });
      }

      const existingEmail = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
      });

      if (existingEmail) {
        return res.status(400).json({ error: "Email already in use" });
      }

      user.email = normalizedEmail;
    }

    await user.save();
    return res.json(toSafeUser(user));
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(400).json({ error: error.message || "Failed to update profile" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current password and new password are required" });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        error: "New password must be at least 8 characters long",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    user.password = newPassword;
    user.tokens = [];
    await user.save();

    return res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(400).json({ error: error.message || "Failed to change password" });
  }
};

exports.getSettings = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    return res.json(req.user.adminSettings || {});
  } catch (error) {
    console.error("Get settings error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.user.adminSettings = {
      ...(req.user.adminSettings || {}),
      ...(req.body || {}),
    };
    await req.user.save();

    return res.json({
      message: "Settings updated successfully",
      settings: req.user.adminSettings,
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const users = await User.find()
      .select(
        "name email phone originalPhone userType status createdAt lastLogin",
      )
      .sort({ createdAt: -1 });

    return res.json(users.map((user) => toSafeUser(user)));
  } catch (error) {
    console.error("Get all users error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

exports.getSystemStats = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const nonAdminUsers = await User.find({ userType: { $ne: "admin" } }).select(
      "status",
    );

    const totalUsers = nonAdminUsers.length;
    const activeUsers = nonAdminUsers.filter((user) => user.status === "active")
      .length;
    const pendingUsers = nonAdminUsers.filter((user) => user.status === "pending")
      .length;

    const revenue = await Order.aggregate([
      { $match: { orderStatus: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    return res.json({
      totalUsers,
      activeUsers,
      pendingUsers,
      totalRevenue: revenue[0]?.total || 0,
    });
  } catch (error) {
    console.error("Get system stats error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};
