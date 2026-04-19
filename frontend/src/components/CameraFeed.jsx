import React, { useState, useEffect, useCallback } from "react";
import {
  FiCamera,
  FiPower,
  FiRefreshCw,
  FiVideoOff,
  FiLoader,
  FiSmartphone,
  FiMonitor,
  FiAlertCircle,
  FiCheckCircle,
  FiSearch,
} from "react-icons/fi";

/**
 * CameraFeed — two source options:
 * 1. "Webcam" — laptop's integrated/USB webcam
 * 2. "Phone Link" — Windows Phone Link virtual camera
 *
 * When Phone Link is chosen but the virtual camera isn't detected,
 * a setup guide is shown with step-by-step instructions.
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
  const [activeSource, setActiveSource] = useState(null); // "webcam" | "phonelink"
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detectedDevices, setDetectedDevices] = useState([]);
  const [phoneLinkFound, setPhoneLinkFound] = useState(false);

  // Check if any device looks like a Phone Link / virtual camera
  // Phone Link virtual camera usually appears as "Windows Virtual Camera"
  // or may contain "virtual", "phone", "link" etc.
  const isPhoneLinkDevice = useCallback((device) => {
    const label = (device.label || "").toLowerCase();
    // Exclude the integrated webcam — it often contains "integrated" or specific vendor IDs
    const isIntegrated = /integrated|built-in|facetime|hd webcam|0bda/i.test(label);
    if (isIntegrated) return false;
    // Match Phone Link / virtual camera patterns
    return /virtual|phone|link|mobile|windows virtual/i.test(label);
  }, []);

  // Aggressive device scan — used when user clicks Phone Link
  const scanForPhoneLinkCamera = useCallback(async () => {
    setScanning(true);
    setDetectedDevices([]);

    try {
      // First, request camera permission to unlock device labels
      const tempStream = await navigator.mediaDevices
        .getUserMedia({ video: true })
        .catch(() => null);
      if (tempStream) tempStream.getTracks().forEach((t) => t.stop());

      // Now enumerate with full labels
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setDetectedDevices(videoDevices);

      // Find a device that is NOT the integrated webcam
      const phoneCam = videoDevices.find((d) => isPhoneLinkDevice(d));

      if (phoneCam) {
        setPhoneLinkFound(true);
        setShowSetupGuide(false);
        setScanning(false);
        // Connect to it
        await switchCamera(phoneCam.deviceId);
        if (!cameraActive) await startCamera(phoneCam.deviceId);
        return;
      }

      // If there are multiple cameras, the NON-first one is likely Phone Link
      if (videoDevices.length > 1) {
        // The first device is usually the integrated webcam; try the second one
        const candidate = videoDevices[1];
        setPhoneLinkFound(true);
        setShowSetupGuide(false);
        setScanning(false);
        await switchCamera(candidate.deviceId);
        if (!cameraActive) await startCamera(candidate.deviceId);
        return;
      }

      // Only one camera found and it's the integrated webcam
      setPhoneLinkFound(false);
      setShowSetupGuide(true);
      setScanning(false);
    } catch (err) {
      setScanning(false);
      setShowSetupGuide(true);
    }
  }, [cameraActive, isPhoneLinkDevice, startCamera, switchCamera]);

  // ── Connect Integrated Webcam ──
  const connectWebcam = async () => {
    setActiveSource("webcam");
    setShowSetupGuide(false);
    // Find the integrated webcam specifically
    const webcam = cameraDevices.find(
      (d) => !isPhoneLinkDevice(d) && d.label
    );
    if (webcam) {
      await switchCamera(webcam.deviceId);
      if (!cameraActive) await startCamera(webcam.deviceId);
    } else {
      await startCamera();
    }
  };

  // ── Connect Phone Link ──
  const connectPhoneLink = async () => {
    setActiveSource("phonelink");

    // Open the Phone Link app on Windows
    try {
      window.open("ms-phone-link://", "_self");
    } catch (_) {}

    // Wait for Phone Link to register its virtual camera, then scan
    setTimeout(() => {
      scanForPhoneLinkCamera();
    }, 3000);
  };

  // Manual connect to a specific device from the setup guide
  const connectToDevice = async (deviceId) => {
    setShowSetupGuide(false);
    setActiveSource("phonelink");
    await switchCamera(deviceId);
    if (!cameraActive) await startCamera(deviceId);
  };

  const handleStop = () => {
    stopCamera();
    setActiveSource(null);
    setShowSetupGuide(false);
    setPhoneLinkFound(false);
  };

  const isLive = cameraActive && !loading && !cameraError;

  return (
    <div className="flex flex-col bg-slate-900 overflow-hidden rounded-2xl border border-white/5">
      {/* ── Header ── */}
      <div className="px-4 h-11 flex items-center justify-between bg-slate-800/80 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isLive
                ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                : "bg-slate-600"
            }`}
          />
          <span className="text-[10px] font-bold tracking-widest text-white uppercase">
            Camera
            {isLive && activeSource === "webcam" && " • Webcam"}
            {isLive && activeSource === "phonelink" && " • Phone"}
            {isLive && " • LIVE"}
          </span>
        </div>

        {isLive && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMirror}
              className={`p-1.5 rounded-lg transition-all ${
                isMirrored
                  ? "bg-amber-500 text-white"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
              title="Mirror / Reverse"
            >
              <FiRefreshCw size={13} />
            </button>
            <button
              onClick={handleStop}
              className="p-1.5 rounded-lg bg-rose-500/80 hover:bg-rose-500 text-white transition-all"
              title="Stop Camera"
            >
              <FiPower size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ── Video / Content Area ── */}
      <div
        className="relative bg-black flex items-center justify-center overflow-hidden"
        style={{ minHeight: "220px" }}
      >
        {/* Live video */}
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

        {isLive && (
          <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10 z-20">
            <p className="text-[8px] font-mono text-emerald-400 uppercase">
              {new Date().toLocaleTimeString()} •{" "}
              {activeSource === "phonelink" ? "PHONE LINK" : "WEBCAM"}
            </p>
          </div>
        )}

        {/* ── Idle: TWO source buttons ── */}
        {!cameraActive && !loading && !cameraError && !showSetupGuide && (
          <div className="flex flex-col items-center gap-5 py-6 px-4 w-full">
            <FiCamera size={28} className="text-slate-600" />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Select Camera Source
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              {/* Webcam */}
              <button
                onClick={connectWebcam}
                className="flex-1 flex flex-col items-center gap-2 px-4 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/40 rounded-xl transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 group-hover:bg-cyan-500/20 flex items-center justify-center transition-all">
                  <FiMonitor size={20} className="text-cyan-400" />
                </div>
                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">
                  Webcam
                </span>
                <span className="text-[9px] text-slate-500">Laptop / USB</span>
              </button>

              {/* Phone Link */}
              <button
                onClick={connectPhoneLink}
                className="flex-1 flex flex-col items-center gap-2 px-4 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500/40 rounded-xl transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500/20 flex items-center justify-center transition-all">
                  <FiSmartphone size={20} className="text-indigo-400" />
                </div>
                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">
                  Phone Link
                </span>
                <span className="text-[9px] text-slate-500">
                  Windows Phone Link
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ── Phone Link Setup Guide (shown when virtual camera NOT detected) ── */}
        {showSetupGuide && !cameraActive && !loading && (
          <div className="absolute inset-0 bg-slate-950 z-40 overflow-y-auto p-4">
            <div className="max-w-sm mx-auto space-y-4">
              <div className="flex items-center gap-2">
                <FiAlertCircle size={18} className="text-amber-400 flex-shrink-0" />
                <h3 className="text-sm font-bold text-white">
                  Phone Link Camera Not Detected
                </h3>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                The Phone Link virtual camera is not visible to the browser yet.
                Follow these steps in <strong className="text-white">Windows Settings</strong>:
              </p>

              <div className="space-y-2">
                {[
                  {
                    step: 1,
                    text: 'Open Settings → Bluetooth & devices → Mobile devices',
                  },
                  {
                    step: 2,
                    text: '"Allow this PC to access your mobile devices" → turn ON',
                  },
                  {
                    step: 3,
                    text: 'Click "Manage devices" → add your phone if not listed',
                  },
                  {
                    step: 4,
                    text: '"Use as a connected camera" → turn ON',
                  },
                  {
                    step: 5,
                    text: "Make sure Phone Link app is open and connected to your phone",
                  },
                  {
                    step: 6,
                    text: 'On your phone, open "Link to Windows" and ensure it says Connected',
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="flex items-start gap-3 p-2 bg-white/5 rounded-lg"
                  >
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold flex items-center justify-center">
                      {item.step}
                    </span>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Open Windows Settings directly */}
              <button
                onClick={() => {
                  try {
                    window.open("ms-settings:crossdevice", "_self");
                  } catch (_) {}
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                Open Windows Mobile Device Settings
              </button>

              {/* Detected devices list so user can manually pick */}
              {detectedDevices.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    <FiSearch size={10} className="inline mr-1" />
                    Detected Cameras ({detectedDevices.length})
                  </p>
                  {detectedDevices.map((device, i) => {
                    const isProbablyPhone = isPhoneLinkDevice(device);
                    return (
                      <button
                        key={device.deviceId}
                        onClick={() => connectToDevice(device.deviceId)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                          isProbablyPhone
                            ? "bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20"
                            : "bg-white/5 border-white/5 hover:bg-white/10"
                        }`}
                      >
                        {isProbablyPhone ? (
                          <FiSmartphone size={14} className="text-indigo-400 flex-shrink-0" />
                        ) : (
                          <FiCamera size={14} className="text-slate-400 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-200 font-bold truncate">
                            {device.label || `Camera ${i + 1}`}
                          </p>
                          {isProbablyPhone && (
                            <p className="text-[9px] text-indigo-400 font-bold">
                              ← Phone Link Camera
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={scanForPhoneLinkCamera}
                  disabled={scanning}
                  className="flex-1 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {scanning ? (
                    <FiLoader size={12} className="animate-spin" />
                  ) : (
                    <FiSearch size={12} />
                  )}
                  {scanning ? "Scanning..." : "Scan Again"}
                </button>
                <button
                  onClick={() => {
                    setShowSetupGuide(false);
                    setActiveSource(null);
                  }}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Error state ── */}
        {cameraError && !loading && (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <FiVideoOff size={28} className="text-rose-500" />
            <p className="text-[10px] text-rose-300/70 leading-relaxed max-w-[260px]">
              {cameraError}
            </p>
            <div className="flex gap-2">
              <button
                onClick={connectWebcam}
                className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-[10px] font-bold uppercase hover:bg-cyan-500/30 transition-all"
              >
                Webcam
              </button>
              <button
                onClick={connectPhoneLink}
                className="px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-bold uppercase hover:bg-indigo-500/30 transition-all"
              >
                Phone Link
              </button>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
            <FiLoader size={32} className="text-indigo-500 animate-spin" />
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              Connecting{activeSource === "phonelink" ? " Phone Link" : ""}…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
