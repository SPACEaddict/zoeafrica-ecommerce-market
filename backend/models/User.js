const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const crypto   = require("crypto");

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: [true,"Name required"], trim: true, maxlength: 80 },
  email:    { type: String, required: [true,"Email required"], unique: true, lowercase: true, trim: true,
              match: [/^\S+@\S+\.\S+$/, "Invalid email"] },
  password: { type: String, required: [true,"Password required"], minlength: 6, select: false },
  role:     { type: String, enum: ["buyer","seller","admin"], default: "buyer" },
  phone:    { type: String, trim: true },
  country:  { type: String, default: "Kenya" },
  currency: { type: String, default: "KES" },
  avatar:   { url: String, publicId: String },

  // Email verification
  isVerified:              { type: Boolean, default: false },
  emailVerifyToken:        String,
  emailVerifyExpire:       Date,

  // Password reset
  passwordResetToken:      String,
  passwordResetExpire:     Date,

  // Seller profile
  shopName:    String,
  shopCountry: String,
  shopRating:  { type: Number, default: 5.0 },

  wishlist:    [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  createdAt:   { type: Date, default: Date.now },
}, { timestamps: true });

// Hash password before save
UserSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
UserSchema.methods.matchPassword = async function(plain) {
  return bcrypt.compare(plain, this.password);
};

// Generate email verify token
UserSchema.methods.getEmailVerifyToken = function() {
  const token = crypto.randomBytes(32).toString("hex");
  this.emailVerifyToken  = crypto.createHash("sha256").update(token).digest("hex");
  this.emailVerifyExpire = Date.now() + 24 * 60 * 60 * 1000; // 24h
  return token;
};

// Generate password reset token
UserSchema.methods.getPasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken  = crypto.createHash("sha256").update(token).digest("hex");
  this.passwordResetExpire = Date.now() + 30 * 60 * 1000; // 30min
  return token;
};

module.exports = mongoose.model("User", UserSchema);
