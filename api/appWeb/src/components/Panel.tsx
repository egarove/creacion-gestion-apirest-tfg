import { useState, useEffect } from 'react';
import type { Api, Endpoint, Toast } from '../types';
import { LANG_OPTS, DB_OPTS, MTH } from '../constants';
import { getLogs, addEndpoint } from '../services/apiService';

interface PanelProps {
  api: Api;
  close: () => void;
  toggleApi: (name: string, status: string) => void;
  restoreApi: (name: string) => void;
  showToast: (msg: string, type?: Toast['type']) => void;
  reload: () => void;
}

export default function Panel({ api, close, toggleApi, restoreApi, showToast, reload }: PanelProps) {
  const [tab, setTab] = useState<string>('info');
  const [logs, setLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [addingEp, setAddingEp] = useState<boolean>(false);
  const [newEp, setNewEp] = useState<Endpoint>({ method: 'get', path: '/', function_name: 'get_items', logic: 'select' });
  const [savingEp, setSavingEp] = useState(false);

  const eps = api.endpoints || [];
  const cols = api.columns || [];
  const lang = api.language || 'python';
  const lc = LANG_OPTS[lang] || LANG_OPTS['python'];
  const dc = DB_OPTS[api.db] || { icon: '🗄️', label: api.db };
  const isRun = api.status === 'running';
  const anyDown = api.status !== 'running' || api.backup_status !== 'running';

  const fetchLogs = async () => {
    setLogsLoading(true);
    setLogs(await getLogs(api.api_name));
    setLogsLoading(false);
  };

  useEffect(() => {
    if (tab === 'logs') fetchLogs();
  }, [tab]);

  const handleAddEndpoint = async () => {
    if (!newEp.path.startsWith('/')) { showToast('El path debe empezar por /', 'error'); return; }
    if (!newEp.function_name || /\s/.test(newEp.function_name)) { showToast('Nombre de función inválido', 'error'); return; }
    setSavingEp(true);
    try {
      await addEndpoint(api.api_name, newEp);
      showToast('Endpoint añadido · Reconstruyendo contenedor...', 'success');
      setAddingEp(false);
      setNewEp({ method: 'get', path: '/', function_name: 'get_items', logic: 'select' });
      setTimeout(reload, 5000);
    } catch (e) {
      showToast('Error: ' + (e instanceof Error ? e.message : String(e)), 'error');
    }
    setSavingEp(false);
  };

  const selCls = 'w-full bg-bg border border-borderNormal rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary text-textMain cursor-pointer';
  const inpCls = 'w-full bg-bg border border-borderNormal rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary text-textMain font-mono';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[190] backdrop-blur-[2px]" onClick={close}></div>
      <div className="fixed top-0 right-0 w-[520px] h-screen bg-surface border-l border-borderNormal z-[200] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="p-5 border-b border-borderNormal flex items-start gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold font-mono break-all">{api.api_name}</div>
            <div className="flex items-center gap-4 mt-1.5">
              <span className="flex items-center gap-1.5 text-xs text-textMuted">
                <span className={`w-2 h-2 rounded-full ${api.status === 'running' ? 'bg-success' : 'bg-danger'}`}></span> main :{api.port}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-textMuted">
                <span className={`w-2 h-2 rounded-full ${api.backup_status === 'running' ? 'bg-success' : 'bg-danger'}`}></span> backup :{api.backup_port}
              </span>
            </div>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-lg bg-card border border-borderNormal flex items-center justify-center text-textSoft hover:text-textMain shrink-0">
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-borderNormal shrink-0">
          {[['info', 'Información'], ['endpoints', `Endpoints (${eps.length})`], ['logs', 'Logs']].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors ${tab === t ? 'border-b-2 border-primary text-primary' : 'text-textMuted hover:text-textSoft'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* Info tab */}
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${lc.bg} ${lc.color} border ${lc.border}`}>{lc.icon} {lc.label}</span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primaryGlow text-indigo-300 border border-indigo-500/20">{dc.icon} {dc.label}</span>
                {api.generar_ui && <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-successBg text-success border border-success/20"><i className="fas fa-desktop mr-1"></i>UI</span>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-borderNormal rounded-xl p-3">
                  <div className="text-[10px] text-textMuted uppercase font-bold mb-1">Puerto principal</div>
                  <div className="text-xl font-bold text-textMain font-mono">{api.port}</div>
                </div>
                <div className="bg-card border border-borderNormal rounded-xl p-3">
                  <div className="text-[10px] text-textMuted uppercase font-bold mb-1">Puerto backup</div>
                  <div className="text-xl font-bold text-textMain font-mono">{api.backup_port || '—'}</div>
                </div>
              </div>
              {cols.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-2">Columnas</div>
                  <div className="flex flex-wrap gap-1.5">
                    {cols.map((c, i) => (
                      <span key={i} className="px-2 py-1 bg-card border border-borderNormal rounded-md text-xs text-textSoft font-mono">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => toggleApi(api.api_name, api.status)} className={`py-2.5 rounded-xl border text-xs font-bold transition-colors ${isRun ? 'border-warning/30 text-warning hover:bg-warningBg' : 'border-success/30 text-success hover:bg-successBg'}`}>
                  <i className={`fas fa-${isRun ? 'stop' : 'play'} mr-1.5`}></i>{isRun ? 'Detener' : 'Iniciar'}
                </button>
                <button disabled={!anyDown} onClick={() => restoreApi(api.api_name)} className={`py-2.5 rounded-xl border text-xs font-bold transition-colors ${anyDown ? 'border-info/30 text-info hover:bg-infoBg' : 'border-borderLight text-textSoft opacity-40 cursor-not-allowed'}`}>
                  <i className="fas fa-undo mr-1.5"></i>Restaurar
                </button>
                {api.generar_ui && (
                  <button onClick={() => window.open(`/app/${api.api_name}/ui`, '_blank')} className="col-span-2 py-2.5 rounded-xl border border-success/30 text-success text-xs font-bold hover:bg-successBg transition-colors">
                    <i className="fas fa-external-link-alt mr-1.5"></i>Abrir panel UI
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Endpoints tab */}
          {tab === 'endpoints' && (
            <div>
              {eps.length === 0 && !addingEp && (
                <div className="text-center text-textMuted text-sm py-8">Sin endpoints definidos</div>
              )}
              <div className="space-y-2 mb-3">
                {eps.map((ep, i) => (
                  <div key={i} className="bg-card border border-borderNormal rounded-xl p-3 flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold font-mono min-w-[44px] text-center ${MTH[ep.method] || MTH['get']}`}>{ep.method.toUpperCase()}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono text-textMain truncate">{ep.path}</div>
                      <div className="text-[11px] text-textMuted">{ep.function_name} · {ep.logic}</div>
                    </div>
                  </div>
                ))}
              </div>
              {addingEp && (
                <div className="bg-card border border-borderNormal rounded-xl p-4 mb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-textMuted font-bold uppercase mb-1">Método</div>
                      <select value={newEp.method} onChange={e => setNewEp(p => ({ ...p, method: e.target.value }))} className={selCls}>
                        {['get', 'post', 'put', 'delete'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="text-[10px] text-textMuted font-bold uppercase mb-1">Lógica</div>
                      <select value={newEp.logic} onChange={e => setNewEp(p => ({ ...p, logic: e.target.value }))} className={selCls}>
                        {['select', 'insert', 'update', 'delete'].map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-textMuted font-bold uppercase mb-1">Path</div>
                    <input value={newEp.path} onChange={e => setNewEp(p => ({ ...p, path: e.target.value }))} className={inpCls} placeholder="/usuarios" />
                  </div>
                  <div>
                    <div className="text-[10px] text-textMuted font-bold uppercase mb-1">Nombre función</div>
                    <input value={newEp.function_name} onChange={e => setNewEp(p => ({ ...p, function_name: e.target.value.replace(/\s/g, '') }))} className={inpCls} placeholder="get_usuarios" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setAddingEp(false)} className="flex-1 py-2 rounded-lg border border-borderLight text-textSoft text-xs font-semibold hover:text-textMain">Cancelar</button>
                    <button onClick={handleAddEndpoint} disabled={savingEp} className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-60">
                      {savingEp ? 'Guardando...' : 'Añadir'}
                    </button>
                  </div>
                </div>
              )}
              {!addingEp && (
                <button onClick={() => setAddingEp(true)} className="w-full py-2.5 rounded-xl border border-dashed border-borderNormal text-textMuted hover:text-primary hover:border-primary text-xs font-semibold transition-colors">
                  <i className="fas fa-plus mr-1.5"></i>Nuevo endpoint
                </button>
              )}
            </div>
          )}

          {/* Logs tab */}
          {tab === 'logs' && (
            <div>
              <div className="flex justify-end mb-2">
                <button onClick={fetchLogs} className="text-xs text-primary hover:text-purple-300 transition-colors">
                  <i className="fas fa-sync-alt mr-1"></i>Recargar
                </button>
              </div>
              {logsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-borderNormal border-t-primary rounded-full animate-spin"></div>
                </div>
              ) : (
                <pre className="bg-card border border-borderNormal rounded-xl p-4 text-[11px] text-textSoft font-mono overflow-x-auto whitespace-pre-wrap max-h-[65vh] overflow-y-auto">{logs}</pre>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
