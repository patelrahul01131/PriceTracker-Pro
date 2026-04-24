const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    trackingPreferences: {
        interval: { type: String, default: "Every 24 hours" },
        notifyEmail: { type: Boolean, default: true },
        notifyPush: { type: Boolean, default: false },
        notifyWeekly: { type: Boolean, default: false }
    }
});

module.exports = mongoose.model("User", userSchema);