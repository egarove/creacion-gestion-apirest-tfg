import type { Api } from "../types";
import { LANG_OPTS, DB_OPTS, MTH } from "../constants";
import { useState } from "react";
import { useContextStore } from "../contextZustand";

interface ApiCardProps {
  api: Api;
  toggleApi: (name: string, status: string) => Promise<void>;
  restoreApi: (name: string) => Promise<void>;
  openPanel: () => void;
  setDeleteTarget: () => void;
}

export default function ApiCard({
  api,
  toggleApi,
  restoreApi,
  openPanel,
  setDeleteTarget,
}: ApiCardProps) {
  const lang = api.language || "python";
  const lc = LANG_OPTS[lang] || LANG_OPTS["python"];
  const dc = DB_OPTS[api.db] || { icon: "🗄️", label: api.db };
  const eps = api.endpoints || [];
  const isRun = api.status === "running";
  const anyDown = api.status !== "running" || api.backup_status !== "running";
  const [toggleLoading, setToggleLoading] = useState(false);
  const context = useContextStore();

  const handleToggle = async () => {
    setToggleLoading(true);
    try {
      context.addToast({ msg: `${isRun ? "deteniendo api..." : "iniciando api..."}`, type: "info", id: crypto.randomUUID() });
      await toggleApi(api.api_name, api.status);
      setToggleLoading(false);
    } catch (error) {
      context.addToast({ msg: "Error al cambiar el estado de la API", type: "error", id: crypto.randomUUID() });
      setToggleLoading(false);
    }
  };

  const handleRestore = async () => {
    setToggleLoading(true);
    await restoreApi(api.api_name);
    setToggleLoading(false);
  };

  return (
    <div className="bg-card border border-borderNormal rounded-2xl overflow-hidden hover:border-borderLight hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.4)] transition-all relative flex flex-col">
      <div
        className="h-1 w-full"
        style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }}
      ></div>

      <div className="p-5 pb-3 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="text-lg font-bold text-textMain font-mono break-all">
            {api.api_name}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
            <div className="flex items-center gap-1.5 text-[10px] text-textMuted">
              <div
                className={`w-2 h-2 rounded-full ${api.status === "running" ? "bg-success animate-pulse-green" : "bg-danger"}`}
              ></div>{" "}
              main
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-textMuted">
              <div
                className={`w-2 h-2 rounded-full ${api.backup_status === "running" ? "bg-success animate-pulse-green" : "bg-danger"}`}
              ></div>{" "}
              backup
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${lc.bg} ${lc.color} border ${lc.border}`}
          >
            {lc.icon} {lc.label}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-primaryGlow text-indigo-300 border border-indigo-500/20">
            {dc.icon} {dc.label}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-warningBg text-warning border border-warning/20">
            :{api.port}
          </span>
          {eps.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-500/10 text-textSoft border border-slate-500/20">
              <i className="fas fa-code-branch"></i> {eps.length} ep
            </span>
          )}
          {api.generar_ui && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-successBg text-success border border-success/20">
              <i className="fas fa-desktop"></i> UI
            </span>
          )}
        </div>

        {/* Endpoint preview */}
        <div className="mb-3 min-h-[28px]">
          {eps.slice(0, 3).map((ep, i) => (
            <div
              key={i}
              className="flex items-center gap-2 mb-1 text-xs text-textSoft"
            >
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono min-w-[42px] text-center ${MTH[ep.method] || MTH["get"]}`}
              >
                {ep.method.toUpperCase()}
              </span>
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                {ep.path}
              </span>
            </div>
          ))}
          {eps.length > 3 && (
            <div className="text-primary text-xs font-bold mt-1">
              +{eps.length - 3} más
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-1 sm:gap-1.5 p-2 sm:p-3 bg-black/20 border-t border-borderNormal">
        <button
          onClick={handleToggle}
          disabled={toggleLoading}
          className={`flex items-center justify-center gap-1.5 border rounded-lg py-2 text-xs font-bold transition-colors ${isRun ? "text-warning border-warning/30 hover:bg-warningBg" : "text-success border-success/30 hover:bg-successBg"}`}
        >
          <i className={`fas fa-${isRun ? "stop" : "play"}`}></i>{" "}
          {isRun ? "Detener" : "Iniciar"}
        </button>
        <button
          disabled={!anyDown && toggleLoading}
          onClick={handleRestore}
          className={`flex items-center justify-center gap-1.5 border rounded-lg py-2 text-xs font-bold transition-colors ${anyDown && !toggleLoading ? "text-info border-info/30 hover:bg-infoBg" : "text-textSoft border-borderLight opacity-50 cursor-not-allowed"}`}
        >
          <i className="fas fa-undo"></i> Restaurar
        </button>
        <button
          onClick={openPanel}
          className="flex items-center justify-center gap-1.5 border border-primary/30 rounded-lg py-2 text-xs font-bold text-primary hover:bg-primaryGlow transition-colors"
        >
          <i className="fas fa-eye"></i> Detalle
        </button>
        {api.generar_ui ? (
          <button
            onClick={() => window.open(`/app/${api.api_name}/ui`, "_blank")}
            className="flex items-center justify-center w-9 border border-success/30 rounded-lg text-xs font-bold text-success hover:bg-successBg transition-colors"
            title="Abrir panel UI"
          >
            <i className="fas fa-external-link-alt"></i>
          </button>
        ) : (
          <span className="w-9"></span>
        )}
        <button
          onClick={setDeleteTarget}
          className="flex items-center justify-center w-9 border border-danger/30 rounded-lg text-xs font-bold text-danger hover:bg-dangerBg transition-colors"
        >
          <i className="fas fa-trash"></i>
        </button>
      </div>
    </div>
  );
}
