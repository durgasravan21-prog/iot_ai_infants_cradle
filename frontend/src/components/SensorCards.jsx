import { FiThermometer, FiDroplet, FiVolume2, FiActivity, FiEye, FiWind } from "react-icons/fi";

/**
 * Sensor data display cards — shows live readings with animated icons.
 */
export default function SensorCards({ data, aiData }) {
  // Fallback to empty data state if no connection yet
  const safeData = data || {
    temperature: -1,
    humidity: -1,
    sound: "---",
    moisture: "---",
    motion: false,
    isCrying: false,
    isWet: false,
    tempAlert: false,
    isRocking: false,
  };

  // Combine ESP Hardware Motion with Camera AI Motion
  const isMotionActive = safeData.motion || (aiData && aiData.motionLevel > 2);
  
  // Combine ESP Hardware Sound with Web Microphone AI Sound
  const isCryingActive = safeData.isCrying || (aiData && aiData.isCrying);
  
  const displaySoundValue = (aiData && aiData.aiActive && aiData.audioStatus !== "Idle" && aiData.audioStatus !== "Mic Access Denied")
    ? `Audio: ${aiData.audioLevel}%`
    : (data ? safeData.sound : "---");

  const displaySoundStatus = (!data && (!aiData || !aiData.aiActive || aiData.audioStatus === "Idle")) ? "Waiting for IoT..." 
    : isCryingActive ? "Baby Crying!" 
    : (aiData && aiData.aiActive && aiData.audioStatus && aiData.audioStatus !== "Idle") ? aiData.audioStatus 
    : "Quiet";

  const cards = [
    {
      id: "temperature",
      label: "Temperature",
      value: safeData.temperature >= 0 ? `${safeData.temperature.toFixed(1)}°C` : "--°C",
      icon: FiThermometer,
      color: safeData.tempAlert ? "#f43f5e" : "#6366f1",
      bgGlow: safeData.tempAlert ? "rgba(244, 63, 94, 0.1)" : "rgba(99, 102, 241, 0.1)",
      status: !data ? "Waiting..." : safeData.tempAlert ? "High!" : "Normal",
      statusColor: !data ? "text-slate-500" : safeData.tempAlert ? "text-rose-400" : "text-emerald-400",
    },

    {
      id: "sound",
      label: "Sound Level",
      value: displaySoundValue,
      icon: FiVolume2,
      color: isCryingActive ? "#f43f5e" : "#8b5cf6",
      bgGlow: isCryingActive ? "rgba(244, 63, 94, 0.1)" : "rgba(139, 92, 246, 0.1)",
      status: displaySoundStatus,
      statusColor: (!data && (!aiData || aiData.audioStatus === "Idle")) ? "text-slate-500" 
                 : isCryingActive ? "text-rose-400 font-bold animate-pulse" 
                 : "text-emerald-400",
    },
    {
      id: "moisture",
      label: "Moisture",
      value: safeData.moisture,
      icon: FiWind,
      color: safeData.isWet ? "#f59e0b" : "#10b981",
      bgGlow: safeData.isWet ? "rgba(245, 158, 11, 0.1)" : "rgba(16, 185, 129, 0.1)",
      status: !data ? "Waiting..." : safeData.isWet ? "Wet — Change Diaper!" : "Dry",
      statusColor: !data ? "text-slate-500" : safeData.isWet ? "text-amber-400 font-semibold" : "text-emerald-400",
    },
    {
      id: "motion",
      label: "Motion",
      value: (!data && (!aiData || !aiData.aiActive)) ? "--" : isMotionActive ? "Detected" : "None",
      icon: FiEye,
      color: isMotionActive ? "#22d3ee" : "#64748b",
      bgGlow: isMotionActive ? "rgba(34, 211, 238, 0.1)" : "rgba(100, 116, 139, 0.1)",
      status: (!data && (!aiData || !aiData.aiActive)) ? "Waiting for IoT..." : isMotionActive ? "Activity" : "Still",
      statusColor: (!data && (!aiData || !aiData.aiActive)) ? "text-slate-500" : isMotionActive ? "text-cyan-400" : "text-slate-400",
    },
    {
      id: "cradle",
      label: "Cradle",
      value: !data ? "--" : (safeData.isRocking ? "Rocking" : "Stopped"),
      icon: FiActivity,
      color: safeData.isRocking ? "#6366f1" : "#64748b",
      bgGlow: safeData.isRocking ? "rgba(99, 102, 241, 0.1)" : "rgba(100, 116, 139, 0.1)",
      status: !data ? "Waiting for IoT..." : (safeData.isRocking ? "Active" : "Idle"),
      statusColor: !data ? "text-slate-500" : (safeData.isRocking ? "text-indigo-400" : "text-slate-400"),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            id={`sensor-card-${card.id}`}
            className="glass-card flex flex-col justify-between px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4 relative overflow-hidden min-h-[140px]"
            style={{ background: `linear-gradient(135deg, ${card.bgGlow}, rgba(15, 23, 42, 0.8))` }}
          >
            {/* Decorative corner glow */}
            <div
              className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none"
              style={{ background: card.color, transform: "translate(30%, -30%)" }}
            />

            <div className="flex items-center gap-2 mb-3 relative z-10">
              <div
                className="w-8 h-8 rounded-lg flex flex-shrink-0 items-center justify-center shadow-inner border border-white/5"
                style={{ background: `${card.color}15`, color: card.color }}
              >
                <Icon size={16} />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">
                {card.label}
              </span>
            </div>

            <div className="relative z-10 mt-auto">
              <p className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight" style={{ color: card.color }}>
                {card.value}
              </p>

              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full glow-dot flex-shrink-0"
                  style={{ background: card.color, boxShadow: `0 0 6px ${card.color}` }}
                />
                <span className={`text-[10px] sm:text-xs ${card.statusColor} font-medium truncate`}>
                  {card.status}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
