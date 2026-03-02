const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/ocpp", require("./routes/ocpp.routes"));
app.use("/api/session-data", require("./routes/sessionData.routes"));
app.use("/api/analytics", require("./routes/analytics.routes"));

module.exports = app;