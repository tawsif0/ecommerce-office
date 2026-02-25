// models/Cart.js
const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"],
    default: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0, "Unit price cannot be negative"],
    default: 0,
  },
  variationId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  variationLabel: {
    type: String,
    default: "",
    trim: true,
  },
  color: {
    type: String,
    default: "",
  },
  dimensions: {
    type: String,
    default: "",
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  items: [cartItemSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field on update
cartSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  next();
});

// Ensure user can only have one cart
cartSchema.index({ user: 1 }, { unique: true });

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
