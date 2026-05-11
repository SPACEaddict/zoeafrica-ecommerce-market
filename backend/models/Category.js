const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  name:  { type: String, required: true, unique: true },
  icon:  { type: String },          // emoji or Cloudinary image URL
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("Category", CategorySchema);
