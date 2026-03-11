const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Authentication routes (only active routes)
app.use("/api/auth", require("./routes/auth.routes"));

// Admin routes (protected)
app.use("/api/admin", require("./routes/admin.routes"));

module.exports = app;