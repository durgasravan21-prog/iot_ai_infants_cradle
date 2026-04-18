import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/**
 * Custom tooltip for the temperature/humidity chart.
 */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="custom-tooltip">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-xs font-medium" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : "--"}°C
        </p>
      ))}
    </div>
  );
}

/**
 * Temperature & Humidity trend chart using Recharts AreaChart.
 */
export default function TempChart({ data }) {
  const hasData = data && data.length > 0;

  return (
    <div className="glass-card p-5" id="temperature-chart">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">
          📈 Temperature Trends
        </h3>
        <span className="text-[10px] text-slate-500 font-mono">
          Last {data?.length || 0} readings
        </span>
      </div>

      {!hasData ? (
        <div className="h-40 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <p className="text-sm">Waiting for sensor data...</p>
            <p className="text-xs mt-1">Chart will populate in real-time</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradHumidity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.08)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={{ stroke: "rgba(148, 163, 184, 0.1)" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
              iconType="circle"
              iconSize={8}
            />

            <Area
              type="monotone"
              dataKey="temp"
              name="Temperature"
              stroke="#6366f1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#gradTemp)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "#6366f1", fill: "#0a0e1a" }}
            />
            </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
