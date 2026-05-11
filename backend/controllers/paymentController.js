const crypto   = require("crypto");
const Order    = require("../models/Order");
const { stkPush, stkQuery, mpesaAfricaC2B } = require("../config/mpesa");
const { initializeTransaction, verifyTransaction } = require("../config/paystack");
const { sendOrderConfirmation } = require("../config/email");

// ── Helper: build/find order from cart ───────────────────────────────────────
const resolveOrder = async (req) => {
  // If orderId sent, use existing order; else create from cart body
  if (req.body.orderId) return Order.findById(req.body.orderId);
  const { items, shippingAddress, currency = "KES" } = req.body;
  const totalAmount = items.reduce((sum, i) => sum + i.price * (i.qty || 1), 0);
  return Order.create({
    buyer: req.user._id,
    items, shippingAddress, currency, totalAmount,
    paymentMethod: req.body.paymentMethod || "mpesa_kenya",
  });
};

// ════════════════════════════════════════════════════════════════════════════
// M-PESA KENYA — STK Push
// POST /api/payments/mpesa/stk
// ════════════════════════════════════════════════════════════════════════════
exports.mpesaStkPush = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: "Phone number required" });

    const order = await resolveOrder(req);
    order.paymentMethod    = "mpesa_kenya";
    order.mpesaPhoneNumber = phone;
    await order.save();

    const result = await stkPush({ phone, amount: order.totalAmount, orderId: order._id });

    if (result.ResponseCode !== "0")
      return res.status(400).json({ success: false, error: result.ResponseDescription });

    order.paymentRef     = result.CheckoutRequestID;
    order.paymentStatus  = "processing";
    order.paymentDetails = result;
    await order.save();

    res.json({
      success: true,
      message: `STK push sent to ${phone}. Enter M-Pesa PIN to complete payment.`,
      checkoutRequestId: result.CheckoutRequestID,
      orderId: order._id,
    });
  } catch (err) {
    console.error("M-Pesa STK error:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.response?.data?.errorMessage || err.message });
  }
};

// ── POST /api/payments/mpesa/query ───────────────────────────────────────────
// Poll payment status (call every 3s from frontend)
exports.mpesaQuery = async (req, res) => {
  try {
    const { checkoutRequestId } = req.body;
    const result = await stkQuery(checkoutRequestId);

    if (result.ResultCode === "0") {
      // Payment successful — update order
      await Order.findOneAndUpdate(
        { paymentRef: checkoutRequestId },
        { paymentStatus: "paid", orderStatus: "confirmed", paymentDetails: result }
      );
      return res.json({ success: true, paid: true, message: "Payment received!" });
    }
    if (result.ResultCode === "1032")
      return res.json({ success: true, paid: false, message: "Waiting for PIN…" });

    res.json({ success: true, paid: false, message: result.ResultDesc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── POST /api/payments/mpesa/callback ────────────────────────────────────────
// Daraja server-to-server callback (no auth needed — verified by payload)
exports.mpesaCallback = async (req, res) => {
  try {
    const { Body } = req.body;
    const cb = Body?.stkCallback;
    if (!cb) return res.json({ ResultCode: 0, ResultDesc: "OK" });

    const order = await Order.findOne({ paymentRef: cb.CheckoutRequestID }).populate("buyer");
    if (!order) return res.json({ ResultCode: 0, ResultDesc: "OK" });

    if (cb.ResultCode === 0) {
      const meta = cb.CallbackMetadata?.Item || [];
      const get  = (name) => meta.find(i => i.Name === name)?.Value;
      order.mpesaReceiptNumber = get("MpesaReceiptNumber");
      order.paymentStatus      = "paid";
      order.orderStatus        = "confirmed";
      order.paymentDetails     = cb;
      await order.save();
      if (order.buyer) await sendOrderConfirmation(order.buyer, order);
    } else {
      order.paymentStatus = "failed";
      order.paymentDetails = cb;
      await order.save();
    }

    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err) {
    console.error("M-Pesa callback error:", err);
    res.json({ ResultCode: 0, ResultDesc: "OK" }); // always 200 to Safaricom
  }
};

// ════════════════════════════════════════════════════════════════════════════
// M-PESA AFRICA
// POST /api/payments/mpesa-africa/pay
// ════════════════════════════════════════════════════════════════════════════
exports.mpesaAfricaPay = async (req, res) => {
  try {
    const { phone, country } = req.body;
    const order = await resolveOrder(req);
    order.paymentMethod = "mpesa_africa";
    await order.save();

    const result = await mpesaAfricaC2B({ phone, amount: order.totalAmount, orderId: order._id, country });

    order.paymentRef     = result.output_ConversationID;
    order.paymentStatus  = "processing";
    order.paymentDetails = result;
    await order.save();

    res.json({
      success: true,
      message: "M-Pesa Africa payment initiated. Customer will receive a prompt.",
      conversationId: result.output_ConversationID,
      orderId: order._id,
    });
  } catch (err) {
    console.error("M-Pesa Africa error:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.response?.data?.output_ResponseDesc || err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// PAYSTACK — Initialize
// POST /api/payments/paystack/initialize
// ════════════════════════════════════════════════════════════════════════════
exports.paystackInit = async (req, res) => {
  try {
    const order = await resolveOrder(req);
    order.paymentMethod = "paystack";
    await order.save();

    const data = await initializeTransaction({
      email:    req.user.email,
      amount:   order.totalAmount,
      currency: order.currency,
      orderId:  order._id,
      metadata: { buyer_name: req.user.name },
    });

    order.paymentRef     = data.reference;
    order.paymentStatus  = "processing";
    order.paymentDetails = { access_code: data.access_code };
    await order.save();

    res.json({
      success: true,
      authorizationUrl: data.authorization_url,  // redirect user here
      reference: data.reference,
      orderId: order._id,
    });
  } catch (err) {
    console.error("Paystack init error:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── GET /api/payments/paystack/verify/:reference ─────────────────────────────
exports.paystackVerify = async (req, res) => {
  try {
    const data  = await verifyTransaction(req.params.reference);
    const order = await Order.findOne({ paymentRef: req.params.reference }).populate("buyer");

    if (!order) return res.status(404).json({ success: false, error: "Order not found" });

    if (data.status === "success") {
      order.paymentStatus  = "paid";
      order.orderStatus    = "confirmed";
      order.paymentDetails = data;
      await order.save();
      if (order.buyer) await sendOrderConfirmation(order.buyer, order);
      return res.json({ success: true, paid: true, order });
    }

    order.paymentStatus = "failed";
    await order.save();
    res.json({ success: true, paid: false, status: data.status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Paystack webhook ─────────────────────────────────────────────────────────
exports.paystackWebhook = async (req, res) => {
  try {
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"])
      return res.status(400).json({ error: "Invalid signature" });

    const { event, data } = req.body;
    if (event === "charge.success") {
      const order = await Order.findOne({ paymentRef: data.reference }).populate("buyer");
      if (order && order.paymentStatus !== "paid") {
        order.paymentStatus  = "paid";
        order.orderStatus    = "confirmed";
        order.paymentDetails = data;
        await order.save();
        if (order.buyer) await sendOrderConfirmation(order.buyer, order);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Paystack webhook error:", err);
    res.sendStatus(200);
  }
};

// ── GET /api/payments/orders ─────────────────────────────────────────────────
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id }).sort("-createdAt").limit(50);
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
