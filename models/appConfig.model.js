// models/appConfig.model.js
const mongoose = require("mongoose");

const appConfigSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AppConfig", appConfigSchema);
