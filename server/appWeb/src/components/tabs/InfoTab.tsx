import type { Api } from "../../types";
import { LANG_OPTS, DB_OPTS } from "../../constants";
import { useState } from "react";
import { useContextStore } from "../../contextZustand";

interface InfoTabProps {
  api: Api;
  onToggleApi: (name: string, status: string) => Promise<void>;
  onRestoreApi: (name: string) => Promise<void>;
}

export default function InfoTab({
  api,
  onToggleApi,
  onRestoreApi,
}: InfoTabProps) {
  const cols = api.columns || [];
  const lang = api.language || "python";
  const lc = LANG_OPTS[lang] || LANG_OPTS["python"];
  const dc = DB_OPTS[api.db] || { icon: "🗄️", label: api.db };
  const isRun = api.status === "running";
  const [toggleLoading, setToggleLoading] = useState(false);
  const context = useContextStore();
  const handleToggle = async () => {
    setToggleLoading(true);
    try {
      context.addToast({
        msg: `${isRun ? "deteniendo api..." : "iniciando api..."}`,
        type: "info",
        id: crypto.randomUUID(),
      });
      await onToggleApi(api.api_name, api.status);
      setToggleLoading(false);
    } catch (error) {
      context.addToast({
        msg: "Error al cambiar el estado de la API",
        type: "error",
        id: crypto.randomUUID(),
      });
      setToggleLoading(false);
    }
  };

  const handleRestore = async () => {
    setToggleLoading(true);
    await onRestoreApi(api.api_name);
    setToggleLoading(false);
  };

  const anyDown = api.status !== "running" || api.backup_status !== "running";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${lc.bg} ${lc.color} border ${lc.border}`}
        >
          {lc.icon} {lc.label}
        </span>
        <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primaryGlow text-indigo-300 border border-indigo-500/20">
          {dc.icon} {dc.label}
        </span>
        {api.generar_ui && (
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-successBg text-success border border-success/20">
            <i className="fas fa-desktop mr-1"></i>UI
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-borderNormal rounded-xl p-3">
          <div className="text-[10px] text-textMuted uppercase font-bold mb-1">
            Puerto principal
          </div>
          <div className="text-xl font-bold text-textMain font-mono">
            {api.port}
          </div>
        </div>
        <div className="bg-card border border-borderNormal rounded-xl p-3">
          <div className="text-[10px] text-textMuted uppercase font-bold mb-1">
            Puerto backup
          </div>
          <div className="text-xl font-bold text-textMain font-mono">
            {api.backup_port || "—"}
          </div>
        </div>
      </div>

      {cols.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-2">
            Columnas
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cols.map((c, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-card border border-borderNormal rounded-md text-xs text-textSoft font-mono"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={handleToggle}
          disabled={toggleLoading}
          className={`py-2.5 rounded-xl border text-xs font-bold transition-colors ${
            isRun
              ? "border-warning/30 text-warning hover:bg-warningBg"
              : "border-success/30 text-success hover:bg-successBg"
          }`}
        >
          <i className={`fas fa-${isRun ? "stop" : "play"} mr-1.5`}></i>
          {isRun ? "Detener" : "Iniciar"}
        </button>
        <button
          disabled={!anyDown && toggleLoading}
          onClick={handleRestore}
          className={`py-2.5 rounded-xl border text-xs font-bold transition-colors ${
            anyDown && !toggleLoading
              ? "border-info/30 text-info hover:bg-infoBg"
              : "border-borderLight text-textSoft opacity-40 cursor-not-allowed"
          }`}
        >
          <i className="fas fa-undo mr-1.5"></i>Restaurar
        </button>
        {api.generar_ui && (
          <button
            onClick={() => window.open(`/app/${api.api_name}/ui`, "_blank")}
            className="col-span-2 py-2.5 rounded-xl border border-success/30 text-success text-xs font-bold hover:bg-successBg transition-colors"
          >
            <i className="fas fa-external-link-alt mr-1.5"></i>Abrir panel UI
          </button>
        )}
      </div>
    </div>
  );
}
