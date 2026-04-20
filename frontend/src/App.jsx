import { useState, useRef, useEffect } from "react";
import { useSocket } from "./hooks/useSocket";
import { useCamera } from "./hooks/useCamera";
import { useBluetooth } from "./hooks/useBluetooth";
import SensorCards from "./components/SensorCards";
import CameraFeed from "./components/CameraFeed";
import TempChart from "./components/TempChart";
import { useSerial } from "./hooks/useSerial";
import AlertToasts from "./components/AlertToasts";
import RockingControl from "./components/RockingControl";
import StatusBar from "./components/StatusBar";
import ConnectivityManager from "./components/ConnectivityManager";
import SessionSetup from "./components/SessionSetup";
import { FiWifi, FiWifiOff, FiCpu, FiBluetooth, FiActivity } from "react-icons/fi";

export default function App() {

  // ── Backend Connectivity (Socket.io) ──
  const { 
    connected, 
    sensorData, 
    lastUpdated, 
    sendRockCommand, 
    sendAiAlert,
    handleExternalData,
    alerts: activeAlerts,
    isRocking: socketRocking
  } = useSocket();

  const [tempHistory, setTempHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isRocking, setIsRocking] = useState(false);
  const [aiData, setAiData] = useState({ 
    motionLevel: 0, 
    eyesOpen: false, 
    isCrying: false, 
    audioLevel: 0 
  });
  const [systemConfig, setSystemConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);

  // Check for existing registration in DB or localStorage
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // 1. Check if device already completed setup
        const isSetup = localStorage.getItem("smart_cradle_setup_done");
        
        // 2. Fetch from backend
        const res = await fetch("http://localhost:4000/api/config");
        const data = await res.json();
        
        if (data.success && data.config) {
          if (isSetup) {
            // ONLY skip if both Backend has it AND this device has done it
            setSystemConfig(data.config);
          }
        }
      } catch (err) {
        console.error("Config fetch failed:", err);
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSetupComplete = (config) => {
    localStorage.setItem("smart_cradle_setup_done", "true");
    setSystemConfig(config);
  };

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
    isMirrored,
    loading: cameraLoading,
    startCamera,
    stopCamera,
    switchCamera,
    enumerateDevices,
    toggleMirror,
  } = useCamera();

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
    removeDevice,
    setBtError,
  } = useBluetooth(handleExternalData);

  // ── Serial (USB/COM connection) ──
  const {
    serialConnected,
    serialError,
    connectSerial,
    disconnectSerial,
    sendSerialCommand
  } = useSerial(handleExternalData);

  // ── Sync Rocking State ──
  useEffect(() => {
    setIsRocking(socketRocking || (sensorData && sensorData.isRocking));
  }, [socketRocking, sensorData]);

  // Cross-protocol rocking controller
  const handleRockToggle = () => {
    const action = isRocking ? "stop" : "rock";
    if (btConnected) {
      sendCommand(action); 
    } else if (serialConnected) {
      sendSerialCommand(action);
    } else {
      sendRockCommand(action); 
    }
  };

  // ── AI Alert Triggers (Send to Backend/Email) ──
  useEffect(() => {
    if (aiData.motionLevel > 40) {
      sendAiAlert("VISION_MOTION");
    }
    if (aiData.eyesOpen) {
      sendAiAlert("WAKING");
    }
    if (aiData.isCrying) {
      sendAiAlert("CRYING_AI");
    }
  }, [aiData, sendAiAlert]);

  if (configLoading) {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!systemConfig) {
    return <SessionSetup onComplete={handleSetupComplete} />;
  }

  return (
    <div className="min-h-screen pb-20 relative bg-fixed bg-gradient-to-br from-[#0a0c10] via-[#0f1118] to-[#12141c]">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold z-50 transition-all border ${
                serialConnected
                  ? "bg-orange-500/10 text-orange-400 border-orange-400/30 animate-pulse"
                  : btConnected
                  ? "bg-blue-500/10 text-blue-400 border-blue-400/30 animate-pulse"
                  : connected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-400/30"
                  : "bg-rose-500/10 text-rose-400 border-rose-400/30"
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${
                serialConnected ? "bg-orange-400" :
                btConnected ? "bg-blue-400" :
                connected ? "bg-emerald-400" : "bg-rose-400"
              } shadow-sm`} />
              {serialConnected ? "SERIAL (COM5) LIVE" : 
               btConnected ? "BLE LIVE" : 
               connected ? "SERVER ONLINE" : "OFFLINE"}
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
              isMirrored={isMirrored}
              loading={cameraLoading}
              startCamera={startCamera}
              stopCamera={stopCamera}
              switchCamera={switchCamera}
              enumerateDevices={enumerateDevices}
              toggleMirror={toggleMirror}
              onAiUpdate={setAiData}
            />

            {/* Emergency Fail-safe USB Button */}
            <div className="glass-card p-4 border-2 border-orange-500/30 bg-orange-500/5 mb-4 scale-105 shadow-2xl shadow-orange-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg">
                      <FiUsb size={20} />
                   </div>
                   <div>
                      <p className="text-sm font-black text-white uppercase tracking-tighter">Connect USB (Fail-Safe)</p>
                      <p className="text-[10px] text-orange-300 font-bold">Priority Port: COM5</p>
                   </div>
                </div>
                <button 
                  onClick={connectSerial}
                  className="px-6 py-2.5 bg-white text-orange-600 text-xs font-black rounded-xl hover:bg-orange-50 active:scale-95 transition-all shadow-xl"
                >
                  {serialConnected ? "DISCONNECT USB" : "CONNECT USB PORT"}
                </button>
              </div>
            </div>

            <ConnectivityManager
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
              // Serial Props
              serialConnected={serialConnected}
              serialError={serialError}
              connectSerial={connectSerial}
              disconnectSerial={disconnectSerial}
            />

            <RockingControl isRocking={isRocking} onToggle={handleRockToggle} />
          </div>

          {/* Right Column: Sensor Data & Controls */}
          <div className="lg:col-span-3 flex flex-col gap-4 w-full min-w-0 pb-10">
            <SensorCards data={sensorData} aiData={aiData} />
            <TempChart data={tempHistory} />

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
          <span>IoT Smart Cradle • Vercel v2.1 (Multi-Link)</span>
          <span>Replaces ESP32-CAM & Phys. LCD</span>
        </div>
      </footer>
    </div>
  );
}
