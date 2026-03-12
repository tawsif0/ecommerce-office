/**
 * Seed sample categories, products, and banners with realistic data.
 * Run: `node backend/scripts/seedSampleData.js`
 */
const path = require("path");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Banner = require("../models/Banner");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce_db";
// Point to images served by backend static /uploads
const apiBase = process.env.API_PUBLIC_URL || "http://localhost:5000";
const publicImage = (fileName) =>
  `${apiBase}/uploads/products/${encodeURIComponent(fileName)}`;

const categorySeeds = [
  { name: "Headphones", type: "Popular" },
  { name: "Earbuds", type: "Best Selling" },
  { name: "Smartwatches", type: "Latest" },
  { name: "Speakers", type: "Hot deals" },
  { name: "Microphones", type: "Popular" },
];

const bannerSeeds = [
  {
    title: "Summer Audio Fest",
    description: "Noise-canceling best sellers with up to 35% savings.",
    image: `${apiBase}/uploads/banners/${encodeURIComponent("Summer Audio Fest.png")}`,
  },
  {
    title: "Work From Anywhere",
    description: "Compact earbuds for calls, music, and focus.",
    image: `${apiBase}/uploads/banners/${encodeURIComponent("Work From Anywhere.png")}`,
  },
  {
    title: "Smartwatch Week",
    description: "Track health, sleep, and notifications in style.",
    image: `${apiBase}/uploads/banners/${encodeURIComponent("Smartwatch Week.png")}`,
  },
  {
    title: "Home Studio Upgrade",
    description: "Broadcast microphones with pop filters and arms.",
    image: `${apiBase}/uploads/banners/${encodeURIComponent("Home Studio Upgrade.png")}`,
  },
  {
    title: "Living Room Sound",
    description: "Portable speakers that fill your space with clean audio.",
    image: `${apiBase}/uploads/banners/${encodeURIComponent("Living Room Sound.png")}`,
  },
  {
    title: "Creator Essentials",
    description: "Camera mics and monitoring headphones for content pros.",
    image: `${apiBase}/uploads/banners/${encodeURIComponent("Creator Essentials.png")}`,
  },
  {
    title: "Commute Ready",
    description: "ANC earbuds tuned for metros and busy streets.",
    image: `${apiBase}/uploads/banners/${encodeURIComponent("Commute Ready.png")}`,
  },
  {
    title: "Game Night Gear",
    description: "Low-latency wireless headsets for consoles and PCs.",
    image: `${apiBase}/uploads/banners/${encodeURIComponent("Game Night Gear.png")}`,
  },
];

const productSeeds = [
  {
    title: "Sony WH-1000XM5 Wireless Headphones",
    description:
      "Flagship ANC over-ear headphones with 30-hour battery, LDAC, and multi-point connectivity.",
    price: 420,
    priceType: "best",
    salePrice: 369,
    sku: "SONY-WH1000XM5",
    stock: 45,
    showStockToPublic: true,
    category: "Headphones",
    brand: "Sony",
    colors: ["#000000", "#d9d9d9"],
    features: ["Adaptive Noise Cancelling", "30h battery", "Quick charge"],
    specifications: [
      { key: "Bluetooth", value: "5.2" },
      { key: "Weight", value: "250g" },
    ],
    images: [
      publicImage("Sony WH-1000XM5 Wireless Headphones.png"),
      publicImage("Sony WH-1000XM5 Wireless Headphones-1.png"),
      publicImage("Sony WH-1000XM5 Wireless Headphones-2.png"),
    ],
  },
  {
    title: "Apple AirPods Pro (2nd Gen) USB-C",
    description:
      "In-ear earbuds with H2 chip, Personalized Spatial Audio, and industry-leading ANC.",
    price: 279,
    priceType: "single",
    sku: "APPLE-APP2",
    stock: 120,
    showStockToPublic: true,
    category: "Earbuds",
    brand: "Apple",
    colors: ["#ffffff"],
    features: ["ANC with Transparency", "MagSafe charging case", "IP54"],
    specifications: [
      { key: "Chip", value: "Apple H2" },
      { key: "Charging", value: "USB-C / MagSafe" },
    ],
    images: [
      publicImage("Apple AirPods Pro (2nd Gen) USB-C.png"),
      publicImage("Apple AirPods Pro (2nd Gen) USB-C-1.png"),
      publicImage("Apple AirPods Pro (2nd Gen) USB-C-2.png"),
    ],
  },
  {
    title: "Samsung Galaxy Watch6 Classic 47mm",
    description:
      "Premium stainless steel smartwatch with rotating bezel, ECG, and fitness tracking.",
    price: 399,
    priceType: "best",
    salePrice: 349,
    sku: "SM-R965",
    stock: 60,
    showStockToPublic: true,
    category: "Smartwatches",
    brand: "Samsung",
    colors: ["#000000", "#cccccc"],
    features: ["Rotating bezel", "ECG + BP", "5ATM + IP68"],
    specifications: [
      { key: "Display", value: "1.5\" AMOLED" },
      { key: "Battery", value: "425 mAh" },
    ],
    images: [
      publicImage("Samsung Galaxy Watch6 Classic 47mm.png"),
      publicImage("Samsung Galaxy Watch6 Classic 47mm-1.png"),
      publicImage("Samsung Galaxy Watch6 Classic 47mm-2.png"),
    ],
  },
  {
    title: "JBL Charge 5 Portable Speaker",
    description:
      "Rugged IP67 waterproof Bluetooth speaker with 20 hours playtime and USB powerbank.",
    price: 179,
    priceType: "single",
    sku: "JBL-CHARGE5",
    stock: 85,
    showStockToPublic: true,
    category: "Speakers",
    brand: "JBL",
    colors: ["#1b4d3e", "#000000"],
    features: ["IP67", "PartyBoost stereo pair", "Powerbank"],
    specifications: [
      { key: "Output", value: "40W RMS" },
      { key: "Battery", value: "20h" },
    ],
    images: [
      publicImage("JBL Charge 5 Portable Speaker.png"),
      publicImage("JBL Charge 5 Portable Speaker-1.png"),
      publicImage("JBL Charge 5 Portable Speaker-2.png"),
    ],
  },
  {
    title: "Anker Soundcore Liberty 4 NC",
    description:
      "Hybrid ANC earbuds with adaptive noise cancelling, Hi-Res LDAC, and multi-point.",
    price: 99,
    priceType: "best",
    salePrice: 79,
    sku: "ANK-LIB4NC",
    stock: 140,
    showStockToPublic: true,
    category: "Earbuds",
    brand: "Anker",
    colors: ["#000000", "#b5179e"],
    features: ["Adaptive ANC", "LDAC Hi-Res", "10h single charge"],
    specifications: [
      { key: "Codec", value: "LDAC / AAC / SBC" },
      { key: "Drivers", value: "11mm" },
    ],
    images: [
      publicImage("Anker Soundcore Liberty 4 NC.png"),
      publicImage("Anker Soundcore Liberty 4 NC-2.png"),
      publicImage("Anker Soundcore Liberty 4 NC-3.png"),
    ],
  },
  {
    title: "RØDE NT-USB+ Studio Microphone",
    description:
      "USB condenser mic with built-in DSP, APHEX processing, and pop filter for creators.",
    price: 169,
    priceType: "single",
    sku: "RODE-NTUSBPLUS",
    stock: 55,
    showStockToPublic: true,
    category: "Microphones",
    brand: "RØDE",
    colors: ["#000000"],
    features: ["USB-C", "Onboard DSP", "Pop filter included"],
    specifications: [
      { key: "Pattern", value: "Cardioid" },
      { key: "Bit depth", value: "24-bit / 48 kHz" },
    ],
    images: [
      publicImage("RØDE NT-USB+ Studio Microphone.png"),
      publicImage("RØDE NT-USB+ Studio Microphone-1.png"),
      publicImage("RØDE NT-USB+ Studio Microphone-2.png"),
    ],
  },
  {
    title: "Logitech Blue Yeti X",
    description:
      "Four-capsule USB microphone with LED metering for streaming and podcasting.",
    price: 169,
    priceType: "best",
    salePrice: 149,
    sku: "LOGI-YETIX",
    stock: 70,
    showStockToPublic: true,
    category: "Microphones",
    brand: "Logitech",
    colors: ["#1f2937", "#c0c0c0"],
    features: ["4 pickup patterns", "LED meter", "Smart knob"],
    specifications: [
      { key: "Connection", value: "USB" },
      { key: "Bit depth", value: "24-bit / 48 kHz" },
    ],
    images: [
      publicImage("Logitech Blue Yeti X.png"),
      publicImage("Logitech Blue Yeti X(2).jpg"),
    ],
  },
  {
    title: "Marshall Major V Wireless",
    description:
      "On-ear Bluetooth headphones with 100-hour battery life and Marshall signature sound.",
    price: 149,
    priceType: "single",
    sku: "MAR-MAJOR5",
    stock: 95,
    showStockToPublic: true,
    category: "Headphones",
    brand: "Marshall",
    colors: ["#111111", "#fbbf24"],
    features: ["100h battery", "Foldable", "Custom EQ app"],
    specifications: [
      { key: "Drivers", value: "40mm" },
      { key: "Bluetooth", value: "5.3" },
    ],
    images: [
      publicImage("Marshall Major V Wireless.jpeg"),
      publicImage("Marshall Major V Wireless(1).jpg"),
      publicImage("Marshall Major V Wireless(2).png"),
    ],
  },
  {
    title: "Bose Portable Smart Speaker",
    description:
      "Wi‑Fi and Bluetooth speaker with 360° sound, Alexa/Assistant, and IPX4 portability.",
    price: 399,
    priceType: "best",
    salePrice: 349,
    sku: "BOSE-PORTSMT",
    stock: 40,
    showStockToPublic: true,
    category: "Speakers",
    brand: "Bose",
    colors: ["#6b7280", "#000000"],
    features: ["Wi‑Fi + BT", "Voice assistants", "12h battery"],
    specifications: [
      { key: "Weight", value: "1.06 kg" },
      { key: "Ingress", value: "IPX4" },
    ],
    images: [
      publicImage("Bose Portable Smart Speaker.png"),
      publicImage("Bose Portable Smart Speaker-1.png"),
      publicImage("Bose Portable Smart Speaker-2.png"),
    ],
  },
  {
    title: "Fitbit Charge 6",
    description:
      "Fitness tracker with heart rate, GPS, Google Maps/Wallet support, and 7-day battery.",
    price: 159,
    priceType: "single",
    sku: "FITBIT-CHG6",
    stock: 110,
    showStockToPublic: true,
    category: "Smartwatches",
    brand: "Fitbit",
    colors: ["#1d4ed8", "#000000"],
    features: ["Google Maps/Wallet", "Built-in GPS", "7-day battery"],
    specifications: [
      { key: "Water resistance", value: "5ATM" },
      { key: "Battery life", value: "Up to 7 days" },
    ],
    images: [
      publicImage("Fitbit Charge 6.jpg"),
      publicImage("Fitbit Charge 6(1).jpg"),
      publicImage("Fitbit Charge 6(2).png"),
    ],
  },
];

async function ensureCategories() {
  const created = {};
  for (const cat of categorySeeds) {
    const doc = await Category.findOneAndUpdate(
      { name: cat.name },
      { $set: cat },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    created[cat.name] = doc._id;
  }
  return created;
}

async function seedBanners() {
  for (const banner of bannerSeeds) {
    await Banner.findOneAndUpdate(
      { title: banner.title },
      { $set: banner, $setOnInsert: { createdAt: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }
}

async function seedProducts(categoryMap) {
  for (const product of productSeeds) {
    const categoryId = categoryMap[product.category];
    if (!categoryId) continue;

    await Product.findOneAndUpdate(
      { title: product.title },
      {
        $set: {
          ...product,
          category: categoryId,
          approvalStatus: "approved",
          isActive: true,
          marketplaceType: "simple",
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }
}

async function main() {
  console.log("Connecting to Mongo:", mongoUri);
  await mongoose.connect(mongoUri);
  console.log("Connected.");

  const categoryMap = await ensureCategories();
  console.log("Categories ready:", Object.keys(categoryMap).join(", "));

  await seedBanners();
  console.log("Banners seeded.");

  await seedProducts(categoryMap);
  console.log("Products seeded.");

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  mongoose.disconnect();
  process.exit(1);
});
