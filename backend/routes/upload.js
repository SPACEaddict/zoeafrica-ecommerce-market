const express = require("express");
const router  = express.Router();
const { uploadImages, deleteImage } = require("../controllers/uploadController");

router.post("/image",   uploadImages);   // upload 1-5 images → returns Cloudinary URLs
router.delete("/image", deleteImage);    // delete image by publicId

module.exports = router;
