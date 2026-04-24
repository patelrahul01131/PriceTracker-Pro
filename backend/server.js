const express = require("express");
const app = express();
const authRoutes = require("./routes/auth");
const cors = require("cors");
const ConnectDb = require("./db.js/db");
const productRoutes = require("./routes/product");
const { startPriceCheckCron, runPriceCheck } = require("./cron/priceChecker");
const { startWeeklyReportCron } = require("./cron/weeklyReport");

require('dotenv').config()
app.use(cors());
app.use(express.json());

ConnectDb();

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.use('/api/auth', authRoutes);

app.use('/api/dashboard', (req, res) => {
    res.send("Dashboard");
});

app.use('/api/product', productRoutes);

/* ── Admin: manually trigger a price-check run ── */
app.post('/api/admin/run-price-check', async (req, res) => {
    // Fire-and-forget — the runner logs its own progress
    runPriceCheck().catch((e) => console.error("[manual trigger]", e.message));
    res.json({ message: "Price check run triggered. Check server logs for progress." });
});

/* ── Start the 4×-daily cron job ── */
startPriceCheckCron();
startWeeklyReportCron();

app.listen(3000, () => {
    console.log("Server started on port 3000");
});