/**
 * StatusBar — Replaces the physical LCD.
 * Shows contextual status messages based on live sensor state.
 */
export default function StatusBar({ data }) {
  const getMessages = () => {
    if (!data) return [{ text: "Connecting to sensors...", color: "#64748b", icon: "⏳" }];

    const messages = [];

    if (data.isCrying) {
      messages.push({ text: "Baby is Crying", color: "#f43f5e", icon: "😢", priority: 1 });
    }

    if (data.isWet) {
      messages.push({ text: "Diaper Needs Changing", color: "#f59e0b", icon: "💧", priority: 2 });
    }

    if (data.tempAlert) {
      messages.push({
        text: `High Temperature: ${data.temperature?.toFixed(1)}°C`,
        color: "#ef4444",
        icon: "🌡️",
        priority: 3,
      });
    }

    if (data.isRocking) {
      messages.push({ text: "Cradle Rocking", color: "#6366f1", icon: "🎠", priority: 5 });
    }

    if (data.motion) {
      messages.push({ text: "Motion Detected", color: "#22d3ee", icon: "👁️", priority: 4 });
    }

    if (messages.length === 0) {
      messages.push({ text: "Baby is sleeping peacefully", color: "#10b981", icon: "😴", priority: 10 });
    }

    return messages.sort((a, b) => a.priority - b.priority);
  };

  const messages = getMessages();
  const primary = messages[0];

  return (
    <div
      className="glass-card p-4 border-l-4 flex items-center gap-3"
      style={{ borderLeftColor: primary.color }}
      id="status-bar"
    >
      <span className="text-2xl">{primary.icon}</span>
      <div className="flex-1">
        <p className="text-base font-bold" style={{ color: primary.color }}>
          {primary.text}
        </p>
        {messages.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-1.5">
            {messages.slice(1).map((msg, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: `${msg.color}15`,
                  color: msg.color,
                  border: `1px solid ${msg.color}30`,
                }}
              >
                {msg.icon} {msg.text}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Mini sensor readout */}
      {data && (
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-500 font-mono">
          {data.hb !== undefined && <span className="bg-emerald-500/10 text-emerald-500 px-1.5 rounded">HB:{data.hb}</span>}
          <span>🌡 {data.temperature?.toFixed(1)}°C</span>
          <span>💧 {data.humidity?.toFixed(1)}%</span>
          <span>🔊 {data.sound}</span>
        </div>
      )}
    </div>
  );
}
