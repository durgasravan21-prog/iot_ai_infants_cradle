import React, { useState, useEffect } from "react";
import { 
  FiCamera, 
  FiSettings, 
  FiPower, 
  FiRefreshCw, 
  FiAlertCircle, 
  FiVideoOff, 
  FiLoader,
  FiChevronRight,
  FiSmartphone,
  FiMonitor
} from "react-icons/fi";

/**
 * Live camera feed with device selection and mirroring logic.
 * Optimzed for Windows Phone Link virtual cameras.
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

  const handleToggle = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const handleStart = () => {
    startCamera();
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative group">
      {/* Header Bar */}
      <div className="px-4 h-14 flex items-center justify-between bg-slate-800/50 border-b border-white/5 z-20">
        <div className="flex items-center gap-3 text-slate-200">
          <div className={`w-2 h-2 rounded-full ${cameraActive ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`} />
          <h2 className="text-sm font-bold tracking-tight">Cradle Live Feed</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Mirror toggle */}
          <button
            id="camera-mirror-btn"
            onClick={toggleMirror}
            className={`p-2 rounded-xl transition-all ${
              isMirrored 
                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Mirror / Reverse Video"
          >
            <FiRefreshCw size={16} className={isMirrored ? "-scale-x-100" : ""} />
          </button>

          {/* Settings toggle */}
          <button
            id="camera-settings-btn"
            onClick={() => {
              setShowSettings(!showSettings);
              if (!showSettings) enumerateDevices();
            }}
            className={`p-2 rounded-xl transition-all ${
              showSettings 
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            <FiSettings size={16} />
          </button>

          {/* Power toggle */}
          <button
            id="camera-power-btn"
            onClick={handleToggle}
            disabled={loading}
            className={`p-2 rounded-xl transition-all ${
              cameraActive 
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" 
                : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105"
            } disabled:opacity-50 disabled:grayscale`}
          >
            {loading ? <FiLoader className="animate-spin" size={16} /> : <FiPower size={16} />}
          </button>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
        
        {/* Settings Panel Overlay */}
        {showSettings && (
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-40 p-5 flex flex-col animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-base">Camera Settings</h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white p-2"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
              {/* Device Selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
                  Video Source (Choose Phone Link)
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {cameraDevices.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={() => {
                        switchCamera(device.deviceId);
                        setShowSettings(false);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        selectedDeviceId === device.deviceId
                          ? "bg-indigo-500/20 border-indigo-500/50 text-white ring-2 ring-indigo-500/20"
                          : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10"
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${selectedDeviceId === device.deviceId ? "bg-indigo-500" : "bg-white/5"}`}>
                        {device.label.toLowerCase().includes("phone") ? <FiSmartphone size={14} /> : <FiMonitor size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{device.label || `Camera ${device.deviceId.slice(0, 5)}`}</p>
                        <p className="text-[10px] opacity-50">Local Hardware Device</p>
                      </div>
                      {selectedDeviceId === device.deviceId && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                    </button>
                  ))}
                </div>
                {cameraDevices.length === 0 && (
                  <div className="p-4 bg-white/5 border border-dashed border-white/10 rounded-xl text-center text-[10px] text-slate-500">
                    No cameras detected — ensure devices are plugged in!
                  </div>
                )}
              </div>

              {/* Windows Phone Link Help & Launcher */}
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                   <p className="text-[11px] text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-2">
                    <FiSmartphone size={14} /> Link to Phone
                  </p>
                  <button 
                    onClick={() => window.open('ms-phone-link://')}
                    className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-bold rounded-lg transition-all shadow-md active:scale-95"
                  >
                    Open Phone Link App
                  </button>
                </div>
                
                <div className="space-y-2 text-[10px] text-indigo-200/70 leading-relaxed font-medium bg-black/20 p-3 rounded-xl">
                  <p>1. Click <b>"Open Phone Link App"</b> above.</p>
                  <p>2. In Windows Settings, ensure <b>"Use as a connected camera"</b> is ON.</p>
                  <p>3. Once connected, select the camera from the list above.</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/5">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Video Surface */}
        <div className="w-full h-full bg-black overflow-hidden relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ 
              transform: isMirrored ? "scaleX(-1)" : "scaleX(1)",
              transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
            className={`w-full h-full object-cover ${!cameraActive ? "hidden" : "block"}`}
          />
          
          {/* Diagnostic Overlay (Visible when Active) */}
          {cameraActive && (
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 pointer-events-none z-10">
              <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-2">
                <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                LIVE • HARDWARE_ACCELERATED
              </span>
            </div>
          )}
        </div>

        {/* Error State Overlay */}
        {cameraError && !loading && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md z-30">
            <div className="max-w-xs w-full bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center space-y-5 animate-in fade-in zoom-in duration-300">
              <div className="w-14 h-14 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto ring-8 ring-rose-500/5">
                <FiVideoOff size={28} className="text-rose-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-white text-sm font-black uppercase tracking-widest">Access Blocked</h3>
                <p className="text-[11px] text-rose-200/70 font-medium leading-relaxed">
                  {cameraError}
                </p>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleStart}
                  className="w-full py-3 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-rose-500/20 active:scale-95"
                >
                  Try Again
                </button>
                <button
                   onClick={() => setShowSettings(true)}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl transition-all"
                >
                  Change Device
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Idle / Off State */}
        {!cameraActive && !cameraError && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-slate-500">
            <div className="w-24 h-24 rounded-[32px] bg-slate-800 flex items-center justify-center border border-white/5 shadow-2xl relative">
              <FiCamera size={40} className="text-slate-600" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center">
                <FiPower size={14} className="text-slate-600" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-base font-bold text-slate-300 tracking-tight">Camera in Standby</p>
              <p className="text-[11px] text-slate-500 font-medium">Click the power icon to start the feed</p>
            </div>
            <button
               onClick={handleStart}
               className="mt-2 px-8 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl text-xs font-black tracking-widest uppercase transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
            >
               Connect Camera
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm flex flex-col gap-4 items-center justify-center z-30">
            <div className="relative">
              <FiLoader size={48} className="text-indigo-500 animate-[spin_2s_linear_infinite]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white text-sm font-bold tracking-tight">Initializing SensorStream...</p>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Establishing Secure link</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
