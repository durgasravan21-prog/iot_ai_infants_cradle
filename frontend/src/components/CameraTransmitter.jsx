import React, { useEffect, useRef, useState } from "react";
import { FiCamera, FiVideoOff, FiActivity, FiSmartphone } from "react-icons/fi";
import io from "socket.io-client";

// Connect to the backend server (automatically uses the same host for Vercel/Railway)
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export default function CameraTransmitter() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    // Initialize Socket connection
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  const startBroadcast = async () => {
    try {
      setError(null);
      
      // Request access to mobile rear camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsStreaming(true);

      // Setup broadcasting loop
      let lastFrameTime = Date.now();
      let framesCount = 0;

      const triggerBroadcast = () => {
        if (!isStreaming || !videoRef.current || !canvasRef.current || !socket) return;
        
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        const video = videoRef.current;

        if (video.videoWidth > 0 && video.videoHeight > 0) {
           canvas.width = video.videoWidth;
           canvas.height = video.videoHeight;
           
           // Draw video to canvas
           context.drawImage(video, 0, 0, canvas.width, canvas.height);
           
           // Convert to compressed jpeg WebP/DataURL to save bandwidth
           const frameData = canvas.toDataURL("image/jpeg", 0.5); 
           
           // Send to backend
           socket.emit("videoFrame", frameData);
           
           // Calculate FPS
           framesCount++;
           const now = Date.now();
           if (now - lastFrameTime >= 1000) {
             setFps(framesCount);
             framesCount = 0;
             lastFrameTime = now;
           }
        }
        
        // Loop at ~15fps for balanced performance (1000/15 ~= 66ms)
        setTimeout(triggerBroadcast, 66);
      };

      // Start the loop once video is playing
      videoRef.current.onplaying = () => {
        triggerBroadcast();
      };

    } catch (err) {
      console.error("Camera access failed:", err);
      setError("Please allow camera permissions. If on iOS Safari, ensure camera is not disabled in website settings.");
    }
  };

  const stopBroadcast = () => {
    setIsStreaming(false);
    setFps(0);
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white font-sans overflow-hidden p-6 gap-6 relative">
      <div className="absolute top-0 left-0 w-full h-[30vh] bg-indigo-500/10 blur-[100px] z-0 pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-2 items-center text-center mt-8">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
           <FiSmartphone size={32} className="text-indigo-400" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight mt-2">Mobile Camera</h1>
        <p className="text-slate-400 text-sm max-w-[280px]">
          Turn this smartphone into a wireless camera for the Smart Cradle Dashboard.
        </p>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
         {/* Hidden Elements */}
         <video ref={videoRef} className="hidden" playsInline muted autoPlay />
         <canvas ref={canvasRef} className="hidden" />

         {/* Visual Status Indicator */}
         <div className="relative w-full max-w-sm aspect-[4/3] rounded-[2rem] bg-slate-900 border border-white/10 flex flex-col items-center justify-center overflow-hidden shadow-2xl">
           {isStreaming ? (
             <div className="flex flex-col items-center gap-4 text-emerald-400">
               <div className="relative">
                 <div className="absolute inset-0 bg-emerald-500/30 blur-xl animate-pulse rounded-full" />
                 <FiActivity size={64} className="animate-pulse relative z-10" />
               </div>
               <div className="text-center font-mono">
                 <p className="font-bold tracking-widest uppercase">Streaming Live</p>
                 <p className="text-xs text-emerald-500/70 mt-1">{fps} Pinging FPS</p>
               </div>
             </div>
           ) : (
             <div className="flex flex-col items-center gap-4 text-slate-600">
               <FiVideoOff size={64} />
               <p className="font-bold tracking-widest uppercase text-sm">Standby</p>
             </div>
           )}
         </div>

         {error && (
           <div className="mt-6 p-4 bg-rose-500/20 border border-rose-500/30 rounded-2xl text-center max-w-sm">
             <p className="text-xs text-rose-300 font-medium">{error}</p>
           </div>
         )}
      </div>

      <div className="relative z-10 pb-8 flex justify-center w-full">
        {!isStreaming ? (
           <button 
             onClick={startBroadcast}
             className="w-full max-w-sm py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black text-sm tracking-widest uppercase shadow-[0_10px_40px_rgba(99,102,241,0.4)] active:scale-95 transition-all"
           >
              Start Broadcasting
           </button>
        ) : (
           <button 
             onClick={stopBroadcast}
             className="w-full max-w-sm py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-[1.5rem] font-black text-sm tracking-widest uppercase shadow-[0_10px_40px_rgba(225,29,72,0.4)] active:scale-95 transition-all"
           >
              Stop & Disconnect
           </button>
        )}
      </div>
    </div>
  );
}
