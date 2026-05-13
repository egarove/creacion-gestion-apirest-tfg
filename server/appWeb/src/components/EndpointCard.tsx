import type { Endpoint } from "../types";
import { MTH } from "../constants";

interface EndpointCardProps {
  endpoint: Endpoint;
}

export default function EndpointCard({ endpoint }: EndpointCardProps) {
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
        </div>
      </div>
    </div>
  );
}
