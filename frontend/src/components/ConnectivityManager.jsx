import {
  FiLoader,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiTrash2,
  FiCpu,
  FiUsb,
} from "react-icons/fi";

export default function ConnectivityManager({
  btSupported,
  scanning,
  btDevice,
  btConnected,
  btError,
  discoveredDevices,
  scanForDevices,
  connectToDevice,
  disconnectDevice,
  removeDevice,
  setBtError,
  // Serial Props
  serialConnected,
  serialError,
  connectSerial,
  disconnectSerial,
}) {
  return (
    <div className="glass-card overflow-hidden" id="connectivity-panel">
      {/* Header Tabs */}
      <div className="flex items-center px-4 pt-4 pb-2 border-b border-white/5 space-x-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Connection Methods</h3>
      </div>

      <div className="p-4 space-y-6">
        {/* Serial USB Section (Priority for standard ESP32 boards) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <FiUsb className="text-orange-400" size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">USB Serial (COM Port)</p>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-slate-500 italic">Recommended for COM5</p>
                  <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[8px] font-bold uppercase rounded border border-orange-400/20">Wired</span>
                </div>
              </div>
            </div>
            {serialConnected ? (
              <button 
                onClick={disconnectSerial}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20 transition-all shadow-lg"
              >
                Disconnect
              </button>
            ) : (
              <button 
                onClick={connectSerial}
                className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-extrabold rounded-xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all transform hover:-translate-y-0.5 border border-white/10"
              >
                Connect USB
              </button>
            )}
          </div>

          {serialConnected && (
            <div className="px-3 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[11px] text-emerald-400 font-medium">Connected to COM Port (Streaming Data)</p>
            </div>
          )}

          {serialError && (
            <div className="px-3 py-2 bg-rose-500/5 border border-rose-500/10 rounded-xl flex items-center gap-2">
              <FiAlertCircle className="text-rose-400" size={12} />
              <p className="text-[11px] text-rose-400 font-medium">{serialError}</p>
            </div>
          )}
        </div>

        <div className="h-px bg-white/5 mx-2" />

        {/* Bluetooth LE Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-400">
                  <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">Bluetooth LE</p>
                <p className="text-[10px] text-slate-500">Wireless Control</p>
              </div>
            </div>
            <button
              onClick={scanForDevices}
              disabled={scanning || !btSupported}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                scanning
                  ? "bg-slate-800 text-slate-600 border border-white/5 cursor-wait"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 active:scale-95"
              }`}
            >
              {scanning ? <FiLoader className="animate-spin" /> : null}
              {scanning ? "Scanning..." : "Scan BLE"}
            </button>
          </div>

          {!btSupported && (
            <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-amber-400">
               <FiAlertCircle size={14} />
               <p className="text-[10px]">Bluetooth not supported in this browser.</p>
            </div>
          )}

          {btConnected && btDevice && (
            <div className="flex items-center gap-3 px-3 py-2 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-emerald-300 truncate">{btDevice.name || "Smart Cradle BLE"}</p>
                <p className="text-[9px] text-emerald-500/50 uppercase font-mono">Connected LE</p>
              </div>
              <button
                onClick={disconnectDevice}
                className="px-2 py-1 bg-rose-500/10 text-rose-400 rounded text-[10px] font-bold hover:bg-rose-500/20"
              >
                Drop
              </button>
            </div>
          )}

          {/* Discovered BLE devices list */}
          {!btConnected && discoveredDevices.length > 0 && (
            <div className="space-y-1.5">
              {discoveredDevices.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl hover:border-blue-500/30 transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{entry.name || "Unnamed ESP32"}</p>
                    <p className="text-[9px] text-slate-600 font-mono italic">RSSI: Stable</p>
                  </div>
                  <button
                    onClick={() => connectToDevice(entry)}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-[10px] font-bold hover:bg-blue-400"
                  >
                    Pair
                  </button>
                  <button onClick={() => removeDevice(entry.id)} className="p-1 text-slate-700 hover:text-rose-500">
                    <FiTrash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
