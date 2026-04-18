import React, { useState, useEffect } from "react";
import { 
  FiCamera, 
  FiSettings, 
  FiPower, 
  FiRefreshCw, 
  FiAlertCircle, 
  FiVideoOff, 
  FiLoader,
  FiSmartphone,
  FiMonitor
} from "react-icons/fi";

/**
 * Live camera feed optimized for Phone Link usage.
 * Fixed "Standby" overlay bug and improved "Reverse" mirroring.
 */
export default function CameraFeed({
  videoRef,
  cameraActive,
  cameraError,
  cameraDevices,
  selectedDeviceId,
  isMirrored,
  loading,
  startCamera,
  stopCamera,
  switchCamera,
  enumerateDevices,
  toggleMirror,
}) {
  const [showSettings, setShowSettings] = useState(false);

  // One-Click Phone Link Logic
  const handlePhoneLink = async () => {
    // 1. Launch the app
    window.open('ms-phone-link://');
    // 2. Start the camera immediately
    await startCamera();
  };

  const handleToggle = () => {
    if (cameraActive) stopCamera();
    else startCamera();
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative rounded-3xl border border-white/5" id="camera-container">
      {/* Header Bar */}
      <div className="px-5 h-14 flex items-center justify-between bg-slate-800/80 backdrop-blur-md border-b border-white/5 z-50">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${cameraActive ? "bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-slate-600"}`} />
          <h2 className="text-xs font-black tracking-widest text-white uppercase italic">Live Monitoring</h2>
        </div>

        <div className="flex items-center gap-2">
           {/* Phone Link Quick Button */}
           <button
            onClick={handlePhoneLink}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-xl text-[10px] font-black transition-all border border-indigo-500/30"
          >
            <FiSmartphone size={14} />
            LINK PHONE
          </button>

          {/* Reverse button */}
          <button
            onClick={toggleMirror}
            className={`p-2 rounded-xl transition-all ${
              isMirrored ? "bg-amber-500 text-white" : "bg-white/5 text-slate-400 hover:text-white"
            }`}
            title="Reverse View"
          >
            <FiRefreshCw size={16} className={isMirrored ? "-scale-x-100" : ""} />
          </button>

          {/* Settings button */}
          <button
            onClick={() => {
              setShowSettings(!showSettings);
              enumerateDevices();
            }}
            className={`p-2 rounded-xl transition-all ${
              showSettings ? "bg-indigo-500 text-white" : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            <FiSettings size={16} />
          </button>

          {/* Power button */}
          <button
            onClick={handleToggle}
            className={`p-2 rounded-xl transition-all ${
              cameraActive ? "bg-rose-500 text-white" : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
            }`}
          >
            {loading ? <FiLoader className="animate-spin" size={16} /> : <FiPower size={16} />}
          </button>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
        
        {/* Actual Video Feed - FORCED TO TOP WHEN ACTIVE */}
        {cameraActive && (
          <div className="absolute inset-0 z-10 w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ 
                transform: isMirrored ? "scaleX(-1)" : "scaleX(1)",
                transition: "transform 0.4s ease-out"
              }}
              className="w-full h-full object-cover"
            />
            {/* Timestamp Overlay */}
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 z-20">
              <p className="text-[9px] font-mono text-emerald-400 uppercase tracking-tighter">
                 {new Date().toLocaleString()} • SECURE_FEED
              </p>
            </div>
            {/* Resolution indicator */}
            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 z-20">
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Phone Cam • HD</p>
            </div>
          </div>
        )}

        {/* Standby / Idle State - HIDDEN WHEN ACTIVE */}
        {!cameraActive && !loading && !cameraError && (
          <div className="flex flex-col items-center justify-center gap-6 z-0 animate-in fade-in duration-500">
            <div className="w-24 h-24 rounded-[32px] bg-slate-800 flex items-center justify-center border border-white/5 shadow-2xl relative">
              <FiCamera size={44} className="text-slate-600" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center">
                <FiSmartphone size={14} className="text-slate-500" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-base font-black text-slate-200 uppercase tracking-widest">Camera Off</p>
              <p className="text-[11px] text-slate-500 font-medium">Use Phone Link app for wireless feed</p>
            </div>
            <button
               onClick={handlePhoneLink}
               className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase transition-all shadow-2xl shadow-indigo-600/20 active:scale-95"
            >
               Connect Camera
            </button>
          </div>
        )}

        {/* Error State */}
        {cameraError && !loading && (
          <div className="absolute inset-0 flex items-center justify-center p-8 bg-slate-950/90 backdrop-blur-xl z-20">
            <div className="max-w-xs w-full bg-rose-500/5 border border-rose-500/20 rounded-[32px] p-8 text-center space-y-6">
              <FiVideoOff size={40} className="text-rose-500 mx-auto" />
              <div className="space-y-2">
                <h3 className="text-white text-xs font-black uppercase tracking-widest">Connection Error</h3>
                <p className="text-[10px] text-rose-200/50 leading-relaxed">{cameraError}</p>
              </div>
              <button
                onClick={handlePhoneLink}
                className="w-full py-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 text-[10px] font-black rounded-2xl uppercase tracking-widest"
              >
                Fix Connection
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-30">
            <FiLoader size={48} className="text-indigo-500 animate-spin" />
            <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Initializing Link...</p>
          </div>
        )}

        {/* Settings Overlay */}
        {showSettings && (
          <div className="absolute inset-0 bg-slate-900/98 backdrop-blur-2xl z-[60] p-8 animate-in slide-in-from-top-6 duration-300">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-white font-black text-lg uppercase">Device Select</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white p-2">✕</button>
            </div>
            <div className="space-y-3">
              {cameraDevices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => { switchCamera(device.deviceId); setShowSettings(false); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                    selectedDeviceId === device.deviceId 
                    ? "bg-indigo-500/10 border-indigo-500 text-white" 
                    : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  <FiCamera size={18} />
                  <span className="text-xs font-bold truncate">{device.label || "Generic Camera"}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
