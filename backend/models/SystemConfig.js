const mongoose = require("mongoose");

const SystemConfigSchema = new mongoose.Schema({
  configId: { type: String, default: "primary_setup", unique: true },
  motherEmail: { type: String, required: true },
  motherPhone: { type: String, required: true },
  whatsappApiKey: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SystemConfig", SystemConfigSchema);
