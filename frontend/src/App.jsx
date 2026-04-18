import { useState, useRef, useEffect } from "react";
import useMqtt from "./hooks/useMqtt";
import { useCamera } from "./hooks/useCamera";
import { useBluetooth } from "./hooks/useBluetooth";
import SensorCards from "./components/SensorCards";
import CameraFeed from "./components/CameraFeed";
import TempChart from "./components/TempChart";
import AlertToasts from "./components/AlertToasts";
import RockingControl from "./components/RockingControl";
import StatusBar from "./components/StatusBar";
import BluetoothPanel from "./components/BluetoothPanel";
import { FiWifi, FiWifiOff, FiCpu, FiBluetooth } from "react-icons/fi";

export default function App() {
  // ── MQTT (Vercel-friendly Direct Connectivity) ──
  const { 
    connected, 
    sensorData, 
    lastUpdated, 
    sendCommand: mqttSendCommand, 
    handleExternalData 
  } = useMqtt();

  const [tempHistory, setTempHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isRocking, setIsRocking] = useState(false);

  // Accumulate chart history and local alert log
  useEffect(() => {
    if (sensorData) {
      // 1. Chart History
      setTempHistory(prev => {
        const newEntry = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          temp: sensorData.temperature
        };
        const updated = [...prev, newEntry];
        return updated.slice(-20);
      });

      // 2. Alert Logging (Replaces LCD History)
      if (sensorData.isCrying || sensorData.isWet || sensorData.tempAlert || sensorData.motion) {
        const msg = sensorData.isCrying ? "Baby is Crying!" 
                  : sensorData.isWet ? "Diaper is Wet!" 
                  : sensorData.tempAlert ? "High Temperature Alert!"
                  : "Activity Detected";
        
        setAlerts(prev => {
          // Don't spam duplicate alerts if same event is active
          if (prev.length > 0 && prev[0].message === msg) return prev;
          return [{ id: Date.now(), message: msg, timestamp: new Date() }, ...prev].slice(0, 10);
        });
      }

      setIsRocking(sensorData.isRocking);
    }
  }, [sensorData]);

  // ── Camera (phone/USB/IP) ──
  const {
    videoRef,
    cameraActive,
    cameraError,
    cameraDevices,
    selectedDeviceId,
    cameraMode,
    ipCameraUrl,
    loading: cameraLoading,
    setCameraMode,
    setIpCameraUrl,
    startCamera,
    startIpCamera,
    stopCamera,
    switchCamera,
    enumerateDevices,
  } = useCamera();

  // ── Bluetooth (ESP32 connection) ──
  const {
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
  } = useBluetooth(handleExternalData);

  // Cross-protocol rocking controller
  const handleRockToggle = () => {
    const action = isRocking ? "stop" : "rock";
    if (btConnected) {
      writeToDevice(action); // BLE Direct Command
    } else {
      mqttSendCommand(action); // MQTT Command via MQTT
    }
    setIsRocking(!isRocking);
  };

  return (
    <div className="min-h-screen pb-8">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0a0e1a]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-lg">🍼</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent truncate pr-2">
                Smart Cradle
              </h1>
              <p className="text-[10px] text-slate-500 -mt-0.5 truncate">IoT Baby Monitor</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection Status Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
                btConnected
                  ? "bg-blue-500/10 text-blue-400 border border-blue-400/20"
                  : connected
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-400/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-400/20"
              }`}
            >
              {btConnected ? (
                <FiBluetooth size={11} className="animate-pulse" />
              ) : connected ? (
                <FiWifi size={11} />
              ) : (
                <FiWifiOff size={11} />
              )}
              <span>{btConnected ? "BLE LIVE" : connected ? "WIFI LIVE" : "OFFLINE"}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-600 whitespace-nowrap ml-2">
              <FiCpu size={10} />
              <span>ESP32</span>
            </div>
          </div>
        </div>

        {/* Offline banner with last updated time */}
        {!(connected || btConnected) && sensorData && lastUpdated && (
          <div className="bg-amber-500/5 border-t border-amber-500/10 px-4 py-1.5 text-center">
            <p className="text-[10px] text-amber-400/70">
              Offline — showing last data from{" "}
              <span className="font-semibold text-amber-400">
                {lastUpdated.toLocaleTimeString()}
              </span>
            </p>
          </div>
        )}
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-6xl mx-auto px-4 mt-5 space-y-5">
        {/* Status Bar — LCD Replacement */}
        <StatusBar data={sensorData} />

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start pb-4">
          {/* Left Column: Camera + Bluetooth + Cradle Control */}
          <div className="lg:col-span-2 flex flex-col gap-4 w-full min-w-0">
            <CameraFeed
              videoRef={videoRef}
              cameraActive={cameraActive}
              cameraError={cameraError}
              cameraDevices={cameraDevices}
              selectedDeviceId={selectedDeviceId}
              cameraMode={cameraMode}
              ipCameraUrl={ipCameraUrl}
              loading={cameraLoading}
              setCameraMode={setCameraMode}
              setIpCameraUrl={setIpCameraUrl}
              startCamera={startCamera}
              startIpCamera={startIpCamera}
              stopCamera={stopCamera}
              switchCamera={switchCamera}
              enumerateDevices={enumerateDevices}
            />

            <BluetoothPanel
              btSupported={btSupported}
              scanning={scanning}
              btDevice={btDevice}
              btConnected={btConnected}
              btError={btError}
              discoveredDevices={discoveredDevices}
              scanForDevices={scanForDevices}
              connectToDevice={connectToDevice}
              disconnectDevice={disconnectDevice}
              removeDevice={removeDevice}
              setBtError={setBtError}
            />

            <RockingControl isRocking={isRocking} onToggle={handleRockToggle} />
          </div>

          {/* Right Column: Sensor Cards + Chart */}
          <div className="lg:col-span-3 w-full min-w-0 flex flex-col gap-4">
            <div className="w-full mb-6 relative">
              <SensorCards data={sensorData} />
            </div>
            <div className="w-full relative">
              <TempChart data={tempHistory} />
            </div>

            {/* Local Alerts History Log */}
            <div className="glass-card p-4 mt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                Live Event Log
              </h3>
              <div className="space-y-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-2">
                {alerts.length === 0 ? (
                  <p className="text-[10px] text-slate-600 italic">No events recorded yet...</p>
                ) : (
                  alerts.map(a => (
                    <div key={a.id} className="flex items-center justify-between text-[11px] py-1 border-b border-white/5 last:border-0">
                      <span className="text-slate-300 font-medium">{a.message}</span>
                      <span className="text-slate-600 font-mono">{a.timestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="max-w-6xl mx-auto px-4 mt-8 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between text-[10px] text-slate-600">
          <span>IoT Smart Cradle • Vercel Architecture (MQTT + BLE)</span>
          <span>Replaces ESP32-CAM & Phys. LCD</span>
        </div>
      </footer>
    </div>
  );
}
