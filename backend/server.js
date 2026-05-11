require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const morgan    = require("morgan");
const helmet    = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const fileUpload = require("express-fileupload");
const mongoose  = require("mongoose");
const path      = require("path");

const app = express();

// ─── Security middleware ──────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(mongoSanitize());
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(morgan("dev"));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20,
  message: { success: false, error: "Too many requests, try again later" } });
app.use("/api/", limiter);
app.use("/api/auth/", authLimiter);

app.use(fileUpload({ useTempFiles: true, tempFileDir: "/tmp/",
  limits: { fileSize: 10 * 1024 * 1024 } }));

// ─── Serve static files ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../frontend/public")));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth",       require("./routes/auth"));
app.use("/api/products",   require("./routes/products"));
app.use("/api/upload",     require("./routes/upload"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/payments",   require("./routes/payments"));

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok", version: "3.0", time: new Date() }));

// Serve frontend for all non-API routes (SPA routing)
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/public/index.html"));
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

// ─── Connect & Start ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅  MongoDB connected");
    app.listen(PORT, () => {
      console.log(`🚀  ZoeAfrica v3.0 → http://localhost:${PORT}`);
      console.log(`📡  API ready     → http://localhost:${PORT}/api/health`);
    });
  })
  .catch(err => { console.error("❌  MongoDB error:", err.message); process.exit(1); });
