import { FiThermometer, FiDroplet, FiVolume2, FiActivity, FiEye, FiWind } from "react-icons/fi";

/**
 * Sensor data display cards — shows live readings with animated icons.
 */
export default function SensorCards({ data }) {
  const safeData = data || {
    temperature: -1,
    isCrying: false,
    isWet: false,
    motion: false
  };

  const isCryingActive = Boolean(safeData.isCrying);
  const isWetActive = Boolean(safeData.isWet);
  const isMotionActive = Boolean(safeData.motion); 
  
  const cards = [
    {
      id: "temperature",
      label: "Temperature",
      value: (safeData.temperature > -1) ? `${Number(safeData.temperature).toFixed(1)}°C` : "--°C",
      icon: FiThermometer,
      color: (safeData.temperature > 35) ? "#f43f5e" : "#6366f1",
      status: (safeData.temperature > 35) ? "High Temp!" : "Stable",
      statusColor: (safeData.temperature > 35) ? "text-rose-400" : "text-emerald-400",
    },
    {
      id: "sound",
      label: "Baby Audio (MIC)",
      value: isCryingActive ? "CRYING" : "Quiet",
      icon: FiVolume2,
      color: isCryingActive ? "#f43f5e" : "#8b5cf6",
      status: isCryingActive ? "Hardware Alert!" : "Monitoring",
      statusColor: isCryingActive ? "text-rose-400 font-bold" : "text-emerald-400",
    },
    {
      id: "moisture",
      label: "Diaper",
      value: isWetActive ? "WET" : "Fresh",
      icon: FiDroplet,
      color: isWetActive ? "#f59e0b" : "#10b981",
      status: isWetActive ? "Change Needed!" : "Dry",
      statusColor: isWetActive ? "text-amber-400" : "text-emerald-400",
    },
    {
      id: "pir",
      label: "Movement (PIR)",
      value: isMotionActive ? "MOVING" : "None",
      icon: FiActivity,
      color: isMotionActive ? "#a855f7" : "#64748b",
      status: isMotionActive ? "Baby is Awake" : "Sleeping",
      statusColor: isMotionActive ? "text-purple-400" : "text-slate-500",
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.id} className="glass-card p-4 relative overflow-hidden min-h-[140px] border border-white/5 flex flex-col justify-between" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15`, color: card.color }}>
                <Icon size={16} />
              </div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{card.label}</span>
            </div>
            <div className="relative z-10">
              <p className="text-2xl font-bold mb-1" style={{ color: card.color }}>{card.value}</p>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: card.color, boxShadow: `0 0 6px ${card.color}` }} />
                <span className={`text-[10px] sm:text-xs ${card.statusColor} font-medium`}>{card.status}</span>
              </div>
            </div>
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-16 h-16 blur-3xl opacity-10" style={{ background: card.color }} />
          </div>
        );
      })}
    </div>
  );
}
