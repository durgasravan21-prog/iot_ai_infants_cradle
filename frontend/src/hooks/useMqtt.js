import { useState, useEffect, useCallback } from "react";
import mqtt from "mqtt";

/**
 * useMqtt — Directly connects to HiveMQ Cloud from the browser.
 * This removes the need for a custom Node.js backend on Vercel.
 */
export default function useMqtt() {
  const [mqttClient, setMqttClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sensorData, setSensorData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Configuration (Use Vercel Environment Variables in Production)
  const brokerConfig = {
    url: import.meta.env.VITE_MQTT_URL || "wss://broker.hivemq.com:8884/mqtt", // Default public broker
    username: import.meta.env.VITE_MQTT_USERNAME || "",
    password: import.meta.env.VITE_MQTT_PASSWORD || "",
    topicSensors: "cradle/sensors",
    topicCommands: "cradle/commands",
  };

  useEffect(() => {
    const client = mqtt.connect(brokerConfig.url, {
      username: brokerConfig.username,
      password: brokerConfig.password,
      clientId: "smart_cradle_client_" + Math.random().toString(16).substring(2, 8),
      clean: true,
      reconnectPeriod: 1000,
    });

    client.on("connect", () => {
      console.log("Connected to HiveMQ Cloud via MQTT over WebSockets");
      setConnected(true);
      client.subscribe(brokerConfig.topicSensors);
    });

    client.on("message", (topic, message) => {
      if (topic === brokerConfig.topicSensors) {
        try {
          const data = JSON.parse(message.toString());
          // Sync with the existing state logic
          setSensorData(data);
          setLastUpdated(new Date());
          
          // Persistence
          localStorage.setItem("cradle_last_data", JSON.stringify(data));
          localStorage.setItem("cradle_last_time", new Date().toISOString());
        } catch (e) {
          console.error("MQTT Parse Error", e);
        }
      }
    });

    client.on("close", () => setConnected(false));
    client.on("error", (err) => console.error("MQTT Error:", err));

    setMqttClient(client);

    return () => {
      if (client) client.end();
    };
  }, []);

  // Shared function to handle incoming BLE data too
  const handleExternalData = useCallback((data) => {
    setSensorData(data);
    setLastUpdated(new Date());
  }, []);

  const sendCommand = (cmd) => {
    if (mqttClient && connected) {
      mqttClient.publish(brokerConfig.topicCommands, cmd);
      console.log("MQTT Command Sent:", cmd);
    }
  };

  return { connected, sensorData, lastUpdated, sendCommand, handleExternalData };
}
