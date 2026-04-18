import { useSocket } from "./hooks/useSocket";
import { useCamera } from "./hooks/useCamera";
import { useBluetooth } from "./hooks/useBluetooth";
import SensorCards from "./components/SensorCards";
import CameraFeed from "./components/CameraFeed";
import TempChart from "./components/TempChart";
import AlertToasts from "./components/AlertToasts";
import RockingControl from "./components/RockingControl";
import StatusBar from "./components/StatusBar";
import BluetoothPanel from "./components/BluetoothPanel";
import { FiWifi, FiWifiOff, FiCpu } from "react-icons/fi";

export default function App() {
  // ── Socket.io (sensor data) ──
  const {
    connected,
    sensorData,
    alerts,
    isRocking,
    tempHistory,
    lastUpdated,
    sendRockCommand,
    dismissAlert,
    handleExternalData,
  } = useSocket();

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
  const handleRockToggle = (action) => {
    if (btConnected) {
      sendCommand(action); // BLE Direct Command
    }
    // Also broadcast to Socket/MQTT (if socket happens to be alive it will update sibling clients)
    sendRockCommand(action);
  };

  return (
    <div className="min-h-screen pb-8">
      {/* ── Alert Toasts ── */}
      <AlertToasts alerts={alerts} onDismiss={dismissAlert} />

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0a0e1a]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-y-3">
          <div className="flex items-center gap-3 max-w-full">
            <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-lg">🍼</span>
            </div>
            <div>
              <h1 className="text-base font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent truncate pr-2">
                Smart Cradle
              </h1>
              <p className="text-[10px] text-slate-500 -mt-0.5 truncate">IoT Baby Monitor</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            {/* Bluetooth Status */}
            {btConnected && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-medium whitespace-nowrap">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" />
                </svg>
                BT
              </div>
            )}

            {/* Connection Status */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap ${
                btConnected
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : connected
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}
              id="connection-status"
            >
              {btConnected ? (
                <FiBluetooth size={10} />
              ) : connected ? (
                <FiWifi size={10} />
              ) : (
                <FiWifiOff size={10} />
              )}
              {btConnected ? "BLE Live" : connected ? "WiFi Live" : "Offline"}
            </div>

            <div className="flex items-center gap-1 text-[10px] text-slate-600 whitespace-nowrap ml-1 sm:ml-2">
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
          </div>
        </div>

        {/* Alert History */}
        {alerts.length > 0 && (
          <div className="glass-card p-5" id="alert-history">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">📋 Recent Alerts</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background:
                        alert.severity === "critical"
                          ? "#ef4444"
                          : alert.severity === "high"
                          ? "#f43f5e"
                          : "#f59e0b",
                    }}
                  />
                  <span className="text-xs text-slate-300 flex-1">{alert.message}</span>
                  <span className="text-[10px] text-slate-600 font-mono flex-shrink-0">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="max-w-6xl mx-auto px-4 mt-8 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between text-[10px] text-slate-600">
          <span>IoT Smart Cradle • ESP32 + Node.js + React</span>
          <span>Phone-First Architecture</span>
        </div>
      </footer>
    </div>
  );
}
