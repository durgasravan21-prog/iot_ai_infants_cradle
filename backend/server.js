/*
 * ============================================================
 *  IoT Smart Cradle — Node.js Backend Server
 * ============================================================
 *  • Subscribes to ESP32 sensor data via MQTT
 *  • Broadcasts real-time data to React frontend via Socket.io
 *  • Logs critical alerts to MongoDB via Mongoose
 *  • Receives rocking commands from frontend → publishes to MQTT
 * ============================================================
 */

require("dotenv").config();
const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const mqtt       = require("mqtt");
const mongoose   = require("mongoose");
const cors       = require("cors");

const SensorAlert = require("./models/SensorAlert");

// ─── Config ────────────────────────────────────────────────
const PORT              = process.env.PORT || 4000;
const MONGO_URI         = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smart_cradle";
const MQTT_BROKER       = process.env.MQTT_BROKER || "mqtt://broker.hivemq.com:1883";
const MQTT_TOPIC_SENSOR  = process.env.MQTT_TOPIC_SENSOR  || "smartcradle/sensors";
const MQTT_TOPIC_COMMAND = process.env.MQTT_TOPIC_COMMAND || "smartcradle/command";

// ─── Express + HTTP + Socket.io ─────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// ─── MongoDB Connection ─────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("  ✓ MongoDB connected"))
  .catch((err) => console.error("  ✗ MongoDB error:", err.message));

// ─── MQTT Client ────────────────────────────────────────────
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on("connect", () => {
  console.log("  ✓ MQTT broker connected");
  mqttClient.subscribe(MQTT_TOPIC_SENSOR, (err) => {
    if (!err) {
      console.log(`  ✓ Subscribed to: ${MQTT_TOPIC_SENSOR}`);
    } else {
      console.error("  ✗ MQTT subscribe error:", err.message);
    }
  });
});

mqttClient.on("error", (err) => {
  console.error("  ✗ MQTT error:", err.message);
});

// ─── Alert Cooldowns (prevent log spam) ─────────────────────
const ALERT_COOLDOWN_MS = 30000; // 30 seconds between same alert type
const lastAlertTime = {};

function canLogAlert(type) {
  const now = Date.now();
  if (!lastAlertTime[type] || now - lastAlertTime[type] > ALERT_COOLDOWN_MS) {
    lastAlertTime[type] = now;
    return true;
  }
  return false;
}

// ─── Process Incoming Sensor Data ───────────────────────────
mqttClient.on("message", async (topic, message) => {
  if (topic !== MQTT_TOPIC_SENSOR) return;

  try {
    const data = JSON.parse(message.toString());

    // Broadcast to all connected React clients
    io.emit("sensorData", data);

    // ── Alert Detection & Logging ───────────────────────────
    const sensorSnapshot = {
      temperature: data.temperature,
      humidity:    data.humidity,
      sound:       data.sound,
      moisture:    data.moisture,
      motion:      data.motion,
    };

    // Baby is crying
    if (data.isCrying && canLogAlert("CRYING")) {
      await SensorAlert.create({
        alertType: "CRYING",
        message:   `Baby is crying! Sound level: ${data.sound}`,
        sensorData: sensorSnapshot,
        severity:  "high",
      });
      io.emit("alert", {
        type: "CRYING",
        message: "🍼 Baby is crying!",
        severity: "high",
        timestamp: new Date(),
      });
      console.log("  ⚠ Alert logged: CRYING");
    }

    // Diaper is wet
    if (data.isWet && canLogAlert("WET")) {
      await SensorAlert.create({
        alertType: "WET",
        message:   `Moisture detected! Level: ${data.moisture}`,
        sensorData: sensorSnapshot,
        severity:  "high",
      });
      io.emit("alert", {
        type: "WET",
        message: "💧 Diaper needs changing!",
        severity: "high",
        timestamp: new Date(),
      });
      console.log("  ⚠ Alert logged: WET");
    }

    // Temperature too high
    if (data.tempAlert && canLogAlert("HIGH_TEMP")) {
      await SensorAlert.create({
        alertType: "HIGH_TEMP",
        message:   `Temperature alert: ${data.temperature}°C`,
        sensorData: sensorSnapshot,
        severity:  "critical",
      });
      io.emit("alert", {
        type: "HIGH_TEMP",
        message: `🌡️ Temperature is high: ${data.temperature}°C`,
        severity: "critical",
        timestamp: new Date(),
      });
      console.log("  ⚠ Alert logged: HIGH_TEMP");
    }

    // Motion detected
    if (data.motion && canLogAlert("MOTION")) {
      await SensorAlert.create({
        alertType: "MOTION",
        message:   "Motion detected near cradle",
        sensorData: sensorSnapshot,
        severity:  "low",
      });
      console.log("  ℹ Alert logged: MOTION");
    }
  } catch (err) {
    console.error("  ✗ Error processing MQTT message:", err.message);
  }
});

// ─── Socket.io — Client Connections ─────────────────────────
io.on("connection", (socket) => {
  console.log(`  ⟶ Client connected: ${socket.id}`);

  // Handle rocking toggle from React dashboard
  socket.on("rockCommand", (command) => {
    const cmd = command === "rock" ? "rock" : "stop";
    console.log(`  ⟵ Rock command from client: ${cmd}`);
    mqttClient.publish(MQTT_TOPIC_COMMAND, cmd);
    io.emit("rockingState", cmd === "rock");
  });

  // Handle live video frames from Mobile Transmitter -> Dashboard
  socket.on("videoFrame", (frameData) => {
    // Broadcast to all other clients (Dashboard)
    socket.broadcast.emit("videoFrame", frameData);
  });

  socket.on("disconnect", () => {
    console.log(`  ⟵ Client disconnected: ${socket.id}`);
  });
});

// ─── REST API — Alert History ───────────────────────────────
app.get("/api/alerts", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const alerts = await SensorAlert.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({ success: true, alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch("/api/alerts/:id/acknowledge", async (req, res) => {
  try {
    const alert = await SensorAlert.findByIdAndUpdate(
      req.params.id,
      { acknowledged: true },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, error: "Alert not found" });
    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mqtt: mqttClient.connected,
    mongo: mongoose.connection.readyState === 1,
    uptime: process.uptime(),
  });
});

// ─── Start Server ───────────────────────────────────────────
server.listen(PORT, () => {
  console.log("\n╔═══════════════════════════════════════╗");
  console.log("║   IoT Smart Cradle — Backend Live     ║");
  console.log("╚═══════════════════════════════════════╝");
  console.log(`  ✓ HTTP + Socket.io on port ${PORT}`);
  console.log(`  ✓ MQTT broker: ${MQTT_BROKER}`);
  console.log(`  ✓ MongoDB: ${MONGO_URI}\n`);
});
