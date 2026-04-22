import { useState, useRef, useEffect, useCallback } from "react";
import useMqtt from "./hooks/useMqtt";
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
import { FiWifi, FiWifiOff, FiCpu, FiBluetooth, FiActivity, FiHardDrive } from "react-icons/fi";

export default function App() {

  // ── Browser-Direct Connectivity (MQTT over WebSockets) ──
  const { 
    connected, 
    sensorData: cloudData, 
    lastUpdated, 
    sendCommand: sendMqttCommand, 
    handleExternalData
  } = useMqtt();
  
  // Dummy sendAiAlert since the local server is gone (Vercel API handles actual alerts)
  const sendAiAlert = (type) => console.log("AI Alert Triggered (Handled by Vercel API):", type);
  const activeAlerts = []; 
  const socketRocking = false;

  const [tempHistory, setTempHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sensorData, setSensorData] = useState(null);
  const [lastHb, setLastHb] = useState(0);
  const [isHbAlive, setIsHbAlive] = useState(false);
  const [isRocking, setIsRocking] = useState(false);

  const [aiData, setAiData] = useState({ 
    aiActive: false,
    motionLevel: 0, 
    eyesOpen: false, 
    mouthOpen: false,
    isCrying: false, 
    audioLevel: 0 
  });
  const [systemConfig, setSystemConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);

  // Check for existing config in localStorage (no backend needed)
  useEffect(() => {
    const isSetup = localStorage.getItem("smart_cradle_setup_done");
    const savedConfig = localStorage.getItem("smart_cradle_config");
    
    if (isSetup && savedConfig) {
      try {
        setSystemConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error("Failed to parse saved config");
      }
    }
    setConfigLoading(false);
  }, []);

  // 3. Sync Cloud Data to Local State (Standardized)
  useEffect(() => {
    if (cloudData) {
      setSensorData(prev => ({
        ...prev,
        temperature: Number(cloudData.temperature || cloudData.temp || 0),
        humidity: Number(cloudData.humidity || cloudData.hum || 0),
        sound: Number(cloudData.sound || 0),
        isCrying: Boolean(cloudData.isCrying),
        isWet: Boolean(cloudData.isWet),
        isRocking: Boolean(cloudData.isRocking),
        hb: cloudData.hb
      }));
    }
  }, [cloudData]);

  const handleSetupComplete = (config) => {
    localStorage.setItem("smart_cradle_setup_done", "true");
    setSystemConfig(config);
  };

  // Accumulate chart history and local alert log
  useEffect(() => {
    if (cloudData) {
      // 1. Chart History (Filter out -1 error values)
      if (cloudData.temperature >= 0) {
        setTempHistory(prev => {
          const newEntry = {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            temp: cloudData.temperature
          };
          const updated = [...prev, newEntry];
          return updated.slice(-20);
        });
      }

      // 2. Alert Logging (Hardware Alerts) - Safe Check
      if (sensorData?.isWet || sensorData?.tempAlert) {
        const msg = sensorData?.isWet ? "Diaper is Wet!" : "High Temperature Alert!";
        
        setAlerts(prev => {
          if (prev.length > 0 && prev[0].message === msg) return prev;
          return [{ id: Date.now(), message: msg, timestamp: new Date() }, ...prev].slice(0, 10);
        });
      }

      setIsRocking(sensorData?.isRocking || false);
    }
  }, [sensorData]);

  const handleSerialData = useCallback((data) => {
    if (!data) return;
    
    // Debug log to confirm packet arrival
    if (data.hb) console.log("✅ DATA RECEIVED:", data);

    // Standardize the keys
    const raw = { ...data };
    const standardized = {
      temperature: Number(raw.temperature || raw.temp || 0),
      humidity: Number(raw.humidity || raw.hum || 0),
      sound: Number(raw.sound || 0),
      isCrying: Boolean(raw.isCrying),
      isWet: Boolean(raw.isWet),
      isRocking: Boolean(raw.isRocking),
      hb: raw.hb
    };

    // Update the Dashboard State instantly
    setSensorData(standardized);
    
    if (raw.hb !== undefined) {
      setLastHb(raw.hb);
      setIsHbAlive(true);
    }
  }, []);

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
    sendCommand,
  } = useBluetooth(handleSerialData);

  // ── Serial (USB/COM connection) ──
  const {
    serialConnected,
    receiving: serialReceiving,
    serialError,
    connectSerial,
    disconnectSerial,
    sendSerialCommand
  } = useSerial(handleSerialData); // Correctly using the hb-aware handler

  // ── Sync Rocking State ──
  useEffect(() => {
    setIsRocking(socketRocking || (sensorData && sensorData.isRocking));
  }, [socketRocking, sensorData]);

  // Cross-protocol rocking controller
  const handleRockToggle = () => {
    const newState = !isRocking;
    const action = newState ? "rock" : "stop";
    setIsRocking(newState); // Immediate UI feedback
    
    if (serialConnected) {
      sendSerialCommand(action);
    } else if (btConnected) {
      sendCommand(action); 
    } else {
      sendMqttCommand(action); 
    }
  };

  // ── Critical Alerts Processing ──
  // Keeps track of when we last sent an alert so we don't spam
  const lastAlertTime = useRef({});
  
  const triggerEmergencyAlert = async (type, message) => {
    const now = Date.now();
    // Debounce alerts of the same type (5 minutes)
    if (lastAlertTime.current[type] && now - lastAlertTime.current[type] < 300000) return;
    lastAlertTime.current[type] = now;

    console.log(`🚨 Triggering Alert: [${type}] ${message}`);

    // Update UI Events
    setAlerts(prev => [{ id: Date.now(), type, message, timestamp: new Date() }, ...prev].slice(0, 20));

    try {
      // 1. Send to Backend Socket (if connected)
      sendAiAlert(type);
      
      // 2. Fallback / Serverless explicit trigger for Email & WhatsApp
      const motherEmail = "challagollasridevi@gmail.com";
      const motherPhone = systemConfig?.motherPhone || "";
      
      // We use our local Vite / Vercel API endpoint `/api/send-alert`
      // which securely dispatches Nodemailer & TextMeBot natively
      fetch('/api/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message, motherEmail, motherPhone })
      })
      .then(res => res.json())
      .then(data => {
          console.log("📨 Alert Dispatch Results:", data);
      })
      .catch(console.warn);
      
    } catch (e) {
      console.warn("Failed to process alert dispatch", e);
    }
  };

  // ── Smart Sensor + AI Validation (Cross-Referencing) ──
  useEffect(() => {
    if (!sensorData) return;
    
    const isMicTriggered = Boolean(sensorData.isCrying);
    const isPirTriggered = Boolean(sensorData.motion);
    const isMouthValidating = aiData && aiData.mouthOpen;
    const isCameraValidating = aiData && aiData.motionLevel > 15;

    // 1. High-Confidence Crying (Hardware Mic + Visual Mouth Observation)
    if (isMicTriggered && isMouthValidating) {
      triggerEmergencyAlert("CRITICAL_CRYING", "CONFIRMED: Mic + Mouth Opening detected!");
    } else if (isMicTriggered) {
      console.log("🔍 Mic heard sound, but camera is validating mouth movement...");
    }

    // 2. High-Confidence Motion (Hardware PIR + Visual Confirmation)
    if (isPirTriggered && isCameraValidating) {
      triggerEmergencyAlert("ACTIVITY_DETECTED", "CONFIRMED: PIR + Visual Motion detected!");
    }

    // 3. Independent Moisture (Wetness doesn't need camera)
    if (sensorData.isWet) {
      triggerEmergencyAlert("WET_DIAPER", "Moisture detected! Diaper change needed.");
    }
    
    if (sensorData.tempAlert) {
      triggerEmergencyAlert("HIGH_TEMP", `Temperature Alert! (${sensorData.temperature}°C)`);
    }
  }, [sensorData, aiData]);

  // (Removed duplicate combined block to prevent loop crashes)
  
  // ── Auto-Rocking Dispatch (Mic + Mouth Validation) ──
  useEffect(() => {
    if (!sensorData) return;
    
    // Motor starts ONLY if BOTH Hardware and AI agree
    const shouldAutoRock = sensorData.isCrying && (aiData && aiData.mouthOpen);
    
    if (shouldAutoRock && !isRocking) {
      setIsRocking(true);
      const action = "rock";
      if (serialConnected) sendSerialCommand(action);
      else if (btConnected) sendCommand(action);
      else sendMqttCommand(action);
    }
  }, [sensorData, aiData, isRocking, serialConnected, btConnected, sendSerialCommand, sendCommand, sendMqttCommand]);

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
              {serialReceiving ? "RECEIVING DATA (COM8)" : 
               serialConnected ? "SERIAL (COM8) CONNECTED" : 
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
                      <FiHardDrive size={20} />
                   </div>
                   <div>
                      <p className="text-sm font-black text-white uppercase tracking-tighter">Connect USB (Fail-Safe)</p>
                      <p className="text-[10px] text-orange-300 font-bold">Active Port: COM8</p>
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
            <SensorCards data={sensorData || cloudData} aiData={aiData} />
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
                      <span className="text-slate-600 font-mono">
                        {a.timestamp instanceof Date ? a.timestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "Recent"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active Alert Contacts */}
            <div className="glass-card p-4 mt-2 bg-indigo-500/5 border-indigo-500/10">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse" />
                Active Alert Contacts
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">Email Recipient</span>
                  <span className="text-[11px] text-slate-300 font-medium truncate">challagollasridevi@gmail.com</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">WhatsApp Recipient</span>
                  <span className="text-[11px] text-slate-300 font-medium font-mono">{systemConfig?.motherPhone || "Not Set"}</span>
                </div>
              </div>
            </div>

            {/* Recent Temperature Recording Log */}
            <div className="glass-card p-4 mt-2 bg-slate-900/40">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <FiActivity className="text-indigo-400" size={14} />
                Recent Temperature Logs
              </h3>
              <div className="space-y-1.5 max-h-[150px] overflow-y-auto custom-scrollbar">
                {tempHistory.length === 0 ? (
                  <p className="text-[10px] text-slate-600 italic">Capturing live telemetry...</p>
                ) : (
                  [...tempHistory].reverse().map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
                      <div className="flex items-center gap-2">
                         <div className={`w-1.5 h-1.5 rounded-full ${entry.temp > 35 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                         <span className="text-[11px] font-bold text-slate-200">{entry.temp.toFixed(1)}°C</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono italic">{entry.time}</span>
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
