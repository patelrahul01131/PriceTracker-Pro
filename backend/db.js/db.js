const mongoose = require("mongoose");

const ConnectDb = async () => {
    try {
        await mongoose.connect("mongodb://localhost:27017/PriceWatcher");
        console.log("MongoDB connected");
    } catch (error) {
        console.log(error);
    }
};

module.exports = ConnectDb;