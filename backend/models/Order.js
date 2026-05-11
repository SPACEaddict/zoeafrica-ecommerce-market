const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  buyer:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [{
    product:  { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    title:    String,
    price:    Number,
    currency: String,
    qty:      { type: Number, default: 1 },
    image:    String,
  }],
  totalAmount: { type: Number, required: true },
  currency:    { type: String, default: "KES" },

  // Shipping
  shippingAddress: {
    name:    String, phone: String,
    address: String, city: String,
    country: String, postalCode: String,
  },

  // Payment
  paymentMethod:  { type: String, enum: ["mpesa_kenya","mpesa_africa","paystack","bitcoin","card"], required: true },
  paymentStatus:  { type: String, enum: ["pending","processing","paid","failed","refunded"], default: "pending" },
  paymentRef:     String,   // Paystack reference / M-Pesa CheckoutRequestID
  paymentDetails: mongoose.Schema.Types.Mixed,

  // Order status
  orderStatus: { type: String, enum: ["pending","confirmed","processing","shipped","delivered","cancelled"], default: "pending" },

  // M-Pesa specific
  mpesaReceiptNumber: String,
  mpesaPhoneNumber:   String,

  notes: String,
}, { timestamps: true });

module.exports = mongoose.model("Order", OrderSchema);
