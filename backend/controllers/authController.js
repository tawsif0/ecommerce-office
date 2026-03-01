const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const axios = require("axios");
const validator = require("validator");
const User = require("../models/User");
const Order = require("../models/Order");
const Vendor = require("../models/Vendor");
const Product = require("../models/Product");
const Purchase = require("../models/Purchase");
const AbandonedOrder = require("../models/AbandonedOrder");
const { AccountEntry } = require("../models/AccountEntry");
const { readMarketplaceMode } = require("../middlewares/marketplaceMode");
const { clearResponseCacheByPrefix } = require("../middlewares/responseCache");
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

const isSuperAdmin = (user) => {
  if (!isAdmin(user)) return false;
  return user?.adminSettings?.isSuperAdmin === true;
};

const hasAdminPermission = (user, key) => {
  if (!isAdmin(user)) return false;
  const permissions =
    user?.adminSettings?.permissions &&
    typeof user.adminSettings.permissions === "object"
      ? user.adminSettings.permissions
      : null;

  if (!permissions) return true;

  const hasAnyConfigured = ADMIN_PERMISSION_KEYS.some((permissionKey) =>
    Object.prototype.hasOwnProperty.call(permissions, permissionKey),
  );
  if (!hasAnyConfigured) return true;

  return Boolean(permissions[key]);
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const classifyRiskLevel = (successRate, totalOrders) => {
  if (!Number.isFinite(totalOrders) || totalOrders <= 0) return "new";
  if (successRate >= 80) return "trusted";
  if (successRate >= 60) return "medium";
  if (successRate >= 40) return "high";
  return "blacklisted";
};

const roundMoney = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

const normalizeStringList = (value) => {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]+/)
      : [];

  const uniqueValues = new Set();
  source.forEach((entry) => {
    const normalized = String(entry || "").trim();
    if (normalized) {
      uniqueValues.add(normalized);
    }
  });

  return Array.from(uniqueValues);
};

const ACCOUNT_INCOME_TYPES = new Set(["income", "adjustment"]);
const ACCOUNT_EXPENSE_TYPES = new Set([
  "expense",
  "salary",
  "bill",
  "payout",
  "fund_transfer",
]);
const ALLOWED_USER_TYPES = new Set(["admin", "user", "vendor", "staff"]);
const ALLOWED_USER_STATUSES = new Set(["active", "pending", "inactive", "suspended"]);
const ADMIN_PERMISSION_KEYS = [
  "manageOrders",
  "manageProducts",
  "manageUsers",
  "manageReports",
  "manageWebsite",
];
const buildAdminPermissions = (enabled = false) =>
  ADMIN_PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = Boolean(enabled);
    return acc;
  }, {});
const SOCIAL_PROVIDER_MAP = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    profileUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    envClientId: "GOOGLE_CLIENT_ID",
    envClientSecret: "GOOGLE_CLIENT_SECRET",
    envRedirectUri: "GOOGLE_REDIRECT_URI",
    settingsKey: "enableGoogleLogin",
    scope: "openid email profile",
  },
  facebook: {
    authUrl: "https://www.facebook.com/v20.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v20.0/oauth/access_token",
    profileUrl: "https://graph.facebook.com/me",
    envClientId: "FACEBOOK_APP_ID",
    envClientSecret: "FACEBOOK_APP_SECRET",
    envRedirectUri: "FACEBOOK_REDIRECT_URI",
    settingsKey: "enableFacebookLogin",
    scope: "email,public_profile",
  },
};

const normalizeMarketplaceMode = (value) => {
  const mode = String(value || "")
    .trim()
    .toLowerCase();
  return mode === "single" ? "single" : "multi";
};

const PRIMARY_ADMIN_SORT = {
  createdAt: 1,
  _id: 1,
};

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getPrimaryAdminSettings = async () => {
  const primaryAdmin = await User.findOne({ userType: "admin" })
    .sort(PRIMARY_ADMIN_SORT)
    .select("adminSettings")
    .lean();
  return primaryAdmin?.adminSettings || {};
};

const getPrimaryAdminUser = async () =>
  User.findOne({ userType: "admin" })
    .sort(PRIMARY_ADMIN_SORT)
    .select("adminSettings");

const mergeSettingsSection = (currentSettings = {}, incoming = {}, key) => {
  const currentValue = isPlainObject(currentSettings?.[key])
    ? currentSettings[key]
    : {};
  const incomingValue = isPlainObject(incoming?.[key]) ? incoming[key] : {};
  return {
    ...currentValue,
    ...incomingValue,
  };
};

const PUBLIC_SETTINGS_CACHE_TTL_MS = Math.max(
  1000,
  Number(process.env.PUBLIC_SETTINGS_CACHE_TTL_MS || 60000),
);

let publicSettingsCache = {
  value: null,
  expiresAt: 0,
};

const clearPublicSettingsCache = () => {
  publicSettingsCache = {
    value: null,
    expiresAt: 0,
  };
  clearResponseCacheByPrefix("/api/auth/public/settings");
};

const readMarketplaceControl = (settings = {}) => {
  const marketplace = isPlainObject(settings?.marketplace) ? settings.marketplace : {};
  const marketplaceMode = normalizeMarketplaceMode(
    marketplace.marketplaceMode || settings.marketplaceMode || "multi",
  );
  const explicitVendorRegistration =
    marketplace.vendorRegistrationEnabled === undefined
      ? settings.vendorRegistrationEnabled
      : marketplace.vendorRegistrationEnabled;
  const vendorRegistrationEnabled =
    marketplaceMode === "single"
      ? false
      : explicitVendorRegistration === undefined
      ? true
      : Boolean(explicitVendorRegistration);

  return {
    marketplaceMode,
    vendorRegistrationEnabled,
  };
};

const buildPublicSettingsPayload = (settings = {}, { isInitialSetup = false } = {}) => {
  const contact = settings?.contact || {};
  const social = settings?.social || {};
  const policies = settings?.policies || {};
  const integrations = settings?.integrations || {};
  const website = settings?.website || {};
  const invoice = settings?.invoice || {};
  const courier = settings?.courier || {};
  const locations = settings?.locations || {};
  const control = readMarketplaceControl(settings);

  return {
    isInitialSetup: Boolean(isInitialSetup),
    marketplaceMode: control.marketplaceMode,
    vendorRegistrationEnabled: control.vendorRegistrationEnabled,
    website: {
      storeName: String(website.storeName || "E-Commerce").trim(),
      tagline: String(website.tagline || "").trim(),
      logoUrl: String(website.logoUrl || "").trim(),
      themeColor: String(website.themeColor || "#000000").trim(),
      fontFamily: String(website.fontFamily || "inherit").trim(),
    },
    contact: {
      address: String(contact.address || "").trim(),
      addressLink: String(contact.addressLink || "").trim(),
      phone1: String(contact.phone1 || "").trim(),
      phone2: String(contact.phone2 || "").trim(),
      email: String(contact.email || "").trim(),
    },
    social: {
      facebook: String(social.facebook || "").trim(),
      whatsapp: String(social.whatsapp || "").trim(),
      instagram: String(social.instagram || "").trim(),
      youtube: String(social.youtube || "").trim(),
    },
    policies: {
      shipmentPolicy: String(policies.shipmentPolicy || "").trim(),
      deliveryPolicy: String(policies.deliveryPolicy || "").trim(),
      termsConditions: String(policies.termsConditions || "").trim(),
      returnPolicy: String(policies.returnPolicy || "").trim(),
      privacyPolicy: String(policies.privacyPolicy || "").trim(),
    },
    integrations: {
      facebookPixelId: String(integrations.facebookPixelId || "").trim(),
      googleAnalyticsId: String(integrations.googleAnalyticsId || "").trim(),
      gtmId: String(integrations.gtmId || "").trim(),
      customTrackingCode: String(integrations.customTrackingCode || "").trim(),
      enableDataLayer:
        integrations.enableDataLayer === undefined
          ? true
          : Boolean(integrations.enableDataLayer),
      enableGoogleLogin: Boolean(integrations.enableGoogleLogin),
      enableFacebookLogin: Boolean(integrations.enableFacebookLogin),
    },
    invoice: {
      logo: String(invoice.logo || "").trim(),
      address: String(invoice.address || "").trim(),
      footerText: String(invoice.footerText || "").trim(),
    },
    courier: {
      providerName: String(courier.providerName || "").trim(),
      apiBaseUrl: String(courier.apiBaseUrl || "").trim(),
    },
    locations: {
      cityOptions: normalizeStringList(locations.cityOptions || []),
      subCityOptions: normalizeStringList(locations.subCityOptions || []),
    },
  };
};

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

const normalizeAdminPermissions = (value = {}) => {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  return ADMIN_PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = Boolean(source[key]);
    return acc;
  }, buildAdminPermissions(false));
};

const ensureAdminBootstrapFlags = async (userDoc) => {
  if (!isAdmin(userDoc)) return userDoc;

  const currentFlag = userDoc?.adminSettings?.isSuperAdmin;
  if (currentFlag === true || currentFlag === false) {
    return userDoc;
  }

  const primaryAdmin = await User.findOne({ userType: "admin" }).select("_id").lean();
  const isPrimaryAdmin =
    primaryAdmin && String(primaryAdmin._id || "") === String(userDoc?._id || "");

  userDoc.adminSettings = {
    ...(userDoc.adminSettings || {}),
    isSuperAdmin: Boolean(isPrimaryAdmin),
    permissions: normalizeAdminPermissions(
      userDoc?.adminSettings?.permissions ||
        (isPrimaryAdmin ? buildAdminPermissions(true) : buildAdminPermissions(false)),
    ),
  };
  await userDoc.save();
  return userDoc;
};

const getFrontendUrl = () =>
  String(process.env.FRONTEND_URL || "http://localhost:5173")
    .trim()
    .replace(/\/+$/, "");

const getSocialProviderConfig = async (providerKey) => {
  const provider = SOCIAL_PROVIDER_MAP[String(providerKey || "").toLowerCase()];
  if (!provider) {
    return { error: "Unsupported social login provider" };
  }

  const settings = await getPrimaryAdminSettings();
  const integrations = settings?.integrations || {};
  const isEnabled = Boolean(integrations[provider.settingsKey]);

  if (!isEnabled) {
    return { error: `${providerKey} login is disabled` };
  }

  const clientId = String(process.env[provider.envClientId] || "").trim();
  const clientSecret = String(process.env[provider.envClientSecret] || "").trim();
  const redirectUri = String(process.env[provider.envRedirectUri] || "").trim();

  if (!clientId || !clientSecret || !redirectUri) {
    return { error: `${providerKey} OAuth credentials are not configured` };
  }

  return {
    providerKey: String(providerKey).toLowerCase(),
    ...provider,
    clientId,
    clientSecret,
    redirectUri,
  };
};

const redirectSocialResult = (res, { token = "", provider = "", error = "" } = {}) => {
  const targetUrl = new URL(`${getFrontendUrl()}/login`);
  targetUrl.searchParams.set("social", "1");

  if (provider) {
    targetUrl.searchParams.set("provider", String(provider).toLowerCase());
  }

  if (token) {
    targetUrl.searchParams.set("token", token);
  }

  if (error) {
    targetUrl.searchParams.set("socialError", String(error).slice(0, 260));
  }

  return res.redirect(targetUrl.toString());
};

const buildSocialDisplayName = (name, email) => {
  const normalizedName = String(name || "").trim();
  if (normalizedName) return normalizedName.slice(0, 120);
  return String(email || "Social User")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim()
    .slice(0, 120);
};

const generateUniqueSocialPhone = async () => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const suffix = Math.floor(10000000 + Math.random() * 90000000);
    const candidate = `019${suffix}`;
    const exists = await User.findOne({ phone: candidate }).select("_id").lean();
    if (!exists) return candidate;
  }
  throw new Error("Unable to generate a unique phone for social login");
};

const resolveSocialEmail = ({ email, provider, providerUserId }) => {
  const normalized = normalizeEmail(email);
  if (normalized) return normalized;
  return `${String(provider || "social").toLowerCase()}-${String(providerUserId || Date.now())}@social.example.com`;
};

const resolveOrCreateSocialUser = async ({
  email,
  name,
  provider,
  providerUserId,
}) => {
  const normalizedEmail = resolveSocialEmail({ email, provider, providerUserId });

  let user = await User.findOne({ email: normalizedEmail });
  if (user) {
    if (name) {
      user.name = buildSocialDisplayName(name, normalizedEmail);
      await user.save();
    }
    return user;
  }

  const generatedPhone = await generateUniqueSocialPhone();
  const randomPassword = crypto.randomBytes(24).toString("hex");

  user = await User.create({
    name: buildSocialDisplayName(name, normalizedEmail),
    email: normalizedEmail,
    phone: generatedPhone,
    originalPhone: generatedPhone,
    password: randomPassword,
    userType: "user",
    status: "active",
  });

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

    if (isVendorRegistration) {
      const systemSettings = await getPrimaryAdminSettings();
      const control = readMarketplaceControl(systemSettings);

      if (control.marketplaceMode === "single") {
        return res.status(403).json({
          error: "Vendor registration is disabled in single-vendor mode",
        });
      }

      if (!control.vendorRegistrationEnabled) {
        return res.status(403).json({
          error: "Vendor registration is currently disabled by admin",
        });
      }
    }

    const normalizedStoreName = String(
      vendorData.storeName || storeName || "",
    ).trim();

    if (isVendorRegistration && !normalizedStoreName) {
      return res.status(400).json({
        error: "Store name is required for vendor registration",
      });
    }

    const userCount = await User.countDocuments();
    const isFirstRegisteredUser = userCount === 0;
    const userType =
      isFirstRegisteredUser ? "admin" : isVendorRegistration ? "vendor" : "user";
    const adminSettings =
      userType === "admin"
        ? {
            isSuperAdmin: isFirstRegisteredUser,
            permissions: isFirstRegisteredUser
              ? buildAdminPermissions(true)
              : buildAdminPermissions(false),
          }
        : {};

    const user = new User({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      originalPhone: String(phone).trim(),
      password,
      userType,
      adminSettings,
      status: "active",
    });

    await user.save();
    clearPublicSettingsCache();

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
    await ensureAdminBootstrapFlags(user);
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

const beginSocialLogin = async (res, providerKey) => {
  const config = await getSocialProviderConfig(providerKey);
  if (config.error) {
    return redirectSocialResult(res, {
      provider: providerKey,
      error: config.error,
    });
  }

  const state = crypto.randomBytes(12).toString("hex");
  const authUrl = new URL(config.authUrl);

  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", config.scope);
  authUrl.searchParams.set("state", state);

  if (config.providerKey === "google") {
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "select_account");
  }

  return res.redirect(authUrl.toString());
};

exports.startGoogleLogin = async (_req, res) => {
  try {
    return await beginSocialLogin(res, "google");
  } catch (error) {
    console.error("Start Google login error:", error);
    return redirectSocialResult(res, {
      provider: "google",
      error: "Unable to start Google login",
    });
  }
};

exports.startFacebookLogin = async (_req, res) => {
  try {
    return await beginSocialLogin(res, "facebook");
  } catch (error) {
    console.error("Start Facebook login error:", error);
    return redirectSocialResult(res, {
      provider: "facebook",
      error: "Unable to start Facebook login",
    });
  }
};

exports.handleGoogleLoginCallback = async (req, res) => {
  try {
    const code = String(req.query?.code || "").trim();
    if (!code) {
      return redirectSocialResult(res, {
        provider: "google",
        error: "Google authorization failed",
      });
    }

    const config = await getSocialProviderConfig("google");
    if (config.error) {
      return redirectSocialResult(res, {
        provider: "google",
        error: config.error,
      });
    }

    const tokenPayload = new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    });

    const tokenResponse = await axios.post(config.tokenUrl, tokenPayload.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 10000,
    });

    const accessToken = String(tokenResponse.data?.access_token || "").trim();
    if (!accessToken) {
      return redirectSocialResult(res, {
        provider: "google",
        error: "Google token exchange failed",
      });
    }

    const profileResponse = await axios.get(config.profileUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 10000,
    });

    const profile = profileResponse.data || {};
    const user = await resolveOrCreateSocialUser({
      email: profile?.email,
      name: profile?.name,
      provider: "google",
      providerUserId: profile?.id,
    });

    const token = await user.generateAuthToken();
    return redirectSocialResult(res, {
      provider: "google",
      token,
    });
  } catch (error) {
    console.error("Google login callback error:", error?.response?.data || error);
    return redirectSocialResult(res, {
      provider: "google",
      error: "Google login failed",
    });
  }
};

exports.handleFacebookLoginCallback = async (req, res) => {
  try {
    const code = String(req.query?.code || "").trim();
    if (!code) {
      return redirectSocialResult(res, {
        provider: "facebook",
        error: "Facebook authorization failed",
      });
    }

    const config = await getSocialProviderConfig("facebook");
    if (config.error) {
      return redirectSocialResult(res, {
        provider: "facebook",
        error: config.error,
      });
    }

    const tokenResponse = await axios.get(config.tokenUrl, {
      params: {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code,
      },
      timeout: 10000,
    });

    const accessToken = String(tokenResponse.data?.access_token || "").trim();
    if (!accessToken) {
      return redirectSocialResult(res, {
        provider: "facebook",
        error: "Facebook token exchange failed",
      });
    }

    const profileResponse = await axios.get(config.profileUrl, {
      params: {
        fields: "id,name,email",
        access_token: accessToken,
      },
      timeout: 10000,
    });

    const profile = profileResponse.data || {};
    const user = await resolveOrCreateSocialUser({
      email: profile?.email,
      name: profile?.name,
      provider: "facebook",
      providerUserId: profile?.id,
    });

    const token = await user.generateAuthToken();
    return redirectSocialResult(res, {
      provider: "facebook",
      token,
    });
  } catch (error) {
    console.error("Facebook login callback error:", error?.response?.data || error);
    return redirectSocialResult(res, {
      provider: "facebook",
      error: "Facebook login failed",
    });
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
  if (isAdmin(req.user)) {
    await ensureAdminBootstrapFlags(req.user);
  }
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

    const primarySettings = await getPrimaryAdminSettings();
    const control = readMarketplaceControl(primarySettings);
    const marketplace = isPlainObject(primarySettings?.marketplace)
      ? primarySettings.marketplace
      : {};

    return res.json({
      ...primarySettings,
      marketplaceMode: control.marketplaceMode,
      vendorRegistrationEnabled: control.vendorRegistrationEnabled,
      marketplace: {
        ...marketplace,
        marketplaceMode: control.marketplaceMode,
        vendorRegistrationEnabled: control.vendorRegistrationEnabled,
      },
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

exports.getPublicSettings = async (_req, res) => {
  try {
    const now = Date.now();
    if (publicSettingsCache.value && publicSettingsCache.expiresAt > now) {
      return res.json(publicSettingsCache.value);
    }

    const [settings, totalUsers] = await Promise.all([
      getPrimaryAdminSettings(),
      User.countDocuments(),
    ]);
    const payload = {
      success: true,
      settings: buildPublicSettingsPayload(settings, {
        isInitialSetup: Number(totalUsers || 0) === 0,
      }),
    };

    publicSettingsCache = {
      value: payload,
      expiresAt: now + PUBLIC_SETTINGS_CACHE_TTL_MS,
    };

    return res.json(payload);
  } catch (error) {
    console.error("Get public settings error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const primaryAdmin = await getPrimaryAdminUser();
    if (!primaryAdmin) {
      return res.status(404).json({ error: "Primary admin account not found" });
    }

    const currentSettings = isPlainObject(primaryAdmin.adminSettings)
      ? primaryAdmin.adminSettings
      : {};
    const incoming = isPlainObject(req.body) ? req.body : {};
    const currentControl = readMarketplaceControl(currentSettings);
    const incomingMarketplace = isPlainObject(incoming.marketplace)
      ? incoming.marketplace
      : {};
    const requestedMode = normalizeMarketplaceMode(
      incomingMarketplace.marketplaceMode ||
        incoming.marketplaceMode ||
        currentControl.marketplaceMode,
    );
    const requestedVendorRegistrationInput =
      incomingMarketplace.vendorRegistrationEnabled !== undefined
        ? incomingMarketplace.vendorRegistrationEnabled
        : incoming.vendorRegistrationEnabled;
    const requestedVendorRegistration =
      requestedMode === "single"
        ? false
        : requestedVendorRegistrationInput === undefined
          ? currentControl.vendorRegistrationEnabled
          : Boolean(requestedVendorRegistrationInput);

    const nextSettings = {
      ...currentSettings,
      ...incoming,
      website: mergeSettingsSection(currentSettings, incoming, "website"),
      contact: mergeSettingsSection(currentSettings, incoming, "contact"),
      social: mergeSettingsSection(currentSettings, incoming, "social"),
      policies: mergeSettingsSection(currentSettings, incoming, "policies"),
      integrations: mergeSettingsSection(currentSettings, incoming, "integrations"),
      invoice: mergeSettingsSection(currentSettings, incoming, "invoice"),
      courier: mergeSettingsSection(currentSettings, incoming, "courier"),
      locations: mergeSettingsSection(currentSettings, incoming, "locations"),
      marketplaceMode: requestedMode,
      vendorRegistrationEnabled: requestedVendorRegistration,
      marketplace: {
        ...(isPlainObject(currentSettings.marketplace) ? currentSettings.marketplace : {}),
        ...incomingMarketplace,
        marketplaceMode: requestedMode,
        vendorRegistrationEnabled: requestedVendorRegistration,
      },
    };

    primaryAdmin.adminSettings = nextSettings;
    await primaryAdmin.save();
    await readMarketplaceMode({ force: true });
    clearPublicSettingsCache();
    const control = readMarketplaceControl(nextSettings);

    return res.json({
      message: "Settings updated successfully",
      settings: {
        ...nextSettings,
        marketplaceMode: control.marketplaceMode,
        vendorRegistrationEnabled: control.vendorRegistrationEnabled,
        marketplace: {
          ...(isPlainObject(nextSettings.marketplace) ? nextSettings.marketplace : {}),
          marketplaceMode: control.marketplaceMode,
          vendorRegistrationEnabled: control.vendorRegistrationEnabled,
        },
      },
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

exports.getMarketplaceControlOverview = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ error: "Super admin access required" });
    }

    const settings = await getPrimaryAdminSettings();
    const control = readMarketplaceControl(settings);

    const now = new Date();
    const last30Days = new Date(now);
    last30Days.setDate(last30Days.getDate() - 30);

    const [vendorStatusRows, totalUsers, activeUsers, pendingUsers, totalOrders] =
      await Promise.all([
        Vendor.aggregate([
          {
            $group: {
              _id: {
                $toLower: {
                  $ifNull: ["$status", "unknown"],
                },
              },
              count: { $sum: 1 },
            },
          },
        ]),
        User.countDocuments({ userType: { $ne: "admin" } }),
        User.countDocuments({
          userType: { $ne: "admin" },
          status: "active",
        }),
        User.countDocuments({
          userType: { $ne: "admin" },
          status: "pending",
        }),
        Order.countDocuments({}),
      ]);

    const [salesRows, last30SalesRows, recentOrders, recentUsers] = await Promise.all([
      Order.aggregate([
        {
          $project: {
            normalizedStatus: { $toLower: { $ifNull: ["$orderStatus", ""] } },
            total: { $ifNull: ["$total", 0] },
          },
        },
        { $match: { normalizedStatus: "delivered" } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$total" },
          },
        },
      ]),
      Order.aggregate([
        {
          $project: {
            createdAt: 1,
            normalizedStatus: { $toLower: { $ifNull: ["$orderStatus", ""] } },
            total: { $ifNull: ["$total", 0] },
          },
        },
        {
          $match: {
            normalizedStatus: "delivered",
            createdAt: { $gte: last30Days },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$total" },
            totalOrders: { $sum: 1 },
          },
        },
      ]),
      Order.find()
        .select("orderNumber orderStatus total createdAt shippingAddress")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      User.find({ userType: { $ne: "admin" } })
        .select("name email phone originalPhone userType status createdAt lastLogin")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    const vendorCounts = {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      suspended: 0,
    };

    vendorStatusRows.forEach((row) => {
      const status = String(row?._id || "").trim().toLowerCase();
      const count = Number(row?.count || 0);
      vendorCounts.total += count;
      if (Object.prototype.hasOwnProperty.call(vendorCounts, status)) {
        vendorCounts[status] += count;
      }
    });

    const totalRevenue = roundMoney(salesRows?.[0]?.totalRevenue || 0);
    const last30DaysRevenue = roundMoney(last30SalesRows?.[0]?.totalRevenue || 0);
    const last30DaysOrders = Number(last30SalesRows?.[0]?.totalOrders || 0);

    return res.json({
      success: true,
      control,
      vendors: vendorCounts,
      activity: {
        totalUsers,
        activeUsers,
        pendingUsers,
        totalOrders,
        totalRevenue,
        last30DaysOrders,
        last30DaysRevenue,
        recentOrders: recentOrders.map((order) => ({
          orderNumber: order.orderNumber,
          status: order.orderStatus,
          total: roundMoney(order.total),
          customerName: `${String(order?.shippingAddress?.firstName || "").trim()} ${String(
            order?.shippingAddress?.lastName || "",
          ).trim()}`.trim(),
          createdAt: order.createdAt,
        })),
        recentUsers: recentUsers.map((account) => ({
          name: account.name || "",
          email: account.email || "",
          phone: account.originalPhone || account.phone || "",
          userType: account.userType || "user",
          status: account.status || "active",
          createdAt: account.createdAt,
          lastLogin: account.lastLogin || null,
        })),
      },
    });
  } catch (error) {
    console.error("Get marketplace control overview error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while loading marketplace control overview",
    });
  }
};

exports.updateMarketplaceControl = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ error: "Super admin access required" });
    }

    const primaryAdmin = await getPrimaryAdminUser();
    if (!primaryAdmin) {
      return res.status(404).json({
        success: false,
        message: "Primary admin account not found",
      });
    }

    const requestedMode = normalizeMarketplaceMode(req.body?.marketplaceMode || "multi");
    const currentSettings = primaryAdmin.adminSettings || {};
    const currentControl = readMarketplaceControl(currentSettings);
    const requestedVendorRegistration =
      requestedMode === "single"
        ? false
        : req.body?.vendorRegistrationEnabled === undefined
        ? currentControl.vendorRegistrationEnabled
        : Boolean(req.body.vendorRegistrationEnabled);

    primaryAdmin.adminSettings = {
      ...currentSettings,
      marketplaceMode: requestedMode,
      vendorRegistrationEnabled: requestedVendorRegistration,
      marketplace: {
        ...(currentSettings.marketplace || {}),
        marketplaceMode: requestedMode,
        vendorRegistrationEnabled: requestedVendorRegistration,
      },
    };

    await primaryAdmin.save();
    await readMarketplaceMode({ force: true });
    clearPublicSettingsCache();

    return res.json({
      success: true,
      message: "Marketplace control updated successfully",
      control: readMarketplaceControl(primaryAdmin.adminSettings || {}),
    });
  } catch (error) {
    console.error("Update marketplace control error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating marketplace control",
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    if (!hasAdminPermission(req.user, "manageUsers")) {
      return res.status(403).json({ error: "Permission denied: manageUsers required" });
    }

    const users = await User.find()
      .select(
        "name email phone originalPhone userType status createdAt lastLogin isBlacklisted blacklistReason adminNotes adminSettings",
      )
      .sort({ createdAt: -1 });

    return res.json(users.map((user) => toSafeUser(user)));
  } catch (error) {
    console.error("Get all users error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

exports.updateUserByAdmin = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    if (!hasAdminPermission(req.user, "manageUsers")) {
      return res.status(403).json({ error: "Permission denied: manageUsers required" });
    }

    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const actingAdminId = String(req.user?._id || "");
    const targetUserId = String(targetUser._id || "");
    const requestedType = req.body?.userType;
    const requestedStatus = req.body?.status;
    const requestedBlacklist = req.body?.isBlacklisted;
    const requestedBlacklistReason = req.body?.blacklistReason;
    const requestedNotes = req.body?.adminNotes;
    const requestedAdminPermissions = req.body?.adminPermissions;
    const actingIsSuperAdmin = isSuperAdmin(req.user);
    const currentTargetType = String(targetUser.userType || "")
      .trim()
      .toLowerCase();
    const targetIsSuperAdmin = Boolean(targetUser?.adminSettings?.isSuperAdmin);

    if (currentTargetType === "admin" && !actingIsSuperAdmin && actingAdminId !== targetUserId) {
      return res.status(403).json({
        error: "Only super admin can manage other admin accounts",
      });
    }

    if (targetIsSuperAdmin && actingAdminId !== targetUserId) {
      return res.status(403).json({
        error: "Super admin account can only be managed by super admin",
      });
    }

    if (requestedType !== undefined) {
      const normalizedType = String(requestedType || "")
        .trim()
        .toLowerCase();
      if (!ALLOWED_USER_TYPES.has(normalizedType)) {
        return res.status(400).json({ error: "Invalid user type" });
      }

      const isPromotingToAdmin = currentTargetType !== "admin" && normalizedType === "admin";
      if (isPromotingToAdmin && !actingIsSuperAdmin) {
        return res.status(403).json({
          error: "Only super admin can create admin accounts",
        });
      }

      if (currentTargetType === "admin" && normalizedType !== "admin" && !actingIsSuperAdmin) {
        return res.status(403).json({
          error: "Only super admin can change admin role",
        });
      }

      if (actingAdminId === targetUserId && normalizedType !== "admin") {
        return res
          .status(400)
          .json({ error: "You cannot remove admin role from your own account" });
      }

      if (String(targetUser.userType || "").toLowerCase() === "admin" && normalizedType !== "admin") {
        const adminCount = await User.countDocuments({ userType: "admin" });
        if (adminCount <= 1) {
          return res.status(400).json({ error: "At least one admin account must remain" });
        }
      }

      targetUser.userType = normalizedType;

      if (isPromotingToAdmin) {
        targetUser.adminSettings = {
          ...(targetUser.adminSettings || {}),
          isSuperAdmin: false,
          permissions: normalizeAdminPermissions(
            requestedAdminPermissions || buildAdminPermissions(true),
          ),
        };
      }

      if (currentTargetType === "admin" && normalizedType !== "admin") {
        targetUser.adminSettings = {
          ...(targetUser.adminSettings || {}),
          isSuperAdmin: false,
          permissions: normalizeAdminPermissions({}),
        };
      }
    }

    if (requestedStatus !== undefined) {
      const normalizedStatus = String(requestedStatus || "")
        .trim()
        .toLowerCase();
      if (!ALLOWED_USER_STATUSES.has(normalizedStatus)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      if (actingAdminId === targetUserId && normalizedStatus !== "active") {
        return res
          .status(400)
          .json({ error: "You cannot deactivate your own account" });
      }

      targetUser.status = normalizedStatus;
    }

    if (requestedBlacklist !== undefined) {
      if (String(targetUser.userType || "").toLowerCase() === "admin") {
        return res.status(400).json({ error: "Admin user cannot be blacklisted" });
      }
      const blacklisted = Boolean(requestedBlacklist);
      targetUser.isBlacklisted = blacklisted;
      targetUser.blacklistReason = blacklisted
        ? String(requestedBlacklistReason || "").trim()
        : "";
    }

    if (requestedNotes !== undefined) {
      targetUser.adminNotes = String(requestedNotes || "").trim();
    }

    if (requestedAdminPermissions !== undefined) {
      if (String(targetUser.userType || "").toLowerCase() === "admin" && !actingIsSuperAdmin) {
        return res.status(403).json({
          error: "Only super admin can change admin permissions",
        });
      }

      const normalizedPermissions = ["admin", "staff"].includes(
        String(targetUser.userType || "").toLowerCase(),
      )
        ? normalizeAdminPermissions(requestedAdminPermissions)
        : normalizeAdminPermissions({});
      targetUser.adminSettings = {
        ...(targetUser.adminSettings || {}),
        isSuperAdmin:
          String(targetUser.userType || "").toLowerCase() === "admin"
            ? Boolean(targetUser?.adminSettings?.isSuperAdmin)
            : false,
        permissions: normalizedPermissions,
      };
    }

    await targetUser.save();

    return res.json({
      success: true,
      message: "User updated successfully",
      user: toSafeUser(targetUser),
    });
  } catch (error) {
    console.error("Update user by admin error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

exports.createAdminUser = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ error: "Super admin access required" });
    }

    const {
      name,
      email,
      phone,
      password,
      status = "active",
      adminPermissions,
    } = req.body || {};

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        error: "Name, email, phone and password are required",
      });
    }

    if (!validator.isEmail(String(email || "").trim())) {
      return res.status(400).json({
        error: "Invalid email address",
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

    const normalizedStatus = String(status || "active")
      .trim()
      .toLowerCase();
    if (!ALLOWED_USER_STATUSES.has(normalizedStatus)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = User.normalizePhone(phone);
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    }).lean();

    if (existingUser) {
      if (String(existingUser.email || "").toLowerCase() === normalizedEmail) {
        return res.status(400).json({ error: "Email already in use" });
      }
      return res.status(400).json({ error: "Phone number already in use" });
    }

    const user = new User({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      originalPhone: String(phone).trim(),
      password,
      userType: "admin",
      status: normalizedStatus,
      adminSettings: {
        isSuperAdmin: false,
        permissions: normalizeAdminPermissions(
          adminPermissions && typeof adminPermissions === "object"
            ? adminPermissions
            : buildAdminPermissions(true),
        ),
      },
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully",
      user: toSafeUser(user),
    });
  } catch (error) {
    console.error("Create admin user error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

exports.getSystemStats = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [nonAdminUsers, allOrders, inventoryRows, purchaseRows, accountRows, abandonedRows] =
      await Promise.all([
        User.find({ userType: { $ne: "admin" } }).select("status").lean(),
        Order.find()
          .select("orderNumber createdAt orderStatus total shippingAddress")
          .sort({ createdAt: -1 })
          .lean(),
        Product.find()
          .select("stock lowStockThreshold")
          .lean(),
        Purchase.find()
          .select("totalAmount")
          .lean(),
        AccountEntry.find()
          .select("type amount")
          .lean(),
        AbandonedOrder.find({ status: { $in: ["new", "follow_up"] } })
          .select("total")
          .lean(),
      ]);

    const totalUsers = nonAdminUsers.length;
    const activeUsers = nonAdminUsers.filter((user) => user.status === "active").length;
    const pendingUsers = nonAdminUsers.filter((user) => user.status === "pending").length;

    const orderStats = {
      total: allOrders.length,
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
    };

    let todaySales = 0;
    let monthlySales = 0;
    let totalRevenue = 0;

    const riskMap = new Map();

    allOrders.forEach((order) => {
      const status = String(order.orderStatus || "").toLowerCase();
      if (Object.prototype.hasOwnProperty.call(orderStats, status)) {
        orderStats[status] += 1;
      }

      const orderDate = order.createdAt ? new Date(order.createdAt) : null;
      const orderTotal = Number(order.total || 0);

      if (status === "delivered") {
        totalRevenue += orderTotal;
        if (orderDate && orderDate >= startOfToday) {
          todaySales += orderTotal;
        }
        if (orderDate && orderDate >= startOfMonth) {
          monthlySales += orderTotal;
        }
      }

      const customerKey = [
        String(order?.shippingAddress?.phone || "").trim(),
        String(order?.shippingAddress?.email || "").trim().toLowerCase(),
      ]
        .filter(Boolean)
        .join("|");

      if (!customerKey) return;

      if (!riskMap.has(customerKey)) {
        riskMap.set(customerKey, { totalOrders: 0, deliveredOrders: 0 });
      }
      const entry = riskMap.get(customerKey);
      entry.totalOrders += 1;
      if (status === "delivered") {
        entry.deliveredOrders += 1;
      }
    });

    let highRiskCustomers = 0;
    for (const entry of riskMap.values()) {
      const successRate =
        entry.totalOrders > 0 ? (entry.deliveredOrders / entry.totalOrders) * 100 : 0;
      const riskLevel = classifyRiskLevel(successRate, entry.totalOrders);
      if (riskLevel === "high" || riskLevel === "blacklisted") {
        highRiskCustomers += 1;
      }
    }

    const purchaseExpense = purchaseRows.reduce(
      (sum, row) => sum + Number(row.totalAmount || 0),
      0,
    );

    let accountIncome = 0;
    let accountExpense = 0;
    accountRows.forEach((entry) => {
      const type = String(entry.type || "").toLowerCase();
      const amount = Number(entry.amount || 0);
      if (ACCOUNT_INCOME_TYPES.has(type)) {
        accountIncome += amount;
      }
      if (ACCOUNT_EXPENSE_TYPES.has(type)) {
        accountExpense += amount;
      }
    });

    const totalExpense = purchaseExpense + accountExpense;
    const netProfit = totalRevenue + accountIncome - totalExpense;

    let totalStock = 0;
    let lowStockAlerts = 0;
    let outOfStock = 0;
    inventoryRows.forEach((row) => {
      const stock = Number(row.stock || 0);
      const threshold = Number(row.lowStockThreshold || 0);
      totalStock += stock;
      if (stock <= 0) {
        outOfStock += 1;
      } else if (stock <= threshold) {
        lowStockAlerts += 1;
      }
    });

    const abandonedOrders = abandonedRows.length;
    const abandonedValue = abandonedRows.reduce(
      (sum, row) => sum + Number(row.total || 0),
      0,
    );

    const recentOrders = allOrders.slice(0, 8).map((order) => ({
      orderNumber: order.orderNumber,
      status: order.orderStatus,
      total: roundMoney(order.total),
      customerName: `${String(order?.shippingAddress?.firstName || "").trim()} ${String(
        order?.shippingAddress?.lastName || "",
      ).trim()}`.trim(),
      createdAt: order.createdAt,
    }));

    return res.json({
      totalUsers,
      activeUsers,
      pendingUsers,
      totalRevenue: roundMoney(totalRevenue),
      sales: {
        today: roundMoney(todaySales),
        monthly: roundMoney(monthlySales),
        total: roundMoney(totalRevenue),
      },
      orders: orderStats,
      financials: {
        revenue: roundMoney(totalRevenue),
        otherIncome: roundMoney(accountIncome),
        expense: roundMoney(totalExpense),
        netProfit: roundMoney(netProfit),
      },
      inventory: {
        totalProducts: inventoryRows.length,
        totalStock: Math.max(0, Number(totalStock || 0)),
        lowStockAlerts,
        outOfStock,
      },
      customerInsights: {
        abandonedOrders,
        abandonedValue: roundMoney(abandonedValue),
        highRiskCustomers,
        recentOrders,
      },
    });
  } catch (error) {
    console.error("Get system stats error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

exports.getCustomerRiskProfiles = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const search = String(req.query?.search || "").trim().toLowerCase();
    const risk = String(req.query?.risk || "").trim().toLowerCase();
    const blacklistedOnly = String(req.query?.blacklisted || "").trim().toLowerCase() === "true";

    const orders = await Order.find()
      .select("shippingAddress orderStatus total createdAt user")
      .sort({ createdAt: -1 })
      .lean();

    const users = await User.find()
      .select(
        "_id name email phone originalPhone userType status isBlacklisted blacklistReason adminNotes createdAt",
      )
      .lean();

    const userByPhone = new Map();
    const userByEmail = new Map();
    const userById = new Map();

    for (const user of users) {
      const normalizedPhone = User.normalizePhone(user?.phone || user?.originalPhone || "");
      const normalizedMail = normalizeEmail(user?.email || "");
      if (normalizedPhone) userByPhone.set(normalizedPhone, user);
      if (normalizedMail) userByEmail.set(normalizedMail, user);
      userById.set(String(user._id), user);
    }

    const profileMap = new Map();

    for (const order of orders) {
      const shipping = order?.shippingAddress || {};
      const phone = User.normalizePhone(shipping.phone || "");
      const email = normalizeEmail(shipping.email || "");
      const key = phone || email;
      if (!key) continue;

      const matchedUser = order?.user
        ? userById.get(String(order.user))
        : userByPhone.get(phone) || userByEmail.get(email) || null;

      if (!profileMap.has(key)) {
        profileMap.set(key, {
          key,
          customerId: matchedUser?._id || null,
          customerName:
            matchedUser?.name ||
            `${shipping.firstName || ""} ${shipping.lastName || ""}`.trim() ||
            "Guest Customer",
          phone: phone || "",
          email: email || "",
          totalOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          returnedOrders: 0,
          exchangeOrders: 0,
          totalRevenue: 0,
          lastOrderDate: null,
          isBlacklisted: Boolean(matchedUser?.isBlacklisted),
          blacklistReason: matchedUser?.blacklistReason || "",
          adminNotes: matchedUser?.adminNotes || "",
          userType: matchedUser?.userType || "guest",
        });
      }

      const profile = profileMap.get(key);
      profile.totalOrders += 1;

      const orderStatus = String(order.orderStatus || "").toLowerCase();
      if (orderStatus === "delivered") {
        profile.deliveredOrders += 1;
        profile.totalRevenue += Number(order.total || 0);
      } else if (orderStatus === "cancelled") {
        profile.cancelledOrders += 1;
      } else if (orderStatus === "returned") {
        profile.returnedOrders += 1;
      } else if (orderStatus === "exchange") {
        profile.exchangeOrders += 1;
      }

      const createdAt = order.createdAt ? new Date(order.createdAt) : null;
      if (createdAt && (!profile.lastOrderDate || createdAt > new Date(profile.lastOrderDate))) {
        profile.lastOrderDate = createdAt;
      }

      if (!profile.customerId && matchedUser?._id) {
        profile.customerId = matchedUser._id;
        profile.customerName = matchedUser.name || profile.customerName;
        profile.isBlacklisted = Boolean(matchedUser.isBlacklisted);
        profile.blacklistReason = matchedUser.blacklistReason || "";
        profile.adminNotes = matchedUser.adminNotes || "";
        profile.userType = matchedUser.userType || profile.userType;
      }
    }

    let profiles = Array.from(profileMap.values()).map((entry) => {
      const successRate =
        entry.totalOrders > 0 ? (entry.deliveredOrders / entry.totalOrders) * 100 : 0;
      const riskLevel = entry.isBlacklisted
        ? "blacklisted"
        : classifyRiskLevel(successRate, entry.totalOrders);

      return {
        ...entry,
        successRate: Number(successRate.toFixed(2)),
        riskLevel,
      };
    });

    if (search) {
      profiles = profiles.filter((entry) =>
        [entry.customerName, entry.phone, entry.email, entry.blacklistReason, entry.adminNotes]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search)),
      );
    }

    if (risk && ["new", "trusted", "medium", "high", "blacklisted"].includes(risk)) {
      profiles = profiles.filter((entry) => entry.riskLevel === risk);
    }

    if (blacklistedOnly) {
      profiles = profiles.filter((entry) => entry.isBlacklisted);
    }

    profiles.sort((a, b) => {
      if (a.isBlacklisted !== b.isBlacklisted) return a.isBlacklisted ? -1 : 1;
      return Number(b.totalOrders || 0) - Number(a.totalOrders || 0);
    });

    return res.json({
      success: true,
      profiles,
      summary: {
        totalProfiles: profiles.length,
        blacklisted: profiles.filter((entry) => entry.isBlacklisted).length,
        trusted: profiles.filter((entry) => entry.riskLevel === "trusted").length,
        highRisk: profiles.filter((entry) => ["high", "blacklisted"].includes(entry.riskLevel))
          .length,
      },
    });
  } catch (error) {
    console.error("Get customer risk profiles error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

exports.getCustomerProfileByAdmin = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { userId } = req.params;
    const user = await User.findById(userId)
      .select(
        "_id name email phone originalPhone userType status isBlacklisted blacklistReason adminNotes createdAt lastLogin",
      )
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const normalizedEmail = normalizeEmail(user.email || "");
    const normalizedPhone = User.normalizePhone(user.phone || user.originalPhone || "");
    const rawPhone = String(user.originalPhone || user.phone || "").trim();

    const orderConditions = [{ user: user._id }];
    if (normalizedEmail) {
      orderConditions.push({ "shippingAddress.email": normalizedEmail });
    }
    if (normalizedPhone) {
      orderConditions.push({ "shippingAddress.phone": normalizedPhone });
    }
    if (rawPhone) {
      orderConditions.push({ "shippingAddress.phone": rawPhone });
    }

    const orders = await Order.find({ $or: orderConditions })
      .select(
        "orderNumber orderStatus total subtotal shippingFee discount paymentStatus paymentMethod createdAt source shippingAddress",
      )
      .sort({ createdAt: -1 })
      .lean();

    const metrics = {
      totalOrders: orders.length,
      deliveredOrders: 0,
      cancelledOrders: 0,
      returnedOrders: 0,
      exchangeOrders: 0,
      totalRevenue: 0,
      totalOrderValue: 0,
      lastOrderDate: orders[0]?.createdAt || null,
    };

    orders.forEach((order) => {
      const status = String(order.orderStatus || "").toLowerCase();
      const total = Number(order.total || 0);
      metrics.totalOrderValue += total;

      if (status === "delivered") {
        metrics.deliveredOrders += 1;
        metrics.totalRevenue += total;
      } else if (status === "cancelled") {
        metrics.cancelledOrders += 1;
      } else if (status === "returned") {
        metrics.returnedOrders += 1;
      } else if (status === "exchange") {
        metrics.exchangeOrders += 1;
      }
    });

    const successRate =
      metrics.totalOrders > 0
        ? (metrics.deliveredOrders / metrics.totalOrders) * 100
        : 0;

    const riskLevel = user.isBlacklisted
      ? "blacklisted"
      : classifyRiskLevel(successRate, metrics.totalOrders);

    return res.json({
      success: true,
      profile: {
        customerId: user._id,
        name: user.name || "",
        email: user.email || "",
        phone: user.originalPhone || user.phone || "",
        userType: user.userType || "user",
        status: user.status || "active",
        isBlacklisted: Boolean(user.isBlacklisted),
        blacklistReason: user.blacklistReason || "",
        adminNotes: user.adminNotes || "",
        createdAt: user.createdAt || null,
        lastLogin: user.lastLogin || null,
      },
      metrics: {
        ...metrics,
        totalRevenue: roundMoney(metrics.totalRevenue),
        totalOrderValue: roundMoney(metrics.totalOrderValue),
        successRate: roundMoney(successRate),
        riskLevel,
      },
      orderHistory: orders.slice(0, 100).map((order) => ({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        subtotal: roundMoney(order.subtotal),
        shippingFee: roundMoney(order.shippingFee),
        discount: roundMoney(order.discount),
        total: roundMoney(order.total),
        source: order.source || "shop",
      })),
    });
  } catch (error) {
    console.error("Get customer profile by admin error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

exports.updateCustomerBlacklist = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { userId } = req.params;
    const isBlacklisted = Boolean(req.body?.isBlacklisted);
    const blacklistReason = String(req.body?.blacklistReason || "").trim();
    const adminNotes = String(req.body?.adminNotes || "").trim();

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (String(user.userType || "").toLowerCase() === "admin") {
      return res.status(400).json({ error: "Admin user cannot be blacklisted" });
    }

    user.isBlacklisted = isBlacklisted;
    user.blacklistReason = isBlacklisted ? blacklistReason : "";
    if (adminNotes !== "") {
      user.adminNotes = adminNotes;
    }

    await user.save();

    return res.json({
      success: true,
      message: isBlacklisted ? "Customer blacklisted" : "Customer removed from blacklist",
      user: toSafeUser(user),
    });
  } catch (error) {
    console.error("Update customer blacklist error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};
