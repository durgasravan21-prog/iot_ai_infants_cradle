import { FiActivity, FiZap } from "react-icons/fi";

/**
 * RockingControl — Premium manual rocking toggle + status display.
 * Emits Socket.io/MQTT events to command the ESP32 servo motor.
 */
export default function RockingControl({ isRocking, onToggle }) {
  return (
    <div 
      className="glass-card p-6 relative overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10" 
      id="rocking-control"
    >
      {/* Background decoration */}
      <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 rounded-full transition-all duration-700 ${isRocking ? 'bg-indigo-400' : 'bg-slate-600'}`} />
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
            <FiActivity size={18} className={isRocking ? "animate-pulse" : ""} />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-white uppercase">Cradle Movement</h3>
        </div>
        
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isRocking ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-slate-500'}`} />
          <span className="text-[10px] font-mono font-black text-slate-400 uppercase">
            {isRocking ? "Sweeping" : "Stationary"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-8 relative z-10">
        {/* Cradle visual with physical animation */}
        <div className="relative group/swing">
          <div className={`text-6xl filter drop-shadow-lg transition-transform duration-1000 origin-top ${isRocking ? "animate-cradle-swing bounce-in" : "scale-95 grayscale-[0.5]"}`}>
            🛏️
          </div>
          {isRocking && (
            <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full scale-110 -z-10 animate-pulse" />
          )}
        </div>

        {/* Control Section */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between group/ctrl">
            <div className="space-y-0.5">
              <span className="block text-xs font-bold text-slate-300">Servo Swing</span>
              <span className="block text-[10px] text-slate-500 font-medium">40° — 140° cycle</span>
            </div>
            
            <button
              id="rocking-toggle-btn"
              onClick={() => onToggle()}
              className={`relative w-12 h-6 rounded-full transition-all duration-300 shadow-inner ${
                isRocking ? "bg-indigo-500" : "bg-slate-700 hover:bg-slate-600"
              }`}
              aria-label={isRocking ? "Stop rocking" : "Start rocking"}
            >
              <div 
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                  isRocking ? "translate-x-6" : ""
                }`} 
              />
            </button>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors">
            <div className="flex items-start gap-2">
              <FiZap size={12} className={`mt-0.5 ${isRocking ? 'text-amber-400' : 'text-slate-500'}`} />
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                {isRocking
                  ? "Gentle rhythmic rocking enabled. Servo is actively sweeping to comfort the baby."
                  : "Motors are locked at center (90°). Use the switch to start manual rocking."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
