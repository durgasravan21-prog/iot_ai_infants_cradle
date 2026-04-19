import React, { useState } from "react";
import {
  FiCamera,
  FiSettings,
  FiPower,
  FiRefreshCw,
  FiVideoOff,
  FiLoader,
  FiSmartphone,
} from "react-icons/fi";

/**
 * CameraFeed — displays the live webcam feed.
 *
 * The approach for Phone Link:
 *   Windows Phone Link exposes the phone camera as a standard "webcam"
 *   device visible to the browser via navigator.mediaDevices.
 *   The "LINK PHONE" button launches the Phone Link app, then after a
 *   short delay starts scanning for camera devices and connects.
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

  // Launch Phone Link desktop app, then start camera after a delay
  const handlePhoneLinkConnect = async () => {
    // Open Phone Link app on Windows
    try {
      window.open("ms-phone-link://", "_blank");
    } catch (_) {
      // Silently ignore if protocol handler fails — user can open it manually
    }

    // Wait 2 seconds for Phone Link app to register its virtual camera,
    // then start the camera which will scan for devices automatically
    setTimeout(async () => {
      await startCamera();
    }, 2000);
  };

  const handleToggle = () => {
    if (cameraActive) stopCamera();
    else startCamera();
  };

  const isLive = cameraActive && !loading && !cameraError;

  return (
    <div
      className="flex flex-col h-full bg-slate-900 overflow-hidden relative rounded-3xl border border-white/5"
      id="camera-container"
    >
      {/* ── Header Bar ── */}
      <div className="px-4 h-12 flex items-center justify-between bg-slate-800/80 backdrop-blur-md border-b border-white/5 z-50">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isLive
                ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                : "bg-slate-600"
            }`}
          />
          <h2 className="text-[11px] font-bold tracking-wider text-white uppercase">
            Camera {isLive ? "• Live" : ""}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Phone Link launcher */}
          <button
            onClick={handlePhoneLinkConnect}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-lg text-[10px] font-bold transition-all border border-indigo-500/30 disabled:opacity-50"
            title="Open Phone Link app and connect camera"
          >
            <FiSmartphone size={12} />
            LINK PHONE
          </button>

          {/* Reverse / Mirror */}
          <button
            onClick={toggleMirror}
            className={`p-1.5 rounded-lg transition-all ${
              isMirrored
                ? "bg-amber-500 text-white"
                : "bg-white/5 text-slate-400 hover:text-white"
            }`}
            title="Mirror / Reverse"
          >
            <FiRefreshCw size={14} />
          </button>

          {/* Settings — device picker */}
          <button
            onClick={() => {
              setShowSettings(!showSettings);
              enumerateDevices();
            }}
            className={`p-1.5 rounded-lg transition-all ${
              showSettings
                ? "bg-indigo-500 text-white"
                : "bg-white/5 text-slate-400 hover:text-white"
            }`}
            title="Select Camera Device"
          >
            <FiSettings size={14} />
          </button>

          {/* Power on/off */}
          <button
            onClick={handleToggle}
            disabled={loading}
            className={`p-1.5 rounded-lg transition-all ${
              cameraActive
                ? "bg-rose-500 text-white"
                : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
            } disabled:opacity-50`}
            title={cameraActive ? "Stop Camera" : "Start Camera"}
          >
            {loading ? (
              <FiLoader className="animate-spin" size={14} />
            ) : (
              <FiPower size={14} />
            )}
          </button>
        </div>
      </div>

      {/* ── Video Area ── */}
      <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
        {/* Live video element — always in DOM, visibility controlled by CSS */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            transform: isMirrored ? "scaleX(-1)" : "scaleX(1)",
            transition: "transform 0.3s ease",
            display: isLive ? "block" : "none",
          }}
          className="absolute inset-0 w-full h-full object-cover z-10"
        />

        {/* Timestamp overlay (only when live) */}
        {isLive && (
          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10 z-20">
            <p className="text-[8px] font-mono text-emerald-400 uppercase">
              {new Date().toLocaleString()}
            </p>
          </div>
        )}

        {/* ── Standby (camera off, no error) ── */}
        {!cameraActive && !loading && !cameraError && (
          <div className="flex flex-col items-center justify-center gap-4 p-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center border border-white/5">
              <FiCamera size={32} className="text-slate-600" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              No Camera Connected
            </p>
            <button
              onClick={handlePhoneLinkConnect}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <FiSmartphone size={14} />
              Setup Camera
            </button>
          </div>
        )}

        {/* ── Error state ── */}
        {cameraError && !loading && (
          <div className="flex flex-col items-center justify-center gap-4 p-6 text-center max-w-xs">
            <FiVideoOff size={32} className="text-rose-500" />
            <div className="space-y-1">
              <h3 className="text-white text-[11px] font-bold uppercase tracking-widest">
                Connection Error
              </h3>
              <p className="text-[10px] text-rose-300/60 leading-relaxed">
                {cameraError}
              </p>
            </div>
            <button
              onClick={handlePhoneLinkConnect}
              className="px-5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[10px] font-bold rounded-xl uppercase tracking-wider transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
            <FiLoader size={36} className="text-indigo-500 animate-spin" />
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              Connecting…
            </p>
          </div>
        )}

        {/* ── Device picker overlay ── */}
        {showSettings && (
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl z-[60] p-5 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider">
                Select Camera
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            {cameraDevices.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <FiCamera size={28} className="text-slate-600 mx-auto" />
                <p className="text-[11px] text-slate-500">
                  No camera devices found. Make sure Phone Link is set up in
                  Windows Settings → Bluetooth & Devices → Mobile Devices.
                </p>
                <button
                  onClick={enumerateDevices}
                  className="px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-bold uppercase"
                >
                  Refresh List
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {cameraDevices.map((device) => {
                  const isPhoneLink = /phone|link|virtual|mobile/i.test(
                    device.label
                  );
                  return (
                    <button
                      key={device.deviceId}
                      onClick={() => {
                        switchCamera(device.deviceId);
                        setShowSettings(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        selectedDeviceId === device.deviceId
                          ? "bg-indigo-500/10 border-indigo-500 text-white"
                          : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      {isPhoneLink ? (
                        <FiSmartphone size={16} className="text-indigo-400" />
                      ) : (
                        <FiCamera size={16} />
                      )}
                      <div className="text-left min-w-0">
                        <span className="text-xs font-bold truncate block">
                          {device.label || "Unknown Camera"}
                        </span>
                        {isPhoneLink && (
                          <span className="text-[9px] text-indigo-400 font-bold uppercase">
                            Phone Link Device
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
                <button
                  onClick={enumerateDevices}
                  className="w-full mt-2 px-4 py-2 bg-white/5 text-slate-400 rounded-lg text-[10px] font-bold uppercase hover:bg-white/10 transition-all"
                >
                  Refresh Device List
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
