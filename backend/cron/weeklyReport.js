const cron = require("node-cron");
const User = require("../model/User");
const Product = require("../model/product");
const { sendWeeklyReportEmail } = require("../utils/email");

async function runWeeklyReport() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`[WeeklyReport] Run started at ${new Date().toISOString()}`);

  try {
    // Find all users who opted in for weekly reports
    const users = await User.find({ "trackingPreferences.notifyWeekly": true });

    for (const user of users) {
      // Find all active products for this user
      const products = await Product.find({ user: user._id, status: "active" });

      if (products.length > 0 && user.email) {
        await sendWeeklyReportEmail(user.email, products);
      }
    }
  } catch (err) {
    console.error("[WeeklyReport] Error running weekly reports:", err);
  } finally {
    console.log(`[WeeklyReport] Run finished at ${new Date().toISOString()}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
}

function startWeeklyReportCron() {
  // Run every Sunday at 08:00 AM IST
  cron.schedule("0 8 * * 0", runWeeklyReport, { timezone: "Asia/Kolkata" });
  console.log("[WeeklyReport] Cron scheduled for every Sunday at 08:00 IST");
}

module.exports = { startWeeklyReportCron, runWeeklyReport };
