import StatusIndicator from "./StatusIndicator";

interface PanelHeaderProps {
  apiName: string;
  port: number;
  backupPort: number;
  status: string;
  backupStatus: string;
  onClose: () => void;
}

export default function PanelHeader({
  apiName,
  port,
  backupPort,
  status,
  backupStatus,
  onClose,
}: PanelHeaderProps) {
  return (
    <div className="p-5 border-b border-borderNormal flex items-start gap-3 shrink-0">
      <div className="flex-1 min-w-0">
        <div className="text-base font-bold font-mono break-all">{apiName}</div>
        <div className="flex items-center gap-4 mt-1.5">
          <span className="flex items-center gap-1.5 text-xs text-textMuted">
            <StatusIndicator
              status={status === "running" ? "running" : "stopped"}
            />
            main :{port}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-textMuted">
            <StatusIndicator
              status={backupStatus === "running" ? "running" : "stopped"}
            />
            backup :{backupPort}
          </span>
        </div>
      </div>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-lg bg-card border border-borderNormal flex items-center justify-center text-textSoft hover:text-textMain shrink-0"
      >
        <i className="fas fa-times text-sm"></i>
      </button>
    </div>
  );
}
