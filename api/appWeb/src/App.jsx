import { useState, useEffect, useRef } from 'react';

const LANG_OPTS = {
  python:     { icon:'🐍', label:'Python',     color:'text-[#3776AB]', bg:'bg-[rgba(55,118,171,.2)]', border:'border-[rgba(55,118,171,.3)]' },
  typescript: { icon:'📘', label:'TypeScript', color:'text-[#5ba3f5]', bg:'bg-[rgba(49,120,198,.2)]', border:'border-[rgba(49,120,198,.3)]' },
  go:         { icon:'🐹', label:'Go',         color:'text-[#00d4ff]', bg:'bg-[rgba(0,173,216,.15)]', border:'border-[rgba(0,173,216,.25)]' },
  rust:       { icon:'🦀', label:'Rust',       color:'text-[#ff7a3d]', bg:'bg-[rgba(206,74,24,.2)]', border:'border-[rgba(206,74,24,.3)]' },
  java:       { icon:'☕', label:'Java',       color:'text-[#ffb347]', bg:'bg-[rgba(237,139,0,.2)]', border:'border-[rgba(237,139,0,.3)]' },
  c:          { icon:'⚙️', label:'C',          color:'text-[#bdd0e0]', bg:'bg-[rgba(168,185,204,.15)]', border:'border-[rgba(168,185,204,.25)]' },
  cpp:        { icon:'🔧', label:'C++',        color:'text-[#5b9bd5]', bg:'bg-[rgba(0,89,156,.2)]', border:'border-[rgba(0,89,156,.3)]' },
};
const DB_OPTS = {
  postgresql:{ icon:'🐘', label:'PostgreSQL' },
  mysql:     { icon:'🐬', label:'MySQL' },
  mariadb:   { icon:'🦁', label:'MariaDB' },
  sqlite:    { icon:'📦', label:'SQLite' },
};
const MTH = {
  get:'bg-[rgba(34,197,94,.15)] text-[#4ade80]',
  post:'bg-[rgba(59,130,246,.15)] text-[#60a5fa]',
  put:'bg-[rgba(245,158,11,.15)] text-[#fbbf24]',
  delete:'bg-[rgba(239,68,68,.15)] text-[#f87171]'
};

export default function App() {
  const [apis, setApis] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [dbFilter, setDbFilter] = useState('');
  const [sortParam, setSortParam] = useState('name');

  const [loadingMsg, setLoadingMsg] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastIdSeq = useRef(0);

  const [panelApi, setPanelApi] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const runCount = apis.filter(a => a.status === 'running').length;
  const stopCount = apis.length - runCount;
  const epsCount = apis.reduce((s, x) => s + (x.endpoints || []).length, 0);

  const fetchApis = async (manual = false) => {
    try {
      const res = await fetch('/get-all-apis');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setApis(data);
      if (panelApi) {
        const updated = data.find(a => a.api_name === panelApi.api_name);
        if (updated) setPanelApi(updated);
      }
      if (manual) showToast('APIs actualizadas', 'success');
    } catch (err) {
      showToast('Error al cargar APIs: ' + err.message, 'error');
    }
  };

  useEffect(() => {
    fetchApis();
    const interval = setInterval(() => fetchApis(), 15000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg, type = 'info') => {
    const id = toastIdSeq.current++;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const showLoading = (msg) => setLoadingMsg(msg);
  const hideLoading = () => setLoadingMsg(null);

  const toggleApi = async (name, status) => {
    const action = status === 'running' ? 'stop' : 'start';
    try {
      await fetch(`/${name}/${action}`, { method: 'POST' });
      showToast(`API ${name} ${action === 'stop' ? 'detenida' : 'iniciada'}`, 'success');
      fetchApis();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  const restoreApi = async (name) => {
    try {
      await fetch(`/${name}/restore`, { method: 'POST' });
      showToast(`Restaurando ${name}...`, 'info');
      setTimeout(fetchApis, 3000);
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  const deleteApi = async () => {
    showLoading(`Eliminando ${deleteTarget}...`);
    try {
      await fetch(`/${deleteTarget}/delete`, { method: 'POST' });
      showToast(`API ${deleteTarget} eliminada`, 'success');
      setDeleteTarget(null);
      if (panelApi?.api_name === deleteTarget) setPanelApi(null);
      fetchApis();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
    hideLoading();
  };

  let displayedApis = [...apis];
  if (filter === 'running') displayedApis = displayedApis.filter(a => a.status === 'running');
  if (filter === 'stopped') displayedApis = displayedApis.filter(a => a.status !== 'running');
  if (search) displayedApis = displayedApis.filter(a => a.api_name.includes(search.toLowerCase()));
  if (langFilter) displayedApis = displayedApis.filter(a => (a.language || 'python') === langFilter);
  if (dbFilter) displayedApis = displayedApis.filter(a => a.db === dbFilter);

  if (sortParam === 'name') displayedApis.sort((a,b) => a.api_name.localeCompare(b.api_name));
  else if (sortParam === 'status') displayedApis.sort((a,b) => (a.status === 'running' ? 0 : 1) - (b.status === 'running' ? 0 : 1));
  else if (sortParam === 'port') displayedApis.sort((a,b) => a.port - b.port);
  else if (sortParam === 'eps') displayedApis.sort((a,b) => (b.endpoints || []).length - (a.endpoints || []).length);

  return (
    <div className="flex bg-bg text-textMain min-h-screen font-sans no-scrollbar">
      {/* SIDEBAR */}
      <aside className="fixed top-0 left-0 w-[270px] h-screen bg-surface border-r border-borderNormal flex flex-col z-50">
        <div className="p-6 pb-4 flex items-center gap-3 border-b border-borderNormal">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-500 rounded-xl flex items-center justify-center text-white shrink-0">
            <i className="fas fa-bolt text-lg"></i>
          </div>
          <div>
            <div className="font-extrabold text-lg text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-300">APIGen Master</div>
            <div className="text-xs text-textMuted mt-0.5">Console v2.0</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 no-scrollbar">
          <div className="text-[10px] font-bold tracking-widest text-textMuted uppercase px-3 py-2 mt-2">Principal</div>
          <button className="flex items-center w-full gap-3 px-4 py-3 rounded-xl bg-primaryGlow text-white mb-1 transition-colors text-sm font-medium text-left">
            <i className="fas fa-th-large w-5 text-center text-primary"></i> Dashboard
            <span className="ml-auto bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{apis.length}</span>
          </button>
          <a href="/docs" target="_blank" className="flex items-center w-full gap-3 px-4 py-3 rounded-xl text-textSoft hover:bg-white/5 hover:text-textMain mb-1 transition-colors text-sm font-medium text-left">
            <i className="fas fa-book-open w-5 text-center"></i> Swagger UI
          </a>
          <div className="text-[10px] font-bold tracking-widest text-textMuted uppercase px-3 py-2 mt-4">Herramientas</div>
          <button onClick={() => fetchApis(true)} className="flex items-center w-full gap-3 px-4 py-3 rounded-xl text-textSoft hover:bg-white/5 hover:text-textMain mb-1 transition-colors text-sm font-medium text-left">
            <i className="fas fa-sync-alt w-5 text-center"></i> Refrescar todo
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center w-full gap-3 px-4 py-3 rounded-xl text-textSoft hover:bg-white/5 hover:text-textMain mb-1 transition-colors text-sm font-medium text-left">
            <i className="fas fa-plus-circle w-5 text-center"></i> Nueva API
          </button>
        </nav>
        <div className="p-5 border-t border-borderNormal">
          <div className="flex justify-between py-1.5 text-xs text-textSoft">
            <span><i className="fas fa-circle text-[10px] text-success mr-2"></i>En ejecución</span>
            <span className="font-bold text-success">{runCount}</span>
          </div>
          <div className="flex justify-between py-1.5 text-xs text-textSoft">
            <span><i className="fas fa-circle text-[10px] text-danger mr-2"></i>Detenidas</span>
            <span className="font-bold text-danger">{stopCount}</span>
          </div>
          <div className="flex justify-between py-1.5 text-xs text-textSoft">
            <span><i className="fas fa-code-branch text-[10px] text-primary mr-2"></i>Endpoints</span>
            <span className="font-bold text-textMain">{epsCount}</span>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="ml-[270px] flex-1 p-8 min-h-screen">
        <header className="flex flex-wrap items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold leading-none">Panel de Control</h1>
            <p className="text-sm text-textMuted mt-1">{apis.length} APIs · {runCount} en ejecución · {epsCount} endpoints</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-textMuted text-sm"></i>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                type="text" placeholder="Buscar API..."
                className="bg-card border border-borderNormal rounded-xl py-2.5 pr-4 pl-10 text-sm w-60 focus:border-primary focus:ring-2 focus:ring-primaryGlow outline-none transition-all text-textMain"
              />
            </div>
            <button onClick={() => fetchApis(true)} className="bg-card border border-borderNormal rounded-xl px-4 py-2.5 text-textSoft hover:text-textMain hover:border-borderLight transition-all flex items-center gap-2 text-sm">
              <i className="fas fa-sync-alt"></i>
            </button>
            <button onClick={() => setShowCreate(true)} className="bg-gradient-to-br from-primary to-purple-500 rounded-xl px-5 py-2.5 text-white font-bold text-sm shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] hover:-translate-y-px transition-all flex items-center gap-2">
              <i className="fas fa-plus"></i> Nueva API
            </button>
          </div>
        </header>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard icon="fa-layer-group" label="Total APIs" value={apis.length} color="purple" />
          <StatCard icon="fa-play-circle" label="En ejecución" value={runCount} color="green" />
          <StatCard icon="fa-stop-circle" label="Detenidas / Error" value={stopCount} color="red" />
          <StatCard icon="fa-code-branch" label="Total Endpoints" value={epsCount} color="blue" />
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex bg-card border border-borderNormal rounded-xl overflow-hidden">
            {['all', 'running', 'stopped'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${filter === f ? 'bg-primary text-white' : 'text-textMuted hover:text-textMain'}`}>
                {f === 'all' ? 'Todas' : f === 'running' ? 'En ejecución' : 'Detenidas'}
              </button>
            ))}
          </div>
          <select value={langFilter} onChange={e => setLangFilter(e.target.value)} className="bg-card border border-borderNormal rounded-xl px-3 py-2 text-xs text-textSoft outline-none cursor-pointer focus:border-primary">
            <option value="">Todos los lenguajes</option>
            {Object.keys(LANG_OPTS).map(k => <option key={k} value={k}>{LANG_OPTS[k].label}</option>)}
          </select>
          <select value={dbFilter} onChange={e => setDbFilter(e.target.value)} className="bg-card border border-borderNormal rounded-xl px-3 py-2 text-xs text-textSoft outline-none cursor-pointer focus:border-primary">
            <option value="">Todas las BD</option>
            {Object.keys(DB_OPTS).map(k => <option key={k} value={k}>{DB_OPTS[k].label}</option>)}
          </select>
          <select value={sortParam} onChange={e => setSortParam(e.target.value)} className="bg-card border border-borderNormal rounded-xl px-3 py-2 text-xs text-textSoft outline-none cursor-pointer focus:border-primary">
            <option value="name">Ordenar: Nombre</option>
            <option value="status">Ordenar: Estado</option>
            <option value="port">Ordenar: Puerto</option>
            <option value="eps">Ordenar: Endpoints</option>
          </select>
          <span className="ml-auto text-xs text-textMuted">{displayedApis.length} de {apis.length} APIs</span>
        </div>

        {displayedApis.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 bg-card border-2 border-dashed border-borderNormal rounded-2xl gap-4 text-center">
            <div className="text-5xl text-borderLight"><i className="fas fa-wind"></i></div>
            <h3 className="text-lg text-textSoft">{apis.length === 0 ? 'No hay APIs creadas' : 'Sin resultados'}</h3>
            <p className="text-sm text-textMuted">{apis.length === 0 ? 'Pulsa "+ Nueva API" para crear tu primera.' : 'Ajusta los filtros.'}</p>
            {apis.length === 0 && <button onClick={() => setShowCreate(true)} className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-primary to-purple-500 text-white font-bold text-sm"><i className="fas fa-plus mr-2"></i>Nueva API</button>}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-5">
            {displayedApis.map(api => (
              <ApiCard
                key={api.api_name}
                api={api}
                toggleApi={toggleApi}
                restoreApi={restoreApi}
                openPanel={() => setPanelApi(api)}
                setDeleteTarget={() => setDeleteTarget(api.api_name)}
              />
            ))}
          </div>
        )}
      </main>

      {panelApi && (
        <Panel
          api={panelApi}
          close={() => setPanelApi(null)}
          toggleApi={toggleApi}
          restoreApi={restoreApi}
          showToast={showToast}
          reload={fetchApis}
        />
      )}
      {showCreate && (
        <CreateModal
          close={() => setShowCreate(false)}
          reload={fetchApis}
          showLoading={showLoading}
          hideLoading={hideLoading}
          showToast={showToast}
        />
      )}
      {deleteTarget && (
        <DeleteModal target={deleteTarget} close={() => setDeleteTarget(null)} confirm={deleteApi} />
      )}

      <div className="fixed bottom-6 right-6 z-[500] flex flex-col-reverse gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`bg-card border border-borderLight rounded-xl px-5 py-3.5 flex items-center gap-3 text-sm font-medium min-w-[260px] max-w-[360px] pointer-events-auto shadow-[0_8px_30px_rgba(0,0,0,0.5)] animate-toast-in border-l-4 ${t.type === 'success' ? 'border-l-success' : t.type === 'error' ? 'border-l-danger' : 'border-l-info'}`}>
            <div className="text-base shrink-0">
              {t.type === 'success' && <i className="fas fa-check-circle text-success"></i>}
              {t.type === 'error' && <i className="fas fa-exclamation-circle text-danger"></i>}
              {t.type === 'info' && <i className="fas fa-info-circle text-info"></i>}
            </div>
            <div className="flex-1 text-textMain">{t.msg}</div>
          </div>
        ))}
      </div>

      {loadingMsg && (
        <div className="fixed inset-0 bg-[#060b14]/85 z-[400] flex flex-col items-center justify-center gap-4">
          <div className="w-11 h-11 border-4 border-borderNormal border-t-primary rounded-full animate-spin-custom"></div>
          <div className="text-textSoft text-sm text-center max-w-[300px]">{loadingMsg}</div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    purple: 'bg-primaryGlow text-primary',
    green: 'bg-successBg text-success',
    red: 'bg-dangerBg text-danger',
    blue: 'bg-infoBg text-info'
  };
  return (
    <div className="bg-card border border-borderNormal rounded-2xl p-5 flex items-center gap-4 hover:border-borderLight hover:-translate-y-0.5 transition-all">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${colors[color]}`}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div>
        <div className="text-xs text-textMuted font-medium">{label}</div>
        <div className="text-3xl font-extrabold leading-none text-textMain mt-1">{value}</div>
      </div>
    </div>
  );
}

function ApiCard({ api, toggleApi, restoreApi, openPanel, setDeleteTarget }) {
  const lang = api.language || 'python';
  const lc = LANG_OPTS[lang] || LANG_OPTS.python;
  const dc = DB_OPTS[api.db] || { icon:'🗄️', label: api.db };
  const eps = api.endpoints || [];
  const isRun = api.status === 'running';
  const anyDown = api.status !== 'running' || api.backup_status !== 'running';

  return (
    <div className="bg-card border border-borderNormal rounded-2xl overflow-hidden hover:border-borderLight hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.4)] transition-all relative flex flex-col">
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }}></div>
      <div className="p-5 pb-3 flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="text-lg font-bold text-textMain font-mono break-all">{api.api_name}</div>
          <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
            <div className="flex items-center gap-1.5 text-[10px] text-textMuted">
              <div className={`w-2 h-2 rounded-full ${api.status === 'running' ? 'bg-success animate-pulse-green' : 'bg-danger'}`}></div> main
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-textMuted">
              <div className={`w-2 h-2 rounded-full ${api.backup_status === 'running' ? 'bg-success animate-pulse-green' : 'bg-danger'}`}></div> backup
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${lc.bg} ${lc.color} border ${lc.border}`}>{lc.icon} {lc.label}</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-primaryGlow text-indigo-300 border border-indigo-500/20">{dc.icon} {dc.label}</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-warningBg text-warning border border-warning/20">:{api.port}</span>
          {eps.length > 0 && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-500/10 text-textSoft border border-slate-500/20"><i className="fas fa-code-branch"></i> {eps.length} ep</span>}
          {api.generar_ui && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-successBg text-success border border-success/20"><i className="fas fa-desktop"></i> UI</span>}
        </div>
        <div className="mb-3 min-h-[28px]">
          {eps.slice(0, 3).map((ep, i) => (
            <div key={i} className="flex items-center gap-2 mb-1 text-xs text-textSoft">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono min-w-[42px] text-center ${MTH[ep.method] || MTH.get}`}>{ep.method.toUpperCase()}</span>
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">{ep.path}</span>
            </div>
          ))}
          {eps.length > 3 && <div className="text-primary text-xs font-bold mt-1">+{eps.length - 3} más</div>}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-1.5 p-3 bg-black/20 border-t border-borderNormal">
        <button onClick={() => toggleApi(api.api_name, api.status)} className={`flex items-center justify-center gap-1.5 border rounded-lg py-2 text-xs font-bold transition-colors ${isRun ? 'text-warning border-warning/30 hover:bg-warningBg' : 'text-success border-success/30 hover:bg-successBg'}`}>
          <i className={`fas fa-${isRun ? 'stop' : 'play'}`}></i> {isRun ? 'Detener' : 'Iniciar'}
        </button>
        <button disabled={!anyDown} onClick={() => restoreApi(api.api_name)} className={`flex items-center justify-center gap-1.5 border rounded-lg py-2 text-xs font-bold transition-colors ${anyDown ? 'text-info border-info/30 hover:bg-infoBg' : 'text-textSoft border-borderLight opacity-50 cursor-not-allowed'}`}>
          <i className="fas fa-undo"></i> Restaurar
        </button>
        <button onClick={openPanel} className="flex items-center justify-center gap-1.5 border border-primary/30 rounded-lg py-2 text-xs font-bold text-primary hover:bg-primaryGlow transition-colors">
          <i className="fas fa-eye"></i> Detalle
        </button>
        {api.generar_ui ? (
          <button onClick={() => window.open(`/app/${api.api_name}/ui`, '_blank')} className="flex items-center justify-center w-9 border border-success/30 rounded-lg text-xs font-bold text-success hover:bg-successBg transition-colors" title="Abrir panel UI">
            <i className="fas fa-external-link-alt"></i>
          </button>
        ) : <span className="w-9"></span>}
        <button onClick={setDeleteTarget} className="flex items-center justify-center w-9 border border-danger/30 rounded-lg text-xs font-bold text-danger hover:bg-dangerBg transition-colors">
          <i className="fas fa-trash"></i>
        </button>
      </div>
    </div>
  );
}

function Panel({ api, close, toggleApi, restoreApi, showToast, reload }) {
  const [tab, setTab] = useState('info');
  const [logs, setLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [addingEp, setAddingEp] = useState(false);
  const [newEp, setNewEp] = useState({ method: 'get', path: '/', function_name: 'get_items', logic: 'select' });
  const [savingEp, setSavingEp] = useState(false);

  const eps = api.endpoints || [];
  const cols = api.columns || [];
  const lang = api.language || 'python';
  const lc = LANG_OPTS[lang] || LANG_OPTS.python;
  const dc = DB_OPTS[api.db] || { icon: '🗄️', label: api.db };
  const isRun = api.status === 'running';
  const anyDown = api.status !== 'running' || api.backup_status !== 'running';

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/${api.api_name}/logs?tail=80`);
      const data = await res.json();
      setLogs(data.logs || 'Sin logs disponibles');
    } catch (e) {
      setLogs('Error al cargar logs: ' + e.message);
    }
    setLogsLoading(false);
  };

  useEffect(() => {
    if (tab === 'logs') fetchLogs();
  }, [tab]);

  const addEndpoint = async () => {
    if (!newEp.path.startsWith('/')) { showToast('El path debe empezar por /', 'error'); return; }
    if (!newEp.function_name || /\s/.test(newEp.function_name)) { showToast('Nombre de función inválido', 'error'); return; }
    setSavingEp(true);
    try {
      const res = await fetch(`/${api.api_name}/create-end-point`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEp),
      });
      if (!res.ok) {
        const t = await res.text();
        let msg = t;
        try { msg = JSON.parse(t).detail || t; } catch {}
        throw new Error(msg);
      }
      showToast('Endpoint añadido · Reconstruyendo contenedor...', 'success');
      setAddingEp(false);
      setNewEp({ method: 'get', path: '/', function_name: 'get_items', logic: 'select' });
      setTimeout(reload, 5000);
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
    setSavingEp(false);
  };

  const selCls = "w-full bg-bg border border-borderNormal rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary text-textMain cursor-pointer";
  const inpCls = "w-full bg-bg border border-borderNormal rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary text-textMain font-mono";

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
          {[['info','Información'], ['endpoints', `Endpoints (${eps.length})`], ['logs','Logs']].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors ${tab === t ? 'border-b-2 border-primary text-primary' : 'text-textMuted hover:text-textSoft'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
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

          {tab === 'endpoints' && (
            <div>
              {eps.length === 0 && !addingEp && (
                <div className="text-center text-textMuted text-sm py-8">Sin endpoints definidos</div>
              )}
              <div className="space-y-2 mb-3">
                {eps.map((ep, i) => (
                  <div key={i} className="bg-card border border-borderNormal rounded-xl p-3 flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold font-mono min-w-[44px] text-center ${MTH[ep.method] || MTH.get}`}>{ep.method.toUpperCase()}</span>
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
                      <select value={newEp.method} onChange={e => setNewEp(p => ({...p, method: e.target.value}))} className={selCls}>
                        {['get','post','put','delete'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="text-[10px] text-textMuted font-bold uppercase mb-1">Lógica</div>
                      <select value={newEp.logic} onChange={e => setNewEp(p => ({...p, logic: e.target.value}))} className={selCls}>
                        {['select','insert','update','delete'].map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-textMuted font-bold uppercase mb-1">Path</div>
                    <input value={newEp.path} onChange={e => setNewEp(p => ({...p, path: e.target.value}))} className={inpCls} placeholder="/usuarios" />
                  </div>
                  <div>
                    <div className="text-[10px] text-textMuted font-bold uppercase mb-1">Nombre función</div>
                    <input value={newEp.function_name} onChange={e => setNewEp(p => ({...p, function_name: e.target.value.replace(/\s/g,'')}))} className={inpCls} placeholder="get_usuarios" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setAddingEp(false)} className="flex-1 py-2 rounded-lg border border-borderLight text-textSoft text-xs font-semibold hover:text-textMain">Cancelar</button>
                    <button onClick={addEndpoint} disabled={savingEp} className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-60">
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

function CreateModal({ close, reload, showLoading, hideLoading, showToast }) {
  const [name, setName] = useState('');
  const [lang, setLang] = useState('python');
  const [db, setDb] = useState('postgresql');
  const [dbUser, setDbUser] = useState('');
  const [dbPass, setDbPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [generarUi, setGenerarUi] = useState(false);
  const [columns, setColumns] = useState([{ name: '', type: 'VARCHAR(255)' }]);
  const [endpoints, setEndpoints] = useState([{ method: 'get', path: '/', function_name: 'get_items', logic: 'select' }]);

  const COL_TYPES = ['VARCHAR(255)', 'INTEGER', 'BOOLEAN', 'TEXT', 'FLOAT', 'DATE'];

  const addCol = () => setColumns(c => [...c, { name: '', type: 'VARCHAR(255)' }]);
  const removeCol = i => setColumns(c => c.filter((_, idx) => idx !== i));
  const updateCol = (i, field, val) => setColumns(c => c.map((col, idx) => idx === i ? {...col, [field]: val} : col));

  const addEp = () => setEndpoints(e => [...e, { method: 'get', path: '/', function_name: 'get_items', logic: 'select' }]);
  const removeEp = i => setEndpoints(e => e.filter((_, idx) => idx !== i));
  const updateEp = (i, field, val) => setEndpoints(e => e.map((ep, idx) => idx === i ? {...ep, [field]: val} : ep));

  const handleCreate = async () => {
    if (!name || !/^[a-z0-9_]+$/.test(name)) { showToast('Nombre: solo letras minúsculas, números y _', 'error'); return; }
    if (db !== 'sqlite' && (!dbUser || !dbPass)) { showToast('Usuario y contraseña de BD obligatorios', 'error'); return; }
    for (const col of columns) {
      if (!col.name || /\s/.test(col.name)) { showToast('Nombre de columna inválido', 'error'); return; }
    }
    for (const ep of endpoints) {
      if (!ep.path.startsWith('/') || !ep.function_name || /\s/.test(ep.function_name)) {
        showToast('Revisa los endpoints (path y nombre de función)', 'error'); return;
      }
    }

    showLoading('Creando API...');
    try {
      const body = {
        api_name: name,
        language: lang,
        db,
        usr: db === 'sqlite' ? 'user' : dbUser,
        paswd: db === 'sqlite' ? 'password' : dbPass,
        columns: columns.map(c => `${c.name} ${c.type}`),
        endpoints,
        generar_ui: generarUi,
      };
      const res = await fetch('/crear-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try { msg = JSON.parse(text).detail || text; } catch {}
        throw new Error(msg);
      }
      const data = JSON.parse(text);
      showToast(`API "${name}" creada · Puerto ${data.puerto}`, 'success');
      reload();
      close();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
    hideLoading();
  };

  const inputCls = "w-full bg-bg border border-borderNormal rounded-xl px-3 py-2.5 text-sm focus:border-primary outline-none text-textMain transition-colors";
  const selectCls = "w-full bg-bg border border-borderNormal rounded-xl px-3 py-2.5 text-sm focus:border-primary outline-none text-textMain cursor-pointer";
  const labelCls = "block text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1.5";
  const sectionCls = "text-[10px] font-bold text-textMuted uppercase tracking-widest pb-2 border-b border-borderNormal mb-4";

  return (
    <div className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-surface border border-borderLight rounded-2xl w-full max-w-[640px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-5 border-b border-borderNormal flex items-center gap-3 shrink-0">
          <i className="fas fa-plus-circle text-primary text-lg"></i>
          <span className="text-base font-bold flex-1">Nueva API</span>
          <button onClick={close} className="w-8 h-8 rounded-lg bg-card border border-borderNormal flex items-center justify-center text-textSoft hover:text-textMain">
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-6">
          {/* Configuración básica */}
          <div>
            <div className={sectionCls}>Configuración básica</div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Nombre de la API</label>
                <input value={name} onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} className={inputCls} placeholder="mi_api_rest" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Lenguaje</label>
                  <select value={lang} onChange={e => setLang(e.target.value)} className={selectCls}>
                    {Object.entries(LANG_OPTS).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Base de datos</label>
                  <select value={db} onChange={e => setDb(e.target.value)} className={selectCls}>
                    {Object.entries(DB_OPTS).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
              </div>
              {db !== 'sqlite' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Usuario BD</label>
                    <input value={dbUser} onChange={e => setDbUser(e.target.value)} className={inputCls} placeholder="usuario" />
                  </div>
                  <div>
                    <label className={labelCls}>Contraseña BD</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} value={dbPass} onChange={e => setDbPass(e.target.value)} className={inputCls + ' pr-10'} placeholder="••••••••" />
                      <button onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textSoft text-sm"><i className={`fas fa-eye${showPass ? '' : '-slash'}`}></i></button>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between bg-card border border-borderNormal rounded-xl px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-textMain">Generar panel web</div>
                  <div className="text-xs text-textMuted mt-0.5">Interfaz visual en el navegador</div>
                </div>
                <button onClick={() => setGenerarUi(v => !v)} className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${generarUi ? 'bg-primary' : 'bg-borderNormal'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${generarUi ? 'left-6' : 'left-1'}`}></span>
                </button>
              </div>
            </div>
          </div>

          {/* Columnas */}
          <div>
            <div className={sectionCls}>Columnas</div>
            <div className="space-y-2">
              {columns.map((col, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={col.name} onChange={e => updateCol(i, 'name', e.target.value.replace(/\s/g,''))} className={inputCls + ' flex-1'} placeholder="nombre_columna" />
                  <select value={col.type} onChange={e => updateCol(i, 'type', e.target.value)} className={selectCls + ' !w-[150px] flex-shrink-0'}>
                    {COL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button onClick={() => removeCol(i)} disabled={columns.length === 1} className="w-9 h-10 flex items-center justify-center text-danger hover:bg-dangerBg rounded-lg disabled:opacity-30 shrink-0">
                    <i className="fas fa-times text-sm"></i>
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addCol} className="w-full mt-2 py-2 rounded-xl border border-dashed border-borderNormal text-textMuted hover:text-primary hover:border-primary text-xs font-semibold transition-colors">
              <i className="fas fa-plus mr-1.5"></i>Añadir columna
            </button>
          </div>

          {/* Endpoints */}
          <div>
            <div className={sectionCls}>Endpoints</div>
            <div className="space-y-2">
              {endpoints.map((ep, i) => (
                <div key={i} className="bg-card border border-borderNormal rounded-xl p-3">
                  <div className="flex justify-end mb-2">
                    <button onClick={() => removeEp(i)} disabled={endpoints.length === 1} className="text-danger hover:bg-dangerBg rounded px-2 py-0.5 disabled:opacity-30 text-xs">
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <div className="text-[10px] text-textMuted font-bold uppercase mb-1">Método</div>
                      <select value={ep.method} onChange={e => updateEp(i,'method',e.target.value)} className={selectCls}>
                        {['get','post','put','delete'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="text-[10px] text-textMuted font-bold uppercase mb-1">Lógica</div>
                      <select value={ep.logic} onChange={e => updateEp(i,'logic',e.target.value)} className={selectCls}>
                        {['select','insert','update','delete'].map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-textMuted font-bold uppercase mb-1">Path</div>
                      <input value={ep.path} onChange={e => updateEp(i,'path',e.target.value)} className={inputCls} placeholder="/usuarios" />
                    </div>
                    <div>
                      <div className="text-[10px] text-textMuted font-bold uppercase mb-1">Nombre función</div>
                      <input value={ep.function_name} onChange={e => updateEp(i,'function_name',e.target.value.replace(/\s/g,''))} className={inputCls} placeholder="get_usuarios" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addEp} className="w-full mt-2 py-2 rounded-xl border border-dashed border-borderNormal text-textMuted hover:text-primary hover:border-primary text-xs font-semibold transition-colors">
              <i className="fas fa-plus mr-1.5"></i>Añadir endpoint
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-borderNormal flex justify-end gap-3 shrink-0">
          <button onClick={close} className="px-5 py-2.5 rounded-xl border border-borderLight text-textSoft hover:text-textMain font-semibold text-sm">Cancelar</button>
          <button onClick={handleCreate} className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-primary to-purple-500 text-white font-bold text-sm shadow-[0_4px_12px_rgba(99,102,241,0.3)] hover:shadow-[0_6px_18px_rgba(99,102,241,0.4)] transition-all">
            Crear API
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ target, close, confirm }) {
  const [input, setInput] = useState('');
  return (
    <div className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-surface border border-borderLight rounded-2xl w-full max-w-[420px] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 pb-2 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-dangerBg text-danger flex items-center justify-center text-3xl mb-4">
            <i className="fas fa-trash"></i>
          </div>
          <h3 className="text-xl font-bold mb-2">Eliminar <span className="text-danger">{target}</span></h3>
          <p className="text-sm text-textMuted mb-6">Esta acción es irreversible. Se eliminarán los contenedores y datos.</p>
          <div className="w-full text-left">
            <div className="text-xs text-textMuted mb-1">Escribe el nombre exacto para confirmar:</div>
            <input value={input} onChange={e => setInput(e.target.value)} className="w-full bg-card border border-borderNormal rounded-xl p-3 text-center text-sm font-mono focus:border-danger outline-none" placeholder={target} />
          </div>
        </div>
        <div className="p-6 pt-4 flex gap-3">
          <button onClick={close} className="flex-1 px-4 py-2.5 rounded-xl border border-borderLight text-textSoft hover:text-textMain font-semibold text-sm">Cancelar</button>
          <button onClick={confirm} disabled={input !== target} className="flex-1 px-4 py-2.5 rounded-xl bg-danger text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed">Eliminar</button>
        </div>
      </div>
    </div>
  );
}
