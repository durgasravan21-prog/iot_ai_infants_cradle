import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
const STORAGE_KEY = "smartcradle_last_data";
const HISTORY_KEY = "smartcradle_temp_history";

/**
 * Load last known sensor data from localStorage (persists across refreshes).
 */
function loadPersistedData(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Custom hook — manages the Socket.io connection lifecycle.
 * When offline, retains last real sensor data (no fake/demo data).
 * Persists last known state to localStorage so it survives page refreshes.
 */
export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [sensorData, setSensorData] = useState(() => loadPersistedData(STORAGE_KEY, null));
  const [alerts, setAlerts] = useState([]);
  const [isRocking, setIsRocking] = useState(false);
  const [tempHistory, setTempHistory] = useState(() => loadPersistedData(HISTORY_KEY, []));
  const [lastUpdated, setLastUpdated] = useState(null);

  const addToHistory = useCallback((data) => {
    const now = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    setTempHistory((prev) => {
      const next = [...prev, { time: now, temp: data.temperature, humidity: data.humidity }];
      const trimmed = next.slice(-30);
      // Persist to localStorage
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed)); } catch {}
      return trimmed;
    });
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 5000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✓ Socket.io connected:", socket.id);
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("✗ Socket.io disconnected");
      setConnected(false);
    });

    socket.on("connect_error", () => {
      setConnected(false);
    });

    socket.on("sensorData", (data) => {
      setSensorData(data);
      setLastUpdated(new Date());
      addToHistory(data);
      // Persist last data to localStorage
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
    });

    socket.on("alert", (alert) => {
      setAlerts((prev) => [{ ...alert, id: Date.now() }, ...prev].slice(0, 20));
    });

    socket.on("rockingState", (state) => {
      setIsRocking(state);
    });

    return () => {
      socket.disconnect();
    };
  }, [addToHistory]);

  const sendRockCommand = useCallback((command) => {
    if (socketRef.current && connected) {
      socketRef.current.emit("rockCommand", command);
    }
    setIsRocking(command === "rock");
  }, [connected]);

  const dismissAlert = useCallback((alertId) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  const handleExternalData = useCallback((data) => {
    setSensorData(data);
    setLastUpdated(new Date());
    addToHistory(data);
    // Persist last data to localStorage
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, [addToHistory]);

  return {
    connected,
    sensorData,
    alerts,
    isRocking,
    tempHistory,
    lastUpdated,
    sendRockCommand,
    dismissAlert,
    handleExternalData,
  };
}
