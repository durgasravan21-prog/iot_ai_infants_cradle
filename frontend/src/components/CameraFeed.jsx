import { useState } from "react";
import {
  FiVideo,
  FiVideoOff,
  FiRefreshCw,
  FiCircle,
  FiChevronDown,
  FiGlobe,
  FiCamera,
  FiLoader,
  FiAlertCircle,
  FiSmartphone,
} from "react-icons/fi";

/**
 * Live camera feed with device selection, IP camera support, and front/rear toggle.
 * Replaces ESP32-CAM — uses phone/laptop/external USB cameras via MediaDevices API.
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

  const handleStart = () => {
    if (cameraMode === "ip" && ipCameraUrl) {
      startIpCamera(ipCameraUrl);
    } else {
      startCamera(selectedDeviceId);
    }
  };

  return (
    <div className="glass-card overflow-hidden" id="camera-feed-card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-white/5 gap-2 min-w-0">
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
          <FiVideo className="text-indigo-400 flex-shrink-0" size={15} />
          <h3 className="text-sm font-semibold text-slate-200 truncate">Camera</h3>
          {cameraActive && (
            <span className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-rose-500/20 text-rose-400 text-[9px] font-bold uppercase rounded-full flex-shrink-0">
              <FiCircle className="fill-rose-400" size={5} />
              Live
            </span>
          )}
        </div>

          {/* Mirror toggle */}
          <button
            id="camera-mirror-btn"
            onClick={toggleMirror}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white transition-all ${
              isMirrored ? "bg-amber-500/20 text-amber-400 border border-amber-400/20" : "bg-white/5 hover:bg-white/10"
            }`}
            title="Reverse View (Mirror)"
          >
            <FiRefreshCw size={14} className={isMirrored ? "-scale-x-100" : ""} />
          </button>

          {/* Settings toggle */}
          <button
            id="camera-settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white transition-all ${
              showSettings ? "bg-indigo-500/20 text-indigo-400 border border-indigo-400/20" : "bg-white/5 hover:bg-white/10"
            }`}
            title="Choose Camera"
          >
            <FiCamera size={14} />
          </button>

          {/* Refresh devices */}
          <button
            id="refresh-cameras-btn"
            onClick={enumerateDevices}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-white/5"
            title="Refresh List"
          >
            <FiRefreshCw size={14} />
          </button>

          {/* Start/Stop */}
          <button
            id="toggle-camera-power"
            onClick={cameraActive ? stopCamera : handleStart}
            disabled={loading}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-bold shadow-md transition-all flex items-center gap-1.5 border uppercase tracking-wider ${
              loading
                ? "bg-slate-800 text-slate-400 border-white/5 cursor-wait"
                : cameraActive
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                : "bg-indigo-500 text-white border-indigo-400/30 hover:bg-indigo-400"
            }`}
          >
            {loading ? (
              <FiLoader size={12} className="animate-spin" />
            ) : cameraActive ? (
              <FiVideoOff size={12} />
            ) : (
              <FiCamera size={12} />
            )}
            <span>{loading ? "Wait" : cameraActive ? "Power Off" : "Power On"}</span>
          </button>
        </div>
      </div>

      {/* Video Area containing Settings Overlay */}
      <div className="relative bg-slate-900/50" style={{ aspectRatio: "16/9" }}>
        
        {/* Camera Settings Panel (Overlay) */}
        {showSettings && (
          <div className="absolute top-0 left-0 right-0 z-20 px-4 py-5 bg-[#1a1f2e]/95 backdrop-blur-md border-b border-white/10 shadow-2xl space-y-4">
            {/* Device Camera Selection */}
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 block font-bold opacity-70">
                Choose Camera ({cameraDevices.length} found)
              </label>
              {cameraDevices.length > 0 ? (
                <div className="relative">
                  <select
                    id="camera-device-select"
                    value={selectedDeviceId}
                    onChange={(e) => switchCamera(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer pr-10"
                  >
                    {cameraDevices.map((device, idx) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <FiChevronDown size={14} />
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 bg-slate-800/50 rounded-xl text-xs text-slate-500 text-center border border-dashed border-white/5">
                  No cameras detected — try refreshing!
                </div>
              )}
              <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2">
                <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-2">
                  <FiSmartphone size={12} /> Windows Phone Link Guide
                </p>
                <ol className="text-[9px] text-slate-400 space-y-1 list-decimal pl-4">
                  <li>Open <b>Settings</b> on your Laptop.</li>
                  <li>Go to <b>Bluetooth & Devices</b> → <b>Mobile Devices</b>.</li>
                  <li>Enable <b>"Allow this PC to access your mobile devices"</b>.</li>
                  <li>Click <b>"Manage Devices"</b> and turn ON <b>"Use as a connected camera"</b>.</li>
                </ol>
                <p className="text-[9px] text-amber-400/80 italic pt-1">
                  * Ensure the Link to Windows app is active on your phone!
                </p>
              </div>
            </div>
            
            <div className="pt-2 flex justify-end">
              <button 
                onClick={() => setShowSettings(false)}
                className="px-6 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-[11px] font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
              >
                Save & Close
              </button>
            </div>
          </div>
        )}
        <div className="w-full h-full bg-black overflow-hidden">
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
        </div>

        {/* Camera off state */}
        {!cameraActive && !cameraError && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-500">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-white/5 shadow-lg">
              <FiCamera size={32} className="text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-400">No Camera Connected</p>
            </div>
            <button
              onClick={() => {
                setShowSettings(true);
                enumerateDevices();
              }}
              className="px-5 py-2 bg-indigo-500/20 text-indigo-400 rounded-xl text-xs font-medium hover:bg-indigo-500/30 transition-all border border-indigo-500/20"
            >
              <span className="flex items-center gap-2">
                <FiCamera size={12} />
                Setup Camera
              </span>
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-indigo-400">
            <FiLoader size={32} className="animate-spin" />
            <p className="text-sm">Connecting to camera...</p>
          </div>
        )}

        {/* Error state */}
        {cameraError && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-rose-400 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center">
              <FiVideoOff size={28} />
            </div>
            <p className="text-sm font-medium">Camera Error</p>
            <p className="text-xs text-slate-500 max-w-xs">{cameraError}</p>
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-rose-500/20 text-rose-400 rounded-xl text-xs font-medium hover:bg-rose-500/30 transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {/* Overlay with timestamp when active */}
        {cameraActive && (
          <div className="absolute top-0 left-0 right-0 px-3 py-2 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between z-10">
            <span className="text-[10px] font-mono text-white/50">
              {new Date().toLocaleString()}
            </span>
            <span className="text-[10px] text-white/50">
              {cameraMode === "ip" ? "IP Stream" : "Device Camera"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
