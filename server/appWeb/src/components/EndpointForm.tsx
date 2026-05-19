import type { Endpoint } from "../types";
import { STRICT_MATRIX, autoLogic } from "../services/apiService";

interface EndpointFormProps {
  newEndpoint: Endpoint;
  saving: boolean;
  onEndpointChange: (endpoint: Endpoint) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

const ALL_LOGICS = ["select", "insert", "update", "delete"];

export default function EndpointForm({
  newEndpoint,
  saving,
  onEndpointChange,
  onCancel,
  onSubmit,
}: EndpointFormProps) {
  const selCls =
    "w-full bg-bg border border-borderNormal rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary text-textMain cursor-pointer";
  const inpCls =
    "w-full bg-bg border border-borderNormal rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary text-textMain font-mono";

  const allowed = STRICT_MATRIX[newEndpoint.method.toLowerCase()] ?? [];

  const handleMethodChange = (method: string) => {
    onEndpointChange({ ...newEndpoint, method, logic: autoLogic(method) });
  };

  return (
    <div className="bg-card border border-borderNormal rounded-xl p-4 mb-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] text-textMuted font-bold uppercase mb-1">
            Método
          </div>
          <select
            value={newEndpoint.method}
            onChange={(e) => handleMethodChange(e.target.value)}
            className={selCls}
          >
            {["get", "post", "put", "delete"].map((m) => (
              <option key={m} value={m}>
                {m.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-[10px] text-textMuted font-bold uppercase mb-1">
            Lógica DB
          </div>
          <select
            value={newEndpoint.logic}
            onChange={(e) =>
              onEndpointChange({ ...newEndpoint, logic: e.target.value })
            }
            className={selCls}
          >
            {ALL_LOGICS.map((l) => (
              <option key={l} value={l} disabled={!allowed.includes(l)}>
                {l}{!allowed.includes(l) ? " ✗" : ""}
              </option>
            ))}
          </select>
          <p className="text-[9px] text-textMuted mt-1">
            {newEndpoint.method.toUpperCase()} permite: {allowed.join(", ")}
          </p>
        </div>
      </div>
      <div>
        <div className="text-[10px] text-textMuted font-bold uppercase mb-1">
          Path
        </div>
        <input
          value={newEndpoint.path}
          onChange={(e) =>
            onEndpointChange({ ...newEndpoint, path: e.target.value })
          }
          className={inpCls}
          placeholder="/usuarios"
        />
      </div>
      <div>
        <div className="text-[10px] text-textMuted font-bold uppercase mb-1">
          Nombre función
        </div>
        <input
          value={newEndpoint.function_name}
          onChange={(e) =>
            onEndpointChange({
              ...newEndpoint,
              function_name: e.target.value.replace(/\s/g, ""),
            })
          }
          className={inpCls}
          placeholder="get_usuarios"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 items-center">
        <div>
          <div className="text-[10px] text-textMuted font-bold uppercase mb-1">
            Tabla (opcional)
          </div>
          <input
            value={newEndpoint.table ?? ''}
            onChange={(e) =>
              onEndpointChange({ ...newEndpoint, table: e.target.value || undefined })
            }
            className={inpCls}
            placeholder="Tabla principal (predeterminada)"
          />
        </div>
        <div className="flex items-center justify-between bg-bg border border-borderNormal rounded-lg px-3 py-2 mt-4">
          <span className="text-xs text-textSoft font-semibold">Público</span>
          <button
            onClick={() => onEndpointChange({ ...newEndpoint, is_public: !newEndpoint.is_public })}
            className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${newEndpoint.is_public ? 'bg-primary' : 'bg-borderNormal'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${newEndpoint.is_public ? 'left-4' : 'left-0.5'}`}></span>
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg border border-borderLight text-textSoft text-xs font-semibold hover:text-textMain"
        >
          Cancelar
        </button>
        <button
          onClick={onSubmit}
          disabled={saving}
          className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Añadir"}
        </button>
      </div>
    </div>
  );
}
