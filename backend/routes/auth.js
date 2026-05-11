const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/auth");
const {
  register, verifyEmail, resendVerification,
  login, getMe, forgotPassword, resetPassword, updateProfile,
} = require("../controllers/authController");

router.post("/register",             register);
router.get( "/verify-email/:token",  verifyEmail);
router.post("/resend-verification",  resendVerification);
router.post("/login",                login);
router.get( "/me",        protect,   getMe);
router.put( "/update-profile", protect, updateProfile);
router.post("/forgot-password",      forgotPassword);
router.post("/reset-password/:token", resetPassword);

module.exports = router;
