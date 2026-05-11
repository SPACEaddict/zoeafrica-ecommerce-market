const jwt  = require("jsonwebtoken");
const User = require("../models/User");

exports.signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || "30d" });

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith("Bearer"))
      token = req.headers.authorization.split(" ")[1];

    if (!token)
      return res.status(401).json({ success: false, error: "Not authenticated. Please log in." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user)
      return res.status(401).json({ success: false, error: "User no longer exists" });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};

exports.requireVerified = (req, res, next) => {
  if (!req.user.isVerified)
    return res.status(403).json({ success: false, error: "Please verify your email first" });
  next();
};

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, error: "You do not have permission" });
  next();
};
