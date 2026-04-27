const cron = require("node-cron");
const Product = require("../model/product");
const User = require("../model/User");
const checkPrice = require("../components/checkPrice");
const { sendPriceDropEmail } = require("../utils/email");

/* ────────────────────────────────────────────────
   CONFIG
   ─────────────────────────────────────────────── */
const BATCH_SIZE = 10;          // products fetched per DB page
const DELAY_BETWEEN_MS = 3000;  // ms to wait between each product scrape
const DELAY_BETWEEN_BATCHES = 5000; // ms between DB pages

/* ────────────────────────────────────────────────
   HELPERS
   ─────────────────────────────────────────────── */

/** Wait for `ms` milliseconds. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Process a single product:
 *  - Fetch the latest price from the scraper
 *  - Update the DB only if the price changed or is new
 */
async function processOne(product) {
  const label = `[PriceCheck] "${product.name?.slice(0, 40)}"`;
  try {
    const result = await checkPrice(product.url, product.price);

    if (!result) {
      console.warn(`${label} — scraper returned null, skipping.`);
      return;
    }

    const { price, inStock } = result;
    const now = new Date();
    
    const oldPrice = product.price;

    // Always push a new history point and update current price + check date
    const update = {
      price,
      last_check_date: now,
      $push: {
        lastcheck: { price, date: now },
      },
    };
    if (inStock !== null) update.inStock = inStock;

    await Product.findByIdAndUpdate(product._id, update);
    console.log(`${label} ✅  ₹${price}`);

    if (oldPrice && price < oldPrice) {
      if (product.user && product.user.email && product.user.trackingPreferences?.notifyEmail !== false) {
        await sendPriceDropEmail(product.user.email, product, oldPrice, price);
      }
    }
  } catch (err) {
    // Catch per-product errors so one bad scrape never breaks the whole run
    console.error(`${label} ❌  ${err.message}`);
  }
}

/* ────────────────────────────────────────────────
   MAIN RUNNER  (cursor-based pagination)
   ─────────────────────────────────────────────── */

/**
 * Walk every ACTIVE product in the DB using cursor-based pagination
 * (lastId > previous batch's last _id).
 *
 * Benefits for large data:
 *  • Never pulls the whole collection into RAM — only BATCH_SIZE docs at once
 *  • Sequential processing — no concurrent browser launches
 *  • Natural rate-limiting via DELAY_BETWEEN_MS
 */
let isRunning = false; // guard against overlapping runs

async function runPriceCheck() {
  if (isRunning) {
    console.log("[PriceCheck] Previous run still in progress — skipping this tick.");
    return;
  }

  isRunning = true;
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`[PriceCheck] Run started at ${new Date().toISOString()}`);

  let processed = 0;
  let failed = 0;
  let lastId = null; // cursor

  try {
    while (true) {
      // Build cursor filter: only active products, paginated by _id
      const filter = { status: "active" };
      if (lastId) filter._id = { $gt: lastId };

      const batch = await Product.find(filter)
        .sort({ _id: 1 })          // consistent order for cursor
        .limit(BATCH_SIZE)
        .populate("user", "email trackingPreferences")
        .select("_id name url inStock price user last_check_date")  // fetch only needed fields
        .lean();                               // plain JS objects, faster

      if (!batch.length) break; // all products processed

      console.log(
        `[PriceCheck] Processing batch of ${batch.length} (total so far: ${processed})`
      );

      // Process one-by-one inside the batch (sequential, not parallel)
      for (const product of batch) {
        // Respect user tracking interval preference
        if (product.user && product.user.trackingPreferences && product.user.trackingPreferences.interval) {
          let intervalHours = 24; // default
          const intStr = product.user.trackingPreferences.interval;
          const match = intStr.match(/\d+/);
          if (match) {
            intervalHours = parseInt(match[0], 10);
          }
          
          if (product.last_check_date) {
            const hoursSinceLastCheck = (new Date() - new Date(product.last_check_date)) / (1000 * 60 * 60);
            if (hoursSinceLastCheck < intervalHours) {
              console.log(`[PriceCheck] Skipping "${product.name?.slice(0, 40)}" — interval ${intervalHours}h not reached.`);
              continue;
            }
          }
        }

        const before = failed;
        await processOne(product);
        if (failed > before) { /* error already logged */ }
        processed++;

        // Rate-limit: pause between each scrape
        await sleep(DELAY_BETWEEN_MS);
      }

      // Advance cursor to last _id of this batch
      lastId = batch[batch.length - 1]._id;

      // Brief pause between DB pages to let the event loop breathe
      if (batch.length === BATCH_SIZE) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }
  } catch (err) {
    console.error("[PriceCheck] Fatal runner error:", err.message);
  } finally {
    isRunning = false;
    console.log(
      `[PriceCheck] Run finished — ${processed} processed, ${failed} failed | ${new Date().toISOString()}`
    );
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
}

/* ────────────────────────────────────────────────
   SCHEDULE  (4× per day)
   Times (IST): 06:00, 11:00, 17:00, 22:30
   Cron format: minute hour * * *
   ─────────────────────────────────────────────── */
function startPriceCheckCron() {
  // 06:00 IST  →  00:30 UTC
  cron.schedule("30 0 * * *", runPriceCheck, { timezone: "Asia/Kolkata" });

  // 11:00 IST  →  05:30 UTC
  cron.schedule("30 5 * * *", runPriceCheck, { timezone: "Asia/Kolkata" });

  // 17:00 IST  →  11:30 UTC
  cron.schedule("30 11 * * *", runPriceCheck, { timezone: "Asia/Kolkata" });

  // 22:30 IST  →  17:00 UTC
  cron.schedule("0 17 * * *", runPriceCheck, { timezone: "Asia/Kolkata" });

  console.log(
    "[PriceCheck] Cron scheduled 4× daily (06:00 / 11:00 / 17:00 / 22:30 IST)"
  );
}

/* ────────────────────────────────────────────────
   EXPORTS — also export runPriceCheck so you can
   trigger it via an admin API route if needed.
   ─────────────────────────────────────────────── */
module.exports = { startPriceCheckCron, runPriceCheck };
