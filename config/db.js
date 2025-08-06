// config/db.js
const mongoose = require("mongoose");
const AppConfig = require("../models/appConfig.model");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const seedData = {
      key: "trial",
      value: true,
    };
    await AppConfig.findOneAndUpdate(
      { key: seedData.key },
      { $set: { value: seedData.value } },
      { upsert: true }
    );
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}

module.exports = connectDB;
