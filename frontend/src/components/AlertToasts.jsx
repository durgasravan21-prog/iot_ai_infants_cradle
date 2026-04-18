import { FiX, FiAlertTriangle, FiDroplet, FiThermometer, FiActivity } from "react-icons/fi";

const ALERT_CONFIG = {
  CRYING: {
    icon: FiAlertTriangle,
    gradient: "from-rose-500/20 to-rose-500/5",
    border: "border-rose-500/30",
    iconColor: "text-rose-400",
  },
  WET: {
    icon: FiDroplet,
    gradient: "from-amber-500/20 to-amber-500/5",
    border: "border-amber-500/30",
    iconColor: "text-amber-400",
  },
  HIGH_TEMP: {
    icon: FiThermometer,
    gradient: "from-orange-500/20 to-orange-500/5",
    border: "border-orange-500/30",
    iconColor: "text-orange-400",
  },
  MOTION: {
    icon: FiActivity,
    gradient: "from-cyan-500/20 to-cyan-500/5",
    border: "border-cyan-500/30",
    iconColor: "text-cyan-400",
  },
};

/**
 * Alert toasts — slide in from the right when the backend emits an alert.
 */
export default function AlertToasts({ alerts, onDismiss }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full" id="alert-toasts">
      {alerts.slice(0, 5).map((alert) => {
        const config = ALERT_CONFIG[alert.type] || ALERT_CONFIG.CRYING;
        const Icon = config.icon;

        return (
          <div
            key={alert.id}
            className={`alert-enter rounded-xl border ${config.border} bg-gradient-to-r ${config.gradient} backdrop-blur-xl p-4 shadow-2xl`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${config.iconColor}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100">{alert.message}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => onDismiss(alert.id)}
                className="text-slate-500 hover:text-white transition-colors p-1"
              >
                <FiX size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
