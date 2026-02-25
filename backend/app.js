const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const errorHandler = require("./middlewares/errorHandler");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const couponRoutes = require("./routes/couponRoutes");
const bannerRoutes = require("./routes/bannerRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const shippingRoutes = require("./routes/shippingRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const auctionRoutes = require("./routes/auctionRoutes");
const staffRoutes = require("./routes/staffRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const adsRoutes = require("./routes/adsRoutes");
const supportTicketRoutes = require("./routes/supportTicketRoutes");
const path = require("path");

const app = express();

// Configure CORS properly
const allowedOrigins = [
  process.env.FRONTEND_URL, // Primary frontend URL
  "http://localhost:5173", // Local development
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    // Check if the origin is in the allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS blocked for origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
};

// Security middleware
app.use(helmet());
app.use(cors(corsOptions)); // Use configured CORS options
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use(
  "/uploads/products",
  express.static(path.join(__dirname, "uploads/products")),
  (req, res, next) => {
    res.setHeader(
      "Access-Control-Allow-Origin",
      process.env.FRONTEND_URL || "http://localhost:5173",
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    next();
  },
);

// Also serve under /api/uploads for API consistency
app.use(
  "/api/uploads",
  express.static(path.join(__dirname, "uploads")),
  (req, res, next) => {
    res.setHeader(
      "Access-Control-Allow-Origin",
      process.env.FRONTEND_URL || "http://localhost:5173",
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    next();
  },
);

// Add this static file serving for banner uploads (add with other static file serving)
app.use(
  "/uploads/banners",
  express.static(path.join(__dirname, "uploads/banners")),
  (req, res, next) => {
    res.setHeader(
      "Access-Control-Allow-Origin",
      process.env.FRONTEND_URL || "http://localhost:5173",
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    next();
  },
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/shipping", shippingRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/auctions", auctionRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/verifications", verificationRoutes);
app.use("/api/ads", adsRoutes);
app.use("/api/support-tickets", supportTicketRoutes);
// Error handling middleware
app.use(errorHandler);

module.exports = app;
