const express  = require("express");
const router   = express.Router();
const Category = require("../models/Category");

router.get("/", async (_req, res) => {
  const cats = await Category.find().sort("order");
  res.json({ success: true, categories: cats });
});

router.post("/", async (req, res) => {
  try {
    const cat = await Category.create(req.body);
    res.status(201).json({ success: true, category: cat });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
