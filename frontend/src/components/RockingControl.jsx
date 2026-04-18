/**
 * RockingControl — Manual rocking toggle + status display.
 * Emits Socket.io events to command the ESP32 servo motor.
 */
export default function RockingControl({ isRocking, onToggle }) {
  return (
    <div className="glass-card p-5" id="rocking-control">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">🎠 Cradle Control</h3>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
            isRocking
              ? "bg-indigo-500/20 text-indigo-400"
              : "bg-slate-700/50 text-slate-500"
          }`}
        >
          {isRocking ? "Active" : "Idle"}
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Cradle visual */}
        <div className="flex-shrink-0">
          <div className={`text-5xl ${isRocking ? "rocking" : ""}`}>🛏️</div>
        </div>

        {/* Toggle + info */}
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-3">
            <span className="text-xs text-slate-400">Manual Rocking</span>
            <button
              id="rocking-toggle-btn"
              onClick={() => onToggle(isRocking ? "stop" : "rock")}
              className={`toggle-track ${isRocking ? "active" : ""}`}
              aria-label={isRocking ? "Stop rocking" : "Start rocking"}
            >
              <div className="toggle-thumb" />
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {isRocking
              ? "Cradle is gently rocking. The servo motor on the ESP32 is sweeping between 40° and 140°."
              : "Tap the toggle to start rocking. A 'rock' command will be sent to the ESP32 via MQTT."}
          </p>
        </div>
      </div>
    </div>
  );
}
