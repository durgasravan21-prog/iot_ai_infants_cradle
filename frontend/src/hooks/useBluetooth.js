import { useState, useCallback, useRef } from "react";

/**
 * Custom hook for Web Bluetooth API — scan for and connect to ESP32 boards.
 * Listens for real-time sensor updates over BLE.
 */
export function useBluetooth(onDataReceived) {
  const [btSupported] = useState(() => !!navigator.bluetooth);
  const [scanning, setScanning] = useState(false);
  const [btDevice, setBtDevice] = useState(null);
  const [btConnected, setBtConnected] = useState(false);
  const [btError, setBtError] = useState(null);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  
  // Store characteristic references for writing and cleanup
  const rxCharacteristicRef = useRef(null);
  const txCharacteristicRef = useRef(null);

  // ESP32 BLE UUIDs
  const ESP32_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  const ESP32_TX_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"; // Notify from ESP32
  const ESP32_RX_UUID = "e3223119-9445-4e96-a4a1-85358ce291d0"; // Write to ESP32

  const scanForDevices = useCallback(async () => {
    if (!navigator.bluetooth) {
      setBtError("Bluetooth is not supported in this browser. Use Chrome or Edge.");
      return;
    }

    try {
      setScanning(true);
      setBtError(null);

      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: "Smart Cradle" },
          { services: [ESP32_SERVICE_UUID] }
        ],
        optionalServices: [ESP32_SERVICE_UUID, "battery_service", "device_information"],
      });

      setDiscoveredDevices([{ id: device.id, name: device.name || "Smart Cradle", device }]);

      setScanning(false);
    } catch (err) {
      setScanning(false);
      if (err.name !== "NotFoundError") {
        setBtError(err.message);
      }
    }
  }, []);

  const handleCharacteristicValueChanged = useCallback((event) => {
    const value = event.target.value;
    const decoder = new TextDecoder("utf-8");
    const jsonString = decoder.decode(value);
    
    try {
      const data = JSON.parse(jsonString);
      if (onDataReceived) {
        onDataReceived(data);
      }
    } catch (e) {
      console.warn("Failed to parse BLE JSON payload:", jsonString);
    }
  }, [onDataReceived]);

  const connectToDevice = useCallback(async (deviceEntry) => {
    try {
      setBtError(null);
      const device = deviceEntry.device;
      setBtDevice(device);

      device.addEventListener("gattserverdisconnected", () => {
        setBtConnected(false);
        rxCharacteristicRef.current = null;
        txCharacteristicRef.current = null;
        console.log("Bluetooth device disconnected");
      });

      const server = await device.gatt.connect();
      setBtConnected(true);

      try {
        const service = await server.getPrimaryService(ESP32_SERVICE_UUID);
        
        // Setup TX (Notifications)
        const txChar = await service.getCharacteristic(ESP32_TX_UUID);
        await txChar.startNotifications();
        txChar.addEventListener("characteristicvaluechanged", handleCharacteristicValueChanged);
        txCharacteristicRef.current = txChar;

        // Setup RX (Write commands)
        const rxChar = await service.getCharacteristic(ESP32_RX_UUID);
        rxCharacteristicRef.current = rxChar;
        
      } catch (err) {
        console.log("Failed to setup BLE characteristics: ", err);
        setBtError("Service found but failed to setup data stream.");
      }
    } catch (err) {
      setBtError("Connection failed: " + err.message);
      setBtConnected(false);
    }
  }, [handleCharacteristicValueChanged]);

  const disconnectDevice = useCallback(() => {
    if (btDevice && btDevice.gatt.connected) {
      btDevice.gatt.disconnect();
    }
    setBtDevice(null);
    setBtConnected(false);
    rxCharacteristicRef.current = null;
    txCharacteristicRef.current = null;
  }, [btDevice]);

  const sendCommand = useCallback(async (command) => {
    if (!rxCharacteristicRef.current) return;
    try {
      const encoder = new TextEncoder();
      await rxCharacteristicRef.current.writeValue(encoder.encode(command));
    } catch (err) {
      setBtError("Send failed: " + err.message);
    }
  }, []);

  const removeDevice = useCallback((deviceId) => {
    setDiscoveredDevices((prev) => prev.filter((d) => d.id !== deviceId));
  }, []);

  return {
    btSupported,
    scanning,
    btDevice,
    btConnected,
    btError,
    discoveredDevices,
    scanForDevices,
    connectToDevice,
    disconnectDevice,
    sendCommand,
    removeDevice,
    setBtError,
  };
}
