import React, { useState, useCallback } from "react";
import {
  FiCamera,
  FiPower,
  FiRefreshCw,
  FiVideoOff,
  FiLoader,
  FiSmartphone,
  FiMonitor,
  FiAlertCircle,
  FiSearch,
  FiEye,
  FiEyeOff,
  FiActivity
} from "react-icons/fi";
import { useVisionAI } from "../hooks/useVisionAI";

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
  const [activeSource, setActiveSource] = useState(null);
  const [showPhoneLinkGuide, setShowPhoneLinkGuide] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [allDevices, setAllDevices] = useState([]);

  // Integrate AI Vision hook
  const isLive = cameraActive && !loading && !cameraError;
  const { aiStatus, eyesOpen, motionLevel } = useVisionAI(videoRef, isLive);

  // ──────────────────────────────────────────────
  // PHONE LINK: Find a camera that is NOT the
  // integrated webcam. If only one camera exists,
  // DO NOT fall back — show setup instructions.
  // ──────────────────────────────────────────────
  const connectPhoneLink = async () => {
    setActiveSource("phonelink");
    setShowPhoneLinkGuide(false);
    setScanning(true);

    // 1. Launch Phone Link app via hidden iframe (no blank tab)
    try {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = "ms-phone-link://";
      document.body.appendChild(iframe);
      setTimeout(() => iframe.remove(), 2000);
    } catch (_) {}

    // 2. Wait 3 seconds for Phone Link to register its virtual camera
    await new Promise((r) => setTimeout(r, 3000));

    // 3. Enumerate all cameras fresh
    try {
      const tempStream = await navigator.mediaDevices
        .getUserMedia({ video: true })
        .catch(() => null);
      if (tempStream) tempStream.getTracks().forEach((t) => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setAllDevices(videoDevices);
      setScanning(false);

      if (videoDevices.length === 0) {
        setShowPhoneLinkGuide(true);
        return;
      }

      if (videoDevices.length === 1) {
        setShowPhoneLinkGuide(true);
        return;
      }

      // Find the Phone Link / Virtual Camera
      const phoneLinkCam = videoDevices.find((d) =>
        /virtual camera|phone link|windows virtual/i.test(d.label)
      );

      if (phoneLinkCam) {
        await switchCamera(phoneLinkCam.deviceId);
        await startCamera(phoneLinkCam.deviceId);
      } else {
        const nonIntegrated = videoDevices.find((d) =>
          !/integrated|built-in|webcam|0bda|hd camera/i.test(d.label)
        );
        if (nonIntegrated) {
          await switchCamera(nonIntegrated.deviceId);
          await startCamera(nonIntegrated.deviceId);
        } else {
          setShowPhoneLinkGuide(true);
          return;
        }
      }
    } catch (err) {
      setScanning(false);
      setShowPhoneLinkGuide(true);
    }
  };

  const connectDevice = async (deviceId) => {
    setShowPhoneLinkGuide(false);
    await switchCamera(deviceId);
    await startCamera(deviceId);
  };

  const rescan = async () => {
    setScanning(true);
    try {
      const tempStream = await navigator.mediaDevices
        .getUserMedia({ video: true })
        .catch(() => null);
      if (tempStream) tempStream.getTracks().forEach((t) => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setAllDevices(videoDevices);

      if (videoDevices.length > 1) {
        const phoneLinkCam = videoDevices[videoDevices.length - 1];
        setShowPhoneLinkGuide(false);
        setScanning(false);
        await switchCamera(phoneLinkCam.deviceId);
        await startCamera(phoneLinkCam.deviceId);
        return;
      }
    } catch (_) {}
    setScanning(false);
  };

  const handleStop = () => {
    stopCamera();
    setActiveSource(null);
    setShowPhoneLinkGuide(false);
  };

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
            {isLive && activeSource === "webcam" && " • Webcam • LIVE"}
            {isLive && activeSource === "phonelink" && " • Phone • LIVE"}
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

      {/* ── Content Area ── */}
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
          <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/10 z-20 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <p className="text-[9px] font-mono font-bold text-emerald-400 uppercase flex items-center gap-1">
                <FiActivity size={10} /> 
                Motion: {motionLevel}%
              </p>
              <p className={`text-[9px] font-mono font-bold uppercase flex items-center gap-1 ${eyesOpen ? 'text-rose-400 animate-pulse' : 'text-blue-400'}`}>
                {eyesOpen ? <FiEye size={10} /> : <FiEyeOff size={10} />}
                Eyes: {eyesOpen ? "OPEN (AWAKE)" : "CLOSED"}
              </p>
            </div>
            <p className="text-[8px] font-mono text-slate-400 uppercase">
              AI Status: {aiStatus}
            </p>
          </div>
        )}

        {/* ── Source Selection (idle state) ── */}
        {!cameraActive && !loading && !cameraError && !showPhoneLinkGuide && !scanning && (
          <div className="flex flex-col items-center gap-5 py-6 px-4 w-full">
            <FiCamera size={28} className="text-slate-600" />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">
              Please Choose Your Camera Below
            </p>
            
            <div className="space-y-2 w-full max-w-sm">
              <button
                onClick={connectPhoneLink}
                className="w-full py-2.5 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <FiSmartphone size={14} /> Detect Phone Link
              </button>

              <button
                onClick={async () => {
                  setScanning(true);
                  try {
                    const temp = await navigator.mediaDevices.getUserMedia({ video: true }).catch(() => null);
                    if (temp) temp.getTracks().forEach(t => t.stop());
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const vids = devices.filter(d => d.kind === "videoinput");
                    setAllDevices(vids);
                    if (vids.length === 0) {
                      setCameraError("No cameras detected by the browser at all.");
                    } else {
                      setShowPhoneLinkGuide(true); // Re-use this UI to show the list
                    }
                  } catch (e) {
                    setCameraError("Failed to list cameras. Check permissions.");
                  }
                  setScanning(false);
                }}
                className="w-full py-2.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <FiMonitor size={14} /> List All Available Cameras
              </button>
            </div>
          </div>
        )}

        {/* ── Camera Selection / Phone Link Setup Guide ── */}
        {showPhoneLinkGuide && !cameraActive && !loading && (
          <div className="absolute inset-0 bg-slate-950 z-40 overflow-y-auto p-4">
            <div className="max-w-sm mx-auto space-y-3">
              <div className="flex items-center gap-2">
                <FiCamera size={16} className="text-cyan-400 flex-shrink-0" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Select Your Camera
                </h3>
              </div>
              
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Choose a camera from the list below. If your <b>Phone Link</b> camera does not appear, ensure it is activated in your <strong className="text-white">Windows Settings</strong>:
              </p>
              
              <div className="space-y-1.5 opacity-70">
                {[
                  "Settings → Bluetooth & devices → Mobile devices",
                  '"Allow this PC to access your mobile devices" → ON',
                  '"Use as a connected camera" → ON',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2 p-1.5 bg-white/5 rounded-lg">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 text-[8px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-[9px] text-slate-300">{text}</p>
                  </div>
                ))}
              </div>

              {/* Open Windows Settings */}
              <button
                onClick={() => {
                  try {
                    const iframe = document.createElement("iframe");
                    iframe.style.display = "none";
                    iframe.src = "ms-settings:crossdevice";
                    document.body.appendChild(iframe);
                    setTimeout(() => iframe.remove(), 2000);
                  } catch (_) {}
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                Open Mobile Device Settings
              </button>

              {/* Detected devices — let user manually pick */}
              {allDevices.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                    Cameras visible to browser ({allDevices.length}):
                  </p>
                  {allDevices.map((device, i) => (
                    <button
                      key={device.deviceId}
                      onClick={() => connectDevice(device.deviceId)}
                      className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-left transition-all"
                    >
                      <FiCamera size={12} className="text-slate-400 flex-shrink-0" />
                      <span className="text-[10px] text-slate-200 font-bold truncate">
                        {device.label || `Camera ${i + 1}`}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={rescan}
                  disabled={scanning}
                  className="flex-1 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {scanning ? <FiLoader size={11} className="animate-spin" /> : <FiSearch size={11} />}
                  {scanning ? "Scanning…" : "Scan Again"}
                </button>
                <button
                  onClick={() => { setShowPhoneLinkGuide(false); setActiveSource(null); }}
                  className="flex-1 py-2 bg-white/5 text-slate-400 rounded-xl text-[10px] font-bold uppercase"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {cameraError && !loading && (
          <div className="flex flex-col items-center gap-3 p-6 text-center z-30">
            <FiVideoOff size={24} className="text-rose-500" />
            <p className="text-[10px] text-rose-300/70 leading-relaxed max-w-[260px]">
              {cameraError}
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => { setCameraError(null); setShowPhoneLinkGuide(false); }} 
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[10px] font-bold uppercase transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* ── Loading / Scanning ── */}
        {(loading || scanning) && (
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
            <FiLoader size={32} className="text-indigo-500 animate-spin" />
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              {scanning ? "Scanning for Phone Link camera…" : "Connecting…"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
