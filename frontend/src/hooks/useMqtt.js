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
    url: "wss://broker.hivemq.com:8884/mqtt",
    topicSensors: "sravan_cradle_iot/sensors",
    topicCommands: "sravan_cradle_iot/commands",
  };

  useEffect(() => {
    const clientId = `web_cradle_client_${Math.random().toString(16).slice(2, 10)}`;
    
    const client = mqtt.connect(brokerConfig.url, {
      username: brokerConfig.username,
      password: brokerConfig.password,
      clientId: clientId,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 5000,
      protocol: 'wss'
    });

    client.on('connect', () => {
      console.log('☁️ MQTT Cloud Connected (HiveMQ)');
      setMqttStatus('connected');
      setConnected(true);
      client.subscribe(brokerConfig.topicSensors);
    });

    client.on('error', (err) => {
      console.error('MQTT Security Error:', err.message);
      if (err.message.includes("Authorized")) {
        console.warn("🔧 ACTION NEEDED: Check HiveMQ Access Management tab for 'cradle_user' password.");
      }
      setMqttStatus('error');
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
