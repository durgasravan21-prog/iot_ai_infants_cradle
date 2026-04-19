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
} from "react-icons/fi";

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

  // ──────────────────────────────────────────────
  // WEBCAM: Just use the default system camera.
  // No filtering, no complexity. Ask browser for camera → done.
  // ──────────────────────────────────────────────
  const connectWebcam = async () => {
    setShowPhoneLinkGuide(false);
    setActiveSource("webcam");

    // Find the integrated/built-in webcam specifically (NOT the virtual camera)
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true }).catch(() => null);
      if (tempStream) tempStream.getTracks().forEach((t) => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");

      // Find the integrated webcam — it usually has "integrated", "webcam", or a vendor ID in label
      const integratedCam = videoDevices.find((d) =>
        /integrated|built-in|webcam|0bda|hd camera|facetime/i.test(d.label)
      );

      if (integratedCam) {
        await switchCamera(integratedCam.deviceId);
        await startCamera(integratedCam.deviceId);
      } else {
        // Fallback: just start the default
        await startCamera();
      }
    } catch (_) {
      await startCamera();
    }
  };

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

      console.log("All camera devices found:", videoDevices.map(d => d.label));

      if (videoDevices.length === 0) {
        // No cameras at all
        setShowPhoneLinkGuide(true);
        return;
      }

      if (videoDevices.length === 1) {
        // Only one camera = the integrated webcam. Phone Link is NOT enabled.
        // DO NOT connect to it — show the setup guide instead.
        setShowPhoneLinkGuide(true);
        return;
      }

      // Find the Phone Link / Virtual Camera by its label
      const phoneLinkCam = videoDevices.find((d) =>
        /virtual camera|phone link|windows virtual/i.test(d.label)
      );

      if (phoneLinkCam) {
        console.log("Connecting to Phone Link camera:", phoneLinkCam.label);
        await switchCamera(phoneLinkCam.deviceId);
        await startCamera(phoneLinkCam.deviceId);
      } else {
        // No virtual camera label found — pick the one that is NOT the integrated webcam
        const nonIntegrated = videoDevices.find((d) =>
          !/integrated|built-in|webcam|0bda|hd camera/i.test(d.label)
        );
        if (nonIntegrated) {
          await switchCamera(nonIntegrated.deviceId);
          await startCamera(nonIntegrated.deviceId);
        } else {
          // All devices look like integrated webcams — show guide
          setShowPhoneLinkGuide(true);
          return;
        }
      }
    } catch (err) {
      setScanning(false);
      setShowPhoneLinkGuide(true);
    }
  };

  // Connect to a specific device from the device list
  const connectDevice = async (deviceId) => {
    setShowPhoneLinkGuide(false);
    await switchCamera(deviceId);
    await startCamera(deviceId);
  };

  // Rescan for devices
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

      // If we now have more than 1, auto-connect the new one
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
          <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10 z-20">
            <p className="text-[8px] font-mono text-emerald-400 uppercase">
              {new Date().toLocaleTimeString()} •{" "}
              {activeSource === "phonelink" ? "PHONE LINK" : "WEBCAM"}
            </p>
          </div>
        )}

        {/* ── Source Selection (idle state) ── */}
        {!cameraActive && !loading && !cameraError && !showPhoneLinkGuide && !scanning && (
          <div className="flex flex-col items-center gap-5 py-6 px-4 w-full">
            <FiCamera size={28} className="text-slate-600" />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Select Camera Source
            </p>
            <div className="flex gap-3 w-full max-w-xs">
              {/* Webcam */}
              <button
                onClick={connectWebcam}
                className="flex-1 flex flex-col items-center gap-2 px-3 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/40 rounded-xl transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 group-hover:bg-cyan-500/20 flex items-center justify-center">
                  <FiMonitor size={20} className="text-cyan-400" />
                </div>
                <span className="text-[10px] font-bold text-slate-200 uppercase">
                  Webcam
                </span>
                <span className="text-[9px] text-slate-500">Laptop / USB</span>
              </button>
              {/* Phone Link */}
              <button
                onClick={connectPhoneLink}
                className="flex-1 flex flex-col items-center gap-2 px-3 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500/40 rounded-xl transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500/20 flex items-center justify-center">
                  <FiSmartphone size={20} className="text-indigo-400" />
                </div>
                <span className="text-[10px] font-bold text-slate-200 uppercase">
                  Phone Link
                </span>
                <span className="text-[9px] text-slate-500">Phone Camera</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Phone Link Setup Guide ── */}
        {showPhoneLinkGuide && !cameraActive && !loading && (
          <div className="absolute inset-0 bg-slate-950 z-40 overflow-y-auto p-4">
            <div className="max-w-sm mx-auto space-y-3">
              <div className="flex items-center gap-2">
                <FiAlertCircle size={16} className="text-amber-400 flex-shrink-0" />
                <h3 className="text-xs font-bold text-white">
                  Phone Camera Not Detected
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Your phone camera is not visible to the browser. Enable it in
                <strong className="text-white"> Windows Settings</strong>:
              </p>
              <div className="space-y-1.5">
                {[
                  "Settings → Bluetooth & devices → Mobile devices",
                  '"Allow this PC to access your mobile devices" → ON',
                  'Click "Manage devices" → add your phone',
                  '"Use as a connected camera" → ON',
                  "Open Phone Link app → ensure phone is connected",
                  'On phone: "Link to Windows" must show Connected',
                ].map((text, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2 bg-white/5 rounded-lg"
                  >
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-[10px] text-slate-300">{text}</p>
                  </div>
                ))}
              </div>

              {/* Open Windows Settings */}
              <button
                onClick={() => {
                  try { window.open("ms-settings:crossdevice"); } catch (_) {}
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
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <FiVideoOff size={24} className="text-rose-500" />
            <p className="text-[10px] text-rose-300/70 leading-relaxed max-w-[260px]">
              {cameraError}
            </p>
            <div className="flex gap-2">
              <button onClick={connectWebcam} className="px-3 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-[10px] font-bold uppercase">Webcam</button>
              <button onClick={connectPhoneLink} className="px-3 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-bold uppercase">Phone Link</button>
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
