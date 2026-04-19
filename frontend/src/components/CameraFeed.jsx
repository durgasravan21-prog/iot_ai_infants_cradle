import React, { useState, useEffect, useRef } from "react";
import {
  FiCamera,
  FiPower,
  FiRefreshCw,
  FiVideoOff,
  FiLoader,
  FiSmartphone,
  FiMonitor,
} from "react-icons/fi";

/**
 * CameraFeed — two clear options:
 * 1. "Webcam" — uses the laptop's integrated/USB webcam
 * 2. "Phone Link" — launches the Windows Phone Link app and connects
 *    to the phone's virtual camera that it exposes to the system
 *
 * Both use navigator.mediaDevices.getUserMedia under the hood — the
 * only difference is WHICH device we ask for.
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

  // ── Connect Integrated Webcam ──
  const connectWebcam = async () => {
    setActiveSource("webcam");
    // Find the first device that is NOT the Phone Link virtual camera
    const webcam = cameraDevices.find(
      (d) => !/phone|link|virtual|mobile/i.test(d.label)
    );
    if (webcam) {
      await switchCamera(webcam.deviceId);
      if (!cameraActive) await startCamera(webcam.deviceId);
    } else {
      // Just use the default camera
      await startCamera();
    }
  };

  // ── Connect Phone Link ──
  const connectPhoneLink = async () => {
    setActiveSource("phonelink");

    // Try to open the Phone Link app on Windows
    try {
      window.open("ms-phone-link://", "_self");
    } catch (_) {}

    // Wait for the Phone Link virtual camera to register, then re-scan
    setTimeout(async () => {
      // Fresh scan
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");

      // Find Phone Link virtual camera
      const phoneCam = videoDevices.find((d) =>
        /phone|link|virtual|mobile/i.test(d.label)
      );

      if (phoneCam) {
        await switchCamera(phoneCam.deviceId);
        if (!cameraActive) await startCamera(phoneCam.deviceId);
      } else if (videoDevices.length > 1) {
        // If there are multiple cameras, the second one is likely phone link
        const second = videoDevices[1];
        await switchCamera(second.deviceId);
        if (!cameraActive) await startCamera(second.deviceId);
      } else {
        // Fallback: just start any camera available
        await startCamera();
      }
    }, 2500);
  };

  const handleStop = () => {
    stopCamera();
    setActiveSource(null);
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

        {/* Controls — only visible when live */}
        {isLive && (
          <div className="flex items-center gap-1.5">
            {/* Mirror */}
            <button
              onClick={toggleMirror}
              className={`p-1.5 rounded-lg text-[10px] font-bold transition-all ${
                isMirrored
                  ? "bg-amber-500 text-white"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
              title="Mirror / Reverse"
            >
              <FiRefreshCw size={13} />
            </button>

            {/* Stop */}
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

      {/* ── Video Area ── */}
      <div className="relative bg-black flex items-center justify-center overflow-hidden" style={{ minHeight: "220px" }}>
        {/* Live video element */}
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

        {/* Live overlay badge */}
        {isLive && (
          <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10 z-20">
            <p className="text-[8px] font-mono text-emerald-400 uppercase">
              {new Date().toLocaleTimeString()} •{" "}
              {activeSource === "phonelink" ? "PHONE LINK" : "WEBCAM"}
            </p>
          </div>
        )}

        {/* ── Idle: show TWO buttons ── */}
        {!cameraActive && !loading && !cameraError && (
          <div className="flex flex-col items-center gap-5 py-6 px-4 w-full">
            <FiCamera size={28} className="text-slate-600" />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Select Camera Source
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              {/* Option 1: Integrated Webcam */}
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
                <span className="text-[9px] text-slate-500">
                  Laptop / USB camera
                </span>
              </button>

              {/* Option 2: Phone Link */}
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
                Try Webcam
              </button>
              <button
                onClick={connectPhoneLink}
                className="px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-bold uppercase hover:bg-indigo-500/30 transition-all"
              >
                Try Phone Link
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
