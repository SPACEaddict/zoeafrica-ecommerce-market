const Product  = require("../models/Product");
const cloudinary = require("../config/cloudinary");

// ─── GET /api/products ───────────────────────────────────────────────────────
// Query params: category, search, featured, badge, page, limit, sort
exports.getProducts = async (req, res) => {
  try {
    const { category, search, featured, badge, page = 1, limit = 20, sort = "-createdAt" } = req.query;
    const filter = { isActive: true };

    if (category)  filter.category  = category;
    if (badge)     filter.badge     = badge;
    if (featured)  filter.isFeatured = true;
    if (search)    filter.title     = { $regex: search, $options: "i" };

    const skip    = (Number(page) - 1) * Number(limit);
    const total   = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      products,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/products/:id ───────────────────────────────────────────────────
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: "Product not found" });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/products ──────────────────────────────────────────────────────
// Body: JSON product fields + files via multipart (handled by uploadImages first)
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// ─── PUT /api/products/:id ───────────────────────────────────────────────────
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!product) return res.status(404).json({ success: false, error: "Product not found" });
    res.json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// ─── DELETE /api/products/:id ────────────────────────────────────────────────
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: "Product not found" });

    // Delete images from Cloudinary
    for (const img of product.images) {
      if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
    }

    await product.deleteOne();
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
