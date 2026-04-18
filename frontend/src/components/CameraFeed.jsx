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
  cameraMode,
  ipCameraUrl,
  loading,
  setCameraMode,
  setIpCameraUrl,
  startCamera,
  startIpCamera,
  stopCamera,
  switchCamera,
  enumerateDevices,
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

        <div className="flex items-center gap-1 flex-wrap min-w-0">
          {/* Settings toggle */}
          <button
            id="camera-settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white transition-all ${
              showSettings ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 hover:bg-white/10"
            }`}
            title="Settings"
          >
            <FiChevronDown
              size={14}
              className={`transition-transform ${showSettings ? "rotate-180" : ""}`}
            />
          </button>

          {/* Refresh devices */}
          <button
            id="refresh-cameras-btn"
            onClick={enumerateDevices}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-white/5"
            title="Refresh"
          >
            <FiRefreshCw size={14} />
          </button>

          {/* Start/Stop */}
          <button
            id="toggle-camera-power"
            onClick={cameraActive ? stopCamera : handleStart}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 border ${
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
              <FiVideo size={12} />
            )}
            <span className="hidden sm:inline">{loading ? "Wait" : cameraActive ? "Stop" : "Connect"}</span>
          </button>
        </div>
      </div>

      {/* Video Area containing Settings Overlay */}
      <div className="relative bg-slate-900/50" style={{ aspectRatio: "16/9" }}>
        
        {/* Camera Settings Panel (Overlay) */}
        {showSettings && (
          <div className="absolute top-0 left-0 right-0 z-20 px-4 py-3 bg-slate-900/95 backdrop-blur-md border-b border-white/10 shadow-2xl space-y-3">
            {/* Mode Tabs */}
            <div className="flex gap-1 bg-slate-800/50 rounded-lg p-0.5">
              <button
                onClick={() => setCameraMode("device")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  cameraMode === "device"
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <FiCamera size={12} />
                Device
              </button>
              <button
                onClick={() => setCameraMode("ip")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  cameraMode === "ip"
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <FiGlobe size={12} />
                IP
              </button>
            </div>

            {/* Device Camera Selection */}
            {cameraMode === "device" && (
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Select Camera ({cameraDevices.length} found)
                </label>
                {cameraDevices.length > 0 ? (
                  <select
                    id="camera-device-select"
                    value={selectedDeviceId}
                    onChange={(e) => switchCamera(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none cursor-pointer"
                  >
                    {cameraDevices.map((device, idx) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 bg-slate-800/50 rounded-lg text-xs text-slate-500 text-center">
                    No cameras detected — click <FiRefreshCw size={10} className="inline" /> to refresh
                  </div>
                )}
              </div>
            )}

            {/* IP Camera URL Input */}
            {cameraMode === "ip" && (
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Camera Stream URL
                </label>
                <input
                  id="ip-camera-url-input"
                  type="url"
                  value={ipCameraUrl}
                  onChange={(e) => setIpCameraUrl(e.target.value)}
                  placeholder="http://192.168.1.100:8080/video"
                  className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
                <div className="mt-2 flex items-start gap-2 p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                  <FiAlertCircle size={12} className="text-amber-500/60 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-slate-400 italic">
                    <b>Note:</b> If using a local IP webcam, Chrome will <b>block</b> the video because this site is secure (HTTPS). 
                    Click the <b>Shield/Lock icon</b> in your address bar and select <b>"Allow Unsafe Content"</b> to see the stream.
                  </p>
                </div>
              </div>
            )}
            
            <div className="pt-2 flex justify-end">
              <button 
                onClick={() => setShowSettings(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors border border-white/5"
              >
                Close
              </button>
            </div>
          </div>
        )}
        {/* Video element for device camera */}
        {cameraMode === "device" && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!cameraActive ? "hidden" : "block"}`}
            style={{ aspectRatio: "16/9" }}
          />
        )}

        {/* For IP camera — show img tag for MJPEG streams */}
        {cameraMode === "ip" && cameraActive && ipCameraUrl && (
          <img
            src={ipCameraUrl}
            alt="IP Camera Feed"
            className="w-full h-full object-cover"
            style={{ aspectRatio: "16/9" }}
            onError={() => {
              if (videoRef.current) {
                videoRef.current.src = ipCameraUrl;
                videoRef.current.play().catch(() => {});
              }
            }}
          />
        )}

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
