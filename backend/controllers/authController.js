const crypto = require("crypto");
const User   = require("../models/User");
const { signToken } = require("../middleware/auth");
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require("../config/email");

const respond = (res, user, statusCode = 200) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true, token,
    user: { id: user._id, name: user.name, email: user.email,
            role: user.role, isVerified: user.isVerified, avatar: user.avatar },
  });
};

// ── POST /api/auth/register ──────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, country, role } = req.body;
    if (await User.findOne({ email }))
      return res.status(400).json({ success: false, error: "Email already registered" });

    const user  = await User.create({ name, email, password, phone, country,
                                      role: role === "seller" ? "seller" : "buyer" });
    const token = user.getEmailVerifyToken();
    await user.save({ validateBeforeSave: false });
    await sendVerificationEmail(user, token);

    res.status(201).json({
      success: true,
      message: `Account created! Check ${email} for your verification link.`,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// ── POST /api/auth/verify-email ──────────────────────────────────────────────
exports.verifyEmail = async (req, res) => {
  try {
    const hashed = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user   = await User.findOne({
      emailVerifyToken: hashed,
      emailVerifyExpire: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ success: false, error: "Invalid or expired verification link" });

    user.isVerified        = true;
    user.emailVerifyToken  = undefined;
    user.emailVerifyExpire = undefined;
    await user.save({ validateBeforeSave: false });
    await sendWelcomeEmail(user);
    respond(res, user);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── POST /api/auth/resend-verification ──────────────────────────────────────
exports.resendVerification = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ success: false, error: "Email not found" });
    if (user.isVerified) return res.status(400).json({ success: false, error: "Already verified" });
    const token = user.getEmailVerifyToken();
    await user.save({ validateBeforeSave: false });
    await sendVerificationEmail(user, token);
    res.json({ success: true, message: "Verification email resent" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── POST /api/auth/login ─────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: "Email and password required" });

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, error: "Invalid email or password" });

    respond(res, user);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ success: true, user });
};

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ success: false, error: "No account with that email" });
    const token = user.getPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    await sendPasswordResetEmail(user, token);
    res.json({ success: true, message: "Password reset email sent" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── POST /api/auth/reset-password/:token ─────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const hashed = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user   = await User.findOne({
      passwordResetToken:  hashed,
      passwordResetExpire: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ success: false, error: "Invalid or expired reset link" });
    user.password            = req.body.password;
    user.passwordResetToken  = undefined;
    user.passwordResetExpire = undefined;
    await user.save();
    respond(res, user);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── PUT /api/auth/update-profile ─────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const fields = ["name","phone","country","currency","shopName","shopCountry"];
    const update = {};
    fields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true, runValidators: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
