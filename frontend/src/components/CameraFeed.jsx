import React, { useState, useEffect } from "react";
import { 
  FiCamera, 
  FiSettings, 
  FiPower, 
  FiRefreshCw, 
  FiVideoOff, 
  FiLoader,
  FiSmartphone,
  FiLink
} from "react-icons/fi";
import io from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

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
  const [mode, setMode] = useState("remote"); // "remote" | "local"
  const [remoteFrame, setRemoteFrame] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to backend for Remote Camera via WebRTC/Socket
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on("videoFrame", (frameData) => {
      setRemoteFrame(frameData);
    });

    return () => newSocket.disconnect();
  }, []);

  const handleToggle = () => {
    if (mode === "local") {
      if (cameraActive) stopCamera();
      else startCamera();
    } else {
      // In remote mode, "toggling" just clears the remote frame
      setRemoteFrame(null);
    }
  };

  const getRemoteUrl = () => {
    const origin = window.location.origin;
    return `${origin}?view=camera`;
  };

  const copyRemoteLink = () => {
    navigator.clipboard.writeText(getRemoteUrl());
    alert("Mobile Camera Link copied to clipboard! Open this link on your smartphone.");
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative rounded-3xl border border-white/5" id="camera-container">
      {/* Header Bar */}
      <div className="px-5 h-14 flex items-center justify-between bg-slate-800/80 backdrop-blur-md border-b border-white/5 z-50">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${(mode === "local" && cameraActive) || (mode === "remote" && remoteFrame) ? "bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-slate-600"}`} />
          <h2 className="text-xs font-black tracking-widest text-white uppercase italic">
             {mode === "remote" ? "Remote Phone" : "Local Camera"}
          </h2>
        </div>

        <div className="flex items-center gap-2">
           {/* Mode Switch Button */}
           <button
            onClick={() => {
              if (cameraActive) stopCamera();
              setMode(mode === "remote" ? "local" : "remote");
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-xl text-[10px] font-black transition-all border border-indigo-500/30"
          >
            {mode === "remote" ? <FiCamera size={14} /> : <FiSmartphone size={14} />}
            SWITCH TO {mode === "remote" ? "LOCAL" : "MOBILE"}
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
              if (mode === "local") enumerateDevices();
            }}
            className={`p-2 rounded-xl transition-all ${
              showSettings ? "bg-indigo-500 text-white" : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            <FiSettings size={16} />
          </button>

          {/* Power button (Only for local mode, or clear remote frame) */}
          <button
            onClick={handleToggle}
            className={`p-2 rounded-xl transition-all ${
              (mode === "local" && cameraActive) || (mode === "remote" && remoteFrame) 
              ? "bg-rose-500 text-white" 
              : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
            }`}
          >
            {loading ? <FiLoader className="animate-spin" size={16} /> : <FiPower size={16} />}
          </button>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
        
        {/* --- LOCAL CAMERA FEED --- */}
        {mode === "local" && cameraActive && (
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
                 {new Date().toLocaleString()} • LOCAL_USB
              </p>
            </div>
          </div>
        )}

        {/* --- REMOTE SOCKET FEED --- */}
        {mode === "remote" && remoteFrame && (
          <div className="absolute inset-0 z-10 w-full h-full">
            <img
              src={remoteFrame}
              alt="Remote Feed"
              style={{ 
                transform: isMirrored ? "scaleX(-1)" : "scaleX(1)",
                transition: "transform 0.4s ease-out"
              }}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 z-20">
              <p className="text-[9px] font-mono text-emerald-400 uppercase tracking-tighter flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
                 {new Date().toLocaleString()} • WIRELESS_MOBILE_FEED
              </p>
            </div>
          </div>
        )}

        {/* --- STANDBY SCREENS --- */}
        {mode === "remote" && !remoteFrame && (
           <div className="flex flex-col items-center justify-center gap-6 z-0 animate-in fade-in duration-500 text-center px-4">
             <div className="w-24 h-24 rounded-[32px] bg-slate-800 flex items-center justify-center border border-indigo-500/30 shadow-2xl relative">
               <FiSmartphone size={44} className="text-indigo-400 animate-pulse" />
             </div>
             <div className="space-y-2">
               <p className="text-base font-black text-slate-200 uppercase tracking-widest">Waiting for Phone...</p>
               <p className="text-[11px] text-slate-500 font-medium max-w-[250px]">
                 Open the specialized mobile camera link on your phone to connect instantly.
               </p>
             </div>
             <button
                onClick={copyRemoteLink}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase transition-all shadow-2xl shadow-indigo-600/20 active:scale-95"
             >
                <FiLink size={14} /> Copy Mobile Link
             </button>
           </div>
        )}

        {mode === "local" && !cameraActive && !loading && !cameraError && (
          <div className="flex flex-col items-center justify-center gap-6 z-0 animate-in fade-in duration-500">
            <div className="w-24 h-24 rounded-[32px] bg-slate-800 flex items-center justify-center border border-white/5 shadow-2xl relative">
              <FiCamera size={44} className="text-slate-600" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-base font-black text-slate-200 uppercase tracking-widest">Camera Off</p>
              <p className="text-[11px] text-slate-500 font-medium">Using local / USB device</p>
            </div>
            <button
               onClick={startCamera}
               className="px-10 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase transition-all shadow-xl active:scale-95"
            >
               Turn On Local Camera
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
                onClick={() => setCameraError(null)}
                className="w-full py-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 text-[10px] font-black rounded-2xl uppercase tracking-widest"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-30">
            <FiLoader size={48} className="text-indigo-500 animate-spin" />
            <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Initializing...</p>
          </div>
        )}

        {/* Settings Overlay */}
        {showSettings && (
          <div className="absolute inset-0 bg-slate-900/98 backdrop-blur-2xl z-[60] p-8 animate-in slide-in-from-top-6 duration-300">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-white font-black text-lg uppercase">Device Select</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white p-2">✕</button>
            </div>
            
            {mode === "remote" ? (
               <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-slate-300 text-center">
                 Remote Mode is active. You must select the camera directly on your phone instead of here.
               </div>
            ) : (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
