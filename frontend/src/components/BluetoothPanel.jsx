import {
  FiLoader,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiTrash2,
} from "react-icons/fi";

/**
 * BluetoothPanel — Scan for nearby Bluetooth devices and connect to ESP32.
 * Uses the Web Bluetooth API (Chrome/Edge only).
 */
export default function BluetoothPanel({
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
}) {
  return (
    <div className="glass-card overflow-hidden" id="bluetooth-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-white/5 overflow-hidden gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-400"
            >
              <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-slate-200 truncate">Bluetooth</h3>
          {btConnected && (
            <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded-full flex-shrink-0">
              <FiCheck size={8} />
              Connected
            </span>
          )}
        </div>

        <button
          id="bt-scan-btn"
          onClick={scanForDevices}
          disabled={scanning || !btSupported}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 flex-shrink-0 border ${
            scanning
              ? "bg-slate-800 text-blue-400 border-white/5 cursor-wait shadow-inner"
              : !btSupported
              ? "bg-slate-800 text-slate-600 border-white/5 cursor-not-allowed"
              : "bg-blue-500 text-white border-blue-400/30 hover:bg-blue-400 hover:-translate-y-0.5 shadow-blue-500/30"
          }`}
        >
          {scanning ? (
            <FiLoader size={12} className="animate-spin" />
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" />
            </svg>
          )}
          <span>{scanning ? "Scanning..." : "Scan Bluetooth"}</span>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Help section for visibility */}
        {!btConnected && !scanning && (
          <div className="px-3 py-2.5 bg-blue-500/5 border border-blue-500/10 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-blue-400 mb-1.5 flex items-center gap-1.5 tracking-wider">
               Need Help?
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-400">
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40 mt-1 flex-shrink-0" />
                <span>If using <b>iPhone</b>, you must use the <b>Bluefy</b> app.</span>
              </li>
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40 mt-1 flex-shrink-0" />
                <span>On <b>Android</b>, turn on <b>Location (GPS)</b> and use Chrome.</span>
              </li>
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40 mt-1 flex-shrink-0" />
                <span>Ensure your ESP32 is powered on and not connected to anything else.</span>
              </li>
            </ul>
          </div>
        )}

        {/* Not supported warning */}
        {!btSupported && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <FiAlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300/80">
              <p className="font-medium">Bluetooth not supported</p>
              <p className="text-amber-400/60 mt-0.5">
                Use <span className="text-amber-300">Chrome</span> or{" "}
                <span className="text-amber-300">Edge</span> on desktop for Web Bluetooth.
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {btError && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <FiAlertCircle size={14} className="text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-rose-300/80">{btError}</div>
            <button onClick={() => setBtError(null)} className="text-rose-500 hover:text-rose-300">
              <FiX size={12} />
            </button>
          </div>
        )}

        {/* Connected device info */}
        {btConnected && btDevice && (
          <div className="flex items-center gap-3 px-3 py-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-300 truncate">
                {btDevice.name || "ESP32 Board"}
              </p>
              <p className="text-[10px] text-emerald-500/70">Connected via Bluetooth LE</p>
            </div>
            <button
              id="bt-disconnect-btn"
              onClick={disconnectDevice}
              className="px-3 py-1.5 bg-rose-500/15 text-rose-400 rounded-lg text-[11px] font-medium hover:bg-rose-500/25 transition-all"
            >
              Disconnect
            </button>
          </div>
        )}

        {/* Discovered devices list */}
        {discoveredDevices.length > 0 && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
              Available Devices ({discoveredDevices.length})
            </p>
            <div className="space-y-1.5">
              {discoveredDevices.map((entry) => {
                const isConnectedDevice = btDevice && btDevice.id === entry.id && btConnected;
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                      isConnectedDevice
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-white/[0.02] border-white/5 hover:border-indigo-500/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isConnectedDevice ? "bg-emerald-500/15" : "bg-blue-500/10"
                      }`}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={isConnectedDevice ? "text-emerald-400" : "text-blue-400"}
                      >
                        <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">
                        {entry.name || (
                          <span className="text-slate-500 italic">Unnamed Device</span>
                        )}
                      </p>
                      <p className="text-[9px] text-slate-600 font-mono mt-0.5 truncate uppercase">
                        ID: {entry.id.slice(0, 16).toUpperCase()}...
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isConnectedDevice ? (
                        <span className="text-[10px] text-emerald-400 font-medium px-2 py-1 bg-emerald-500/10 rounded-lg">
                          Connected
                        </span>
                      ) : (
                        <button
                          onClick={() => connectToDevice(entry)}
                          className="px-2.5 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg text-[11px] font-medium hover:bg-indigo-500/30 transition-all"
                        >
                          Connect
                        </button>
                      )}
                      <button
                        onClick={() => removeDevice(entry.id)}
                        className="p-1 text-slate-600 hover:text-rose-400 transition-colors"
                        title="Remove"
                      >
                        <FiTrash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {discoveredDevices.length === 0 && !btConnected && btSupported && (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3 border border-white/5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-600">
                <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" />
              </svg>
            </div>
            <p className="text-xs text-slate-500">No devices found</p>
            <p className="text-[10px] text-slate-600 mt-0.5">
              Click <span className="text-blue-400">Scan</span> to search for nearby ESP32 boards
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
