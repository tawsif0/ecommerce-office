const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    default: "",
    maxlength: [200, "Banner title cannot exceed 200 characters"],
  },
  description: {
    type: String,
    trim: true,
    default: "",
  },
  image: {
    type: String,
    trim: true,
    default: "",
  },
  imagePublicId: {
    type: String,
    trim: true,
    default: "",
  },
  thumb: {
    type: String,
    trim: true,
    default: "",
  },
  thumbPublicId: {
    type: String,
    trim: true,
    default: "",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

bannerSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

const Banner = mongoose.model("Banner", bannerSchema);

module.exports = Banner;
