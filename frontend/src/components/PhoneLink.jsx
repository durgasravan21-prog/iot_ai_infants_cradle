import React, { useState, useEffect } from "react";
import { FiSmartphone, FiCopy, FiExternalLink, FiX } from "react-icons/fi";

export default function PhoneLink({ isOpen, onClose }) {
  const [sessionUrl, setSessionUrl] = useState("");

  useEffect(() => {
    // Generate the special link for the phone
    const baseUrl = window.location.origin;
    const sessionId = Math.random().toString(36).substring(7);
    setSessionUrl(`${baseUrl}/?role=camera&sid=${sessionId}`);
  }, [isOpen]);

  const copyLink = () => {
    navigator.clipboard.writeText(sessionUrl);
    alert("Link copied! Send it to your phone.");
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(sessionUrl)}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#1a1f2e] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
        >
          <FiX size={20} />
        </button>

        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
            <FiSmartphone size={32} />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Use Phone as Camera</h2>
            <p className="text-sm text-slate-400">Scan this QR code with your phone camera to start streaming instantly.</p>
          </div>

          <div className="bg-white p-4 rounded-2xl inline-block shadow-lg mx-auto">
            <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
          </div>

          <div className="flex gap-2">
            <button 
              onClick={copyLink}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl border border-white/5 transition-all"
            >
              <FiCopy size={14} />
              Copy Link
            </button>
            <a 
              href={sessionUrl} 
              target="_blank" 
              className="flex items-center justify-center p-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl transition-all"
            >
              <FiExternalLink size={14} />
            </a>
          </div>

          <p className="text-[10px] text-slate-500 italic">No apps or IP addresses needed. Works over any network.</p>
        </div>
      </div>
    </div>
  );
}
