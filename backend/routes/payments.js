const express  = require("express");
const router   = express.Router();
const { protect, requireVerified } = require("../middleware/auth");
const {
  mpesaStkPush, mpesaQuery, mpesaCallback,
  mpesaAfricaPay,
  paystackInit, paystackVerify, paystackWebhook,
  getMyOrders,
} = require("../controllers/paymentController");

// ── M-Pesa Kenya ──────────────────────────────────────────────────────────────
router.post("/mpesa/stk",       protect, requireVerified, mpesaStkPush);
router.post("/mpesa/query",     protect, requireVerified, mpesaQuery);
router.post("/mpesa/callback",  mpesaCallback);   // Safaricom calls this — no auth

// ── M-Pesa Africa ─────────────────────────────────────────────────────────────
router.post("/mpesa-africa/pay", protect, requireVerified, mpesaAfricaPay);

// ── Paystack ──────────────────────────────────────────────────────────────────
router.post("/paystack/initialize", protect, requireVerified, paystackInit);
router.get( "/paystack/verify/:reference", protect, paystackVerify);
router.post("/paystack/webhook",    paystackWebhook);  // Paystack calls this

// ── Orders ────────────────────────────────────────────────────────────────────
router.get("/orders", protect, getMyOrders);

module.exports = router;
