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
const nodemailer = require("nodemailer");
const axios      = require("axios");

const SensorAlert = require("./models/SensorAlert");
const SystemConfig = require("./models/SystemConfig");

// ─── Config ────────────────────────────────────────────────
const PORT              = process.env.PORT || 4000;
const MONGO_URI         = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smart_cradle";
const MQTT_BROKER       = process.env.MQTT_BROKER || "mqtt://broker.hivemq.com:1883";
const MQTT_USER         = process.env.MQTT_USER || "";
const MQTT_PASS         = process.env.MQTT_PASS || "";
const MQTT_TOPIC_SENSOR  = process.env.MQTT_TOPIC_SENSOR  || "cradle/sensors";
const MQTT_TOPIC_COMMAND = process.env.MQTT_TOPIC_COMMAND || "cradle/commands";

// Email Configuration
const EMAIL_USER        = process.env.EMAIL_USER;
const EMAIL_PASS        = process.env.EMAIL_PASS;
const EMAIL_RECEIVER    = process.env.EMAIL_RECEIVER || process.env.EMAIL_USER;

// ─── Email Transporter ──────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail', // Standard configuration for Gmail
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

async function sendAlertEmail(subject, text) {
  try {
    // 1. Try to get registered email from DB
    const config = await SystemConfig.findOne({ configId: "primary_setup" });
    const recipient = config ? config.motherEmail : process.env.EMAIL_RECEIVER;

    if (!recipient) {
      console.warn("  ⚠ Email alert skipped: No recipient configured.");
      return;
    }

    await transporter.sendMail({
      from: `"Smart Cradle" <${process.env.EMAIL_USER}>`,
      to: recipient,
      subject: subject,
      text: text,
    });
    console.log(`  📧 Dynamic Email sent to ${recipient}: ${subject}`);
  } catch (err) {
    console.error("  ✗ Failed to send dynamic email:", err.message);
  }
}

/**
 * WhatsApp alert via TextMeBot (Free)
 */
async function sendWhatsAppAlert(message) {
  try {
    // 1. Try to get registered phone/apikey from DB
    const config = await SystemConfig.findOne({ configId: "primary_setup" });
    let recipient = config ? config.motherPhone : process.env.WHATSAPP_PHONE;
    const apikey = config ? config.whatsappApiKey : process.env.WHATSAPP_API_KEY;

    if (!recipient || !apikey || recipient.includes("XX")) {
      return;
    }

    // Ensure recipient has + prefix
    if (!recipient.startsWith("+")) {
      recipient = "+" + recipient;
    }

    const url = `https://api.textmebot.com/send.php?recipient=${encodeURIComponent(recipient)}&apikey=${apikey}&text=${encodeURIComponent(message)}`;
    await axios.get(url);
    console.log(`  📱 Dynamic WhatsApp Sent to ${recipient}`);
  } catch (error) {
    console.error("  ✗ Dynamic WhatsApp failed:", error.message);
  }
}
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
const mqttClient = mqtt.connect(MQTT_BROKER, {
  username: MQTT_USER,
  password: MQTT_PASS,
  rejectUnauthorized: false // Required for HiveMQ Cloud if not providing cert
});

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
      const msg = "Baby is crying! Please check the cradle immediately.";
      await SensorAlert.create({
        alertType: "CRYING",
        message:   msg,
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
      sendAlertEmail("Smart Cradle Alert: Baby is crying", msg);
      sendWhatsAppAlert("🚨 Alert: Baby is crying!");
    }

    // Diaper is wet
    if (data.isWet && canLogAlert("WET")) {
      const msg = "Sensor detected moisture in the diaper area. Diaper may need changing.";
      await SensorAlert.create({
        alertType: "WET",
        message:   msg,
        sensorData: sensorSnapshot,
        severity:  "high",
      });
      io.emit("alert", {
        type: "WET",
        message: "💧 Moisture detected!",
        severity: "high",
        timestamp: new Date(),
      });
      console.log("  ⚠ Alert logged: WET");
      sendAlertEmail("Smart Cradle Alert: Moisture detected", msg);
      sendWhatsAppAlert("💧 Alert: Moisture detected in diaper area.");
    }

    // Temperature too high
    if (data.tempAlert && canLogAlert("HIGH_TEMP")) {
      const msg = `Temperature increases to ${data.temperature}°C. It's getting too warm for the baby.`;
      await SensorAlert.create({
        alertType: "HIGH_TEMP",
        message:   msg,
        sensorData: sensorSnapshot,
        severity:  "critical",
      });
      io.emit("alert", {
        type: "HIGH_TEMP",
        message: `🌡️ Temperature increases: ${data.temperature}°C`,
        severity: "critical",
        timestamp: new Date(),
      });
      console.log("  ⚠ Alert logged: HIGH_TEMP");
      sendAlertEmail("Smart Cradle Alert: Temperature increases", msg);
      sendWhatsAppAlert(`🌡️ Alert: Temperature increases to ${data.temperature}°C`);
    }

    // Motion detected (Baby wakes up)
    if (data.motion && canLogAlert("MOTION")) {
      const msg = "Motion detected. The baby might be waking up.";
      await SensorAlert.create({
        alertType: "MOTION",
        message:   msg,
        sensorData: sensorSnapshot,
        severity:  "low",
      });
      console.log("  ℹ Alert logged: MOTION");
      sendAlertEmail("Smart Cradle Alert: Baby is waking up", msg);
      sendWhatsAppAlert("👶 Alert: Baby is waking up (Motion detected)");
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

  // Handle AI-triggered alerts from the browser
  socket.on("aiAlert", (type) => {
    if (type === "VISION_MOTION" && canLogAlert("VISION_MOTION")) {
      const msg = "AI Camera detected baby movement in the cradle.";
      console.log("  👁 AI Alert: VISION_MOTION");
      sendAlertEmail("Smart Cradle Alert: Baby is moving", msg);
      sendWhatsAppAlert("👁 AI Alert: Baby movement detected by camera");
      io.emit("alert", { type: "MOTION", message: "👁 Camera detected movement", severity: "low", timestamp: new Date() });
    }
    if (type === "WAKING" && canLogAlert("WAKING")) {
      const msg = "AI Camera detected baby's eyes are open. Baby is waking up!";
      console.log("  👁 AI Alert: WAKING");
      sendAlertEmail("Smart Cradle Alert: Baby is waking up", msg);
      sendWhatsAppAlert("👶 AI Alert: Baby is waking up (Eyes open)");
      io.emit("alert", { type: "WAKING", message: "👶 Baby is waking up!", severity: "high", timestamp: new Date() });
    }
    if (type === "CRYING_AI" && canLogAlert("CRYING_AI")) {
      const msg = "AI Camera audio analysis detected the baby is crying.";
      console.log("  🔊 AI Alert: CRYING_AI");
      sendAlertEmail("Smart Cradle Alert: Baby is crying (AI)", msg);
      sendWhatsAppAlert("🍼 AI Alert: Baby is crying (Detected by Audio AI)");
      io.emit("alert", { type: "CRYING", message: "🍼 AI: Baby is crying!", severity: "high", timestamp: new Date() });
    }
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

// ─── Registration & System Config ──────────────────────────
app.get("/api/config", async (req, res) => {
  try {
    const config = await SystemConfig.findOne({ configId: "primary_setup" });
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { motherEmail, motherPhone, whatsappApiKey } = req.body;
    const config = await SystemConfig.findOneAndUpdate(
      { configId: "primary_setup" },
      { motherEmail, motherPhone, whatsappApiKey, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, config });
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
