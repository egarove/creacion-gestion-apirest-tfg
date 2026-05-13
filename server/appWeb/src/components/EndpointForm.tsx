import type { Endpoint, Toast } from "../types";

interface EndpointFormProps {
  newEndpoint: Endpoint;
  saving: boolean;
  onEndpointChange: (endpoint: Endpoint) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

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

  return (
    <div className="bg-card border border-borderNormal rounded-xl p-4 mb-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] text-textMuted font-bold uppercase mb-1">
            Método
          </div>
          <select
            value={newEndpoint.method}
            onChange={(e) =>
              onEndpointChange({ ...newEndpoint, method: e.target.value })
            }
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
            Lógica
          </div>
          <select
            value={newEndpoint.logic}
            onChange={(e) =>
              onEndpointChange({ ...newEndpoint, logic: e.target.value })
            }
            className={selCls}
          >
            {["select", "insert", "update", "delete"].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
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
