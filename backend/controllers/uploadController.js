const cloudinary = require("../config/cloudinary");

// ─── POST /api/upload/image ──────────────────────────────────────────────────
// Accepts: multipart form-data with field name "image" (single or multiple files)
// Returns: array of { url, publicId, alt }
exports.uploadImages = async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ success: false, error: "No image file provided" });
    }

    // Normalise to array so single and multiple uploads work the same
    const files = Array.isArray(req.files.image) ? req.files.image : [req.files.image];

    const uploaded = await Promise.all(
      files.map((file) =>
        cloudinary.uploader.upload(file.tempFilePath, {
          folder:         "zoeafrica/products",
          transformation: [
            { width: 800, height: 800, crop: "limit", quality: "auto", fetch_format: "auto" },
          ],
        })
      )
    );

    const images = uploaded.map((result) => ({
      url:      result.secure_url,
      publicId: result.public_id,
      alt:      result.original_filename || "product image",
    }));

    res.json({ success: true, images });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── DELETE /api/upload/image ────────────────────────────────────────────────
// Body: { publicId: "zoeafrica/products/xxxx" }
exports.deleteImage = async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) return res.status(400).json({ success: false, error: "publicId required" });

    const result = await cloudinary.uploader.destroy(publicId);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
