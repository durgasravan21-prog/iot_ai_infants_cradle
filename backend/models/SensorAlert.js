/*
 * ============================================================
 *  Mongoose Schema — Sensor Alert Log
 * ============================================================
 *  Logs critical events: crying detection, wetness, high temp,
 *  motion alerts, and rocking state changes.
 * ============================================================
 */

const mongoose = require("mongoose");

const sensorAlertSchema = new mongoose.Schema(
  {
    alertType: {
      type: String,
      enum: ["CRYING", "WET", "HIGH_TEMP", "MOTION", "ROCKING_START", "ROCKING_STOP"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    sensorData: {
      temperature: { type: Number, default: null },
      humidity:    { type: Number, default: null },
      sound:       { type: Number, default: null },
      moisture:    { type: Number, default: null },
      motion:      { type: Boolean, default: false },
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    acknowledged: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Index for efficient querying by time and alert type
sensorAlertSchema.index({ createdAt: -1 });
sensorAlertSchema.index({ alertType: 1, createdAt: -1 });

module.exports = mongoose.model("SensorAlert", sensorAlertSchema);
