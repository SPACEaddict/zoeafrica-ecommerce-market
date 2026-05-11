/**
 * Paystack Configuration
 * Docs: https://paystack.com/docs/api
 * Supports: NGN, GHS, ZAR, KES, EGP, XOF, MAD
 */
const axios = require("axios");

const PS = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

// Initialize a transaction → returns { authorization_url, access_code, reference }
async function initializeTransaction({ email, amount, currency = "NGN", orderId, metadata = {} }) {
  // Paystack amounts are in KOBO (NGN) / pesewas (GHS) / cents (ZAR) — multiply by 100
  const { data } = await PS.post("/transaction/initialize", {
    email,
    amount:    Math.ceil(amount * 100),
    currency,
    reference: `ZA-${orderId}-${Date.now()}`,
    callback_url: `${process.env.SERVER_URL}/payment-success`,
    metadata:  { ...metadata, orderId },
  });
  return data.data;
}

// Verify a transaction by reference
async function verifyTransaction(reference) {
  const { data } = await PS.get(`/transaction/verify/${reference}`);
  return data.data;  // { status, amount, currency, customer, ... }
}

module.exports = { initializeTransaction, verifyTransaction };
