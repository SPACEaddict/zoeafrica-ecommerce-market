const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    title: {
      type: String, required: [true, "Product title is required"], trim: true, maxlength: 150,
    },
    slug: { type: String, unique: true, lowercase: true },
    description: { type: String, maxlength: 2000 },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "KES", enum: ["KES","USD","EUR","GBP","NGN","GHS","ZAR","ETB","BTC"] },
    originalPrice: { type: Number },           // for "was" price / discount display
    category: { type: String, required: true,
      enum: ["Fashion","Electronics","Home & Living","Handmade","Food & Groceries",
             "Beauty","Motors","Books","Services","Digital","Art","Baby & Kids","Other"],
    },
    images: [
      {
        url:       { type: String, required: true },  // Cloudinary secure_url
        publicId:  { type: String },                  // Cloudinary public_id (for deletion)
        alt:       { type: String },
      },
    ],
    seller: {
      name:    { type: String, required: true },
      country: { type: String },
      rating:  { type: Number, default: 5.0, min: 1, max: 5 },
    },
    badge:        { type: String, enum: ["", "HOT", "NEW", "DEAL", "SALE"], default: "" },
    shipping:     { type: String, default: "Free shipping" },
    stock:        { type: Number, default: 0, min: 0 },
    isActive:     { type: Boolean, default: true },
    isFeatured:   { type: Boolean, default: false },
    reviewCount:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Auto-generate slug from title before save
const slugify = require("slugify");
ProductSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = slugify(this.title, { lower: true, strict: true }) + "-" + Date.now();
  }
  next();
});

module.exports = mongoose.model("Product", ProductSchema);
