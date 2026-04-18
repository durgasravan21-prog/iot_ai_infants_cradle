# 🍼 Smart Cradle — IoT Baby Monitor

Welcome to the **Smart Cradle Dashboard**, a cutting-edge, "Phone-First" IoT web application designed to help parents monitor their baby's environment and physically control an ESP32-powered cradle from anywhere in the world.

![Smart Cradle Dashboard](frontend/public/favicon.ico)

## 🌟 Key Features

* **Multi-Protocol Connectivity**: 
  - **WiFi / MQTT**: Remote tracking and control via a Node.js signaling backend.
  - **Web Bluetooth (BLE)**: 100% offline, local real-time hardware connection directly from your browser to the ESP32.
* **Live Sensor Telemetry**: Monitors Temperature, Moisture (diaper wetness), Sound levels (crying), and Motion.
* **Camera Integration**: Support for both USB Webcams, mobile device cameras, and local IP Camera streams to keep a visual on the baby.
* **Cradle Control**: Manually trigger rocking maneuvers on the device via the intuitive dashboard toggle.
* **Beautiful, Responsive UI**: Uses a vibrant glassmorphism design that looks perfect on both mobile devices and desktop monitors, adjusting layouts automatically to prevent overlapping.

## 🛠 Tech Stack

* **Frontend**: React + Vite, Tailwind CSS, Recharts for trends, Lucide/Feather icons.
* **Backend**: Node.js + Express + Socket.io + MQTT.
* **Hardware**: ESP32 with DHT11, Sound Sensor, Motion Sensor, Moisture Sensor, and Servos.

## 🚀 Getting Started

### 1. Hardware Setup
Flash the `hardware/smart_cradle.ino` firmware onto your ESP32. Ensure you have the required libraries installed:
- `DHT sensor library`
- `PubSubClient` (for MQTT)
- `ESP32 BLE Arduino`

### 2. Frontend Setup
Navigate to the `frontend` folder, install dependencies, and start the development server:
```bash
cd frontend
npm install
npm run dev
```

### 3. Backend Setup
Navigate to the `backend` folder and start the socket server:
```bash
cd backend
npm install
npm start
```

## 🌐 Vercel Deployment

This project is fully ready to be deployed to Vercel!
1. Push this repository to your GitHub.
2. Log into [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your GitHub repository (`iot_ai_infants_cradle`).
4. Set the **Framework Preset** to `Vite` (Vercel usually detects this automatically from the `frontend` package.json).
5. **Root Directory**: Select the `frontend` folder since it contains the Vite app.
6. **Environment Variables**: Add `VITE_BACKEND_URL` and set it to your deployed Node.js backend URL (e.g. Railway or Render). If you are only using Bluetooth locally, you can leave it blank.
7. Click **Deploy**!

## 📱 Using Web Bluetooth (BLE)
To connect directly to the ESP32 without an internet connection:
1. Ensure your ESP32 is powered on.
2. Click the **Scan Bluetooth** button on the dashboard.
3. Select "SmartCradle_BLE" from your browser's pairing menu.
4. Once paired, the top status bar will change to **BLE Live** and sensor data will steam natively into the UI!

---
*Created by [durgasravan21-prog](https://github.com/durgasravan21-prog).*
