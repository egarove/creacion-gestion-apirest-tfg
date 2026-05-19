import type { Endpoint } from "../types";
import { MTH } from "../constants";

interface EndpointCardProps {
  endpoint: Endpoint;
  onDelete?: () => void;
}

export default function EndpointCard({ endpoint, onDelete }: EndpointCardProps) {
  return (
    <div className="bg-card border border-borderNormal rounded-xl p-3 flex items-center gap-3">
      <span
        className={`px-2 py-1 rounded text-[10px] font-bold font-mono min-w-[44px] text-center ${
          MTH[endpoint.method] || MTH["get"]
        }`}
      >
        {endpoint.method.toUpperCase()}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-mono text-textMain truncate">
          {endpoint.path}
        </div>
        <div className="text-[11px] text-textMuted">
          {endpoint.function_name} · {endpoint.logic}
          {endpoint.table ? ` · tabla: ${endpoint.table}` : ''}
        </div>
      </div>
      {endpoint.is_public ? (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/30 shrink-0">PUB</span>
      ) : (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30 shrink-0">PRIV</span>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-danger hover:bg-danger/10 transition-colors shrink-0"
          title="Eliminar endpoint"
        >
          <i className="fas fa-trash text-xs"></i>
        </button>
      )}
    </div>
  );
}
