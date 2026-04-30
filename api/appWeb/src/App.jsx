import { useState, useEffect, useRef } from 'react';

const HOST = window.location.hostname;

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

  // Modals & Panels
  const [panelApi, setPanelApi] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Stats
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
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
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
      showToast(`Restaurando ${name}...`, 'success');
      fetchApis();
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

  // Filtered APIs
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
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-500 rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_var(--tw-colors-primaryGlow)] shrink-0">
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

      {/* MAIN CONTAINER */}
      <main className="ml-[270px] flex-1 p-8 min-h-screen">
        {/* HEADER */}
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

        {/* STATS */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard icon="fa-layer-group" label="Total APIs" value={apis.length} color="purple" />
          <StatCard icon="fa-play-circle" label="En ejecución" value={runCount} color="green" />
          <StatCard icon="fa-stop-circle" label="Detenidas / Error" value={stopCount} color="red" />
          <StatCard icon="fa-code-branch" label="Total Endpoints" value={epsCount} color="blue" />
        </div>

        {/* FILTERS */}
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

        {/* GRID */}
        {displayedApis.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 bg-card border-2 border-dashed border-borderNormal rounded-2xl gap-4 text-center col-span-full">
            <div className="text-5xl text-borderLight"><i className="fas fa-wind"></i></div>
            <h3 className="text-lg text-textSoft">{apis.length === 0 ? 'No hay APIs creadas' : 'Sin resultados'}</h3>
            <p className="text-sm text-textMuted">{apis.length === 0 ? 'Pulsa "+ Nueva API" para crear tu primera.' : 'Ajusta los filtros.'}</p>
            {apis.length === 0 && <button onClick={() => setShowCreate(true)} className="btn-primary mt-2"><i className="fas fa-plus"></i> Nueva API</button>}
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

      {/* OVERLAYS & MODALS */}
      {panelApi && <Panel api={panelApi} close={() => setPanelApi(null)} />}
      {showCreate && <CreateModal close={() => setShowCreate(false)} reload={fetchApis} showLoading={showLoading} hideLoading={hideLoading} showToast={showToast} />}
      {deleteTarget && (
        <DeleteModal 
          target={deleteTarget} 
          close={() => setDeleteTarget(null)} 
          confirm={deleteApi} 
        />
      )}
      
      {/* TOASTS */}
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

      {/* LOADING */}
      {loadingMsg && (
        <div className="fixed inset-0 bg-[#060b14]/85 z-[400] flex flex-col items-center justify-center gap-4">
          <div className="w-11 h-11 border-4 border-borderNormal border-t-primary rounded-full animate-spin-custom"></div>
          <div className="text-textSoft text-sm text-center max-w-[300px]">{loadingMsg}</div>
        </div>
      )}
    </div>
  );
}

// Subcomponents

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
  const dc = DB_OPTS[api.db] || { icon:'🗄️', label:api.db };
  const eps = api.endpoints || [];
  const cols = (api.columns || []).map(c => c.split(' ')[0]);
  const isRun = api.status === 'running';
  const anyDown = api.status !== 'running' || api.backup_status !== 'running';

  return (
    <div className="bg-card border border-borderNormal rounded-2xl overflow-hidden hover:border-borderLight hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.4)] transition-all relative flex flex-col">
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, #3b82f6, #8b5cf6)` }}></div>
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
          {eps.length > 3 && <div className="text-primary text-xs cursor-pointer font-bold mt-1">+{eps.length - 3} más</div>}
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
          <button onClick={() => window.open(`http://${HOST}:${api.port}/ui`, '_blank')} className="flex items-center justify-center w-9 border border-success/30 rounded-lg text-xs font-bold text-success hover:bg-successBg transition-colors" title="Abrir panel UI">
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

// Include Panel, CreateModal, DeleteModal below or separate file...
// For brevity, here is a simplified Panel implementation
function Panel({ api, close }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[190] backdrop-blur-[2px]" onClick={close}></div>
      <div className="fixed top-0 right-0 w-[480px] h-screen bg-surface border-l border-borderNormal z-[200] overflow-y-auto flex flex-col shadow-2xl">
        <div className="p-6 border-b border-borderNormal sticky top-0 bg-surface z-10 flex items-center gap-3">
          <div className="text-lg font-bold font-mono flex-1 break-all">{api.api_name}</div>
          <button onClick={close} className="w-8 h-8 rounded-lg bg-card border border-borderNormal flex items-center justify-center text-textSoft hover:text-textMain hover:border-borderLight transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-6">
          <h3 className="text-xs font-bold tracking-widest uppercase text-textMuted mb-4"><i className="fas fa-info-circle text-primary mr-2"></i> Información</h3>
          <pre className="bg-card p-4 rounded-xl text-xs overflow-x-auto border border-borderNormal">{JSON.stringify(api, null, 2)}</pre>
        </div>
      </div>
    </>
  )
}

function CreateModal({ close, reload, showLoading, hideLoading, showToast }) {
  const [name, setName] = useState('');
  const [port, setPort] = useState('8080');
  const [lang, setLang] = useState('python');
  
  const handleCreate = async () => {
    showLoading('Creando API...');
    try {
      const res = await fetch('/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_name: name, port: parseInt(port), language: lang, db: 'sqlite', generar_ui: false, columns: [], endpoints: [] })
      });
      if (!res.ok) throw new Error(await res.text());
      showToast('API creada correctamente', 'success');
      reload();
      close();
    } catch(e) {
      showToast('Error: ' + e.message, 'error');
    }
    hideLoading();
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-surface border border-borderLight rounded-2xl w-full max-w-[680px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-borderNormal flex items-center gap-3">
          <i className="fas fa-plus-circle text-primary text-xl"></i>
          <span className="text-lg font-bold flex-1">Nueva API (Simplificada)</span>
          <button onClick={close} className="w-8 h-8 rounded-lg bg-card border border-borderNormal flex items-center justify-center text-textSoft hover:text-textMain hover:border-borderLight">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-1">Nombre</label>
          <input value={name} onChange={e=>setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} className="w-full bg-card border border-borderNormal rounded-xl p-3 mb-4 text-sm focus:border-primary outline-none" placeholder="mi_api" />
          
          <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-1">Puerto</label>
          <input type="number" value={port} onChange={e=>setPort(e.target.value)} className="w-full bg-card border border-borderNormal rounded-xl p-3 mb-4 text-sm focus:border-primary outline-none" placeholder="8080" />
        </div>
        <div className="p-4 border-t border-borderNormal flex justify-end gap-3 bg-surface">
          <button onClick={close} className="px-5 py-2.5 rounded-xl border border-borderLight text-textSoft hover:text-textMain font-semibold text-sm">Cancelar</button>
          <button onClick={handleCreate} className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-primary to-purple-500 text-white font-bold text-sm">Crear API</button>
        </div>
      </div>
    </div>
  )
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
            <input value={input} onChange={e=>setInput(e.target.value)} className="w-full bg-card border border-borderNormal rounded-xl p-3 text-center text-sm font-mono focus:border-danger outline-none" placeholder={target} />
          </div>
        </div>
        <div className="p-6 pt-4 flex gap-3">
          <button onClick={close} className="flex-1 px-4 py-2.5 rounded-xl border border-borderLight text-textSoft hover:text-textMain font-semibold text-sm">Cancelar</button>
          <button onClick={confirm} disabled={input !== target} className="flex-1 px-4 py-2.5 rounded-xl bg-danger text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed">Eliminar</button>
        </div>
      </div>
    </div>
  )
}
