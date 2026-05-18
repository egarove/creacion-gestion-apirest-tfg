import { useState } from 'react';
import type { Endpoint, Toast } from '../../types';
import { LANG_OPTS, DB_OPTS } from '../../constants';
import { createApi, STRICT_MATRIX, autoLogic, deleteApi } from '../../services/apiService';
import { firebaseServiceUser } from '../../services/FireStoreService';
import { useContextStore } from '../../contextZustand';

interface CreateModalProps {
  close: () => void;
  reload: () => void;
  showLoading: (msg: string) => void;
  hideLoading: () => void;
  showToast: (msg: string, type?: Toast['type']) => void;
}

const COL_TYPES = ['VARCHAR(255)', 'INTEGER', 'BOOLEAN', 'TEXT', 'FLOAT', 'DATE'];

export default function CreateModal({ close, reload, showLoading, hideLoading, showToast }: CreateModalProps) {
  const [name, setName] = useState<string>('');
  const [lang, setLang] = useState<string>('python');
  const [db, setDb] = useState<string>('postgresql');
  const [dbUser, setDbUser] = useState<string>('');
  const [dbPass, setDbPass] = useState<string>('');
  const [showPass, setShowPass] = useState(false);
  const [generarUi, setGenerarUi] = useState<boolean>(false);
  const [columns, setColumns] = useState<{ name: string; type: string }[]>([{ name: '', type: 'VARCHAR(255)' }]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([{ method: 'get', path: '/', function_name: 'get_items', logic: 'select', table: '', is_public: false }]);
  const context = useContextStore();
  const addCol = () => setColumns(c => [...c, { name: '', type: 'VARCHAR(255)' }]);
  const removeCol = (i: number) => setColumns(c => c.filter((_, idx) => idx !== i));
  const updateCol = (i: number, field: string, val: string) => setColumns(c => c.map((col, idx) => idx === i ? { ...col, [field]: val } : col));

  const addEp = () => setEndpoints(e => [...e, { method: 'get', path: '/', function_name: 'get_items', logic: 'select', table: '', is_public: false }]);
  const removeEp = (i: number) => setEndpoints(e => e.filter((_, idx) => idx !== i));
  const updateEp = (i: number, field: string, val: string) => setEndpoints(e => e.map((ep, idx) => {
    if (idx !== i) return ep;
    if (field === 'method') return { ...ep, method: val, logic: autoLogic(val) };
    return { ...ep, [field]: val };
  }));
  const toggleEpPublic = (i: number) => setEndpoints(e => e.map((ep, idx) => idx !== i ? ep : { ...ep, is_public: !ep.is_public }));

  const handleCreate = async () => {
    firebaseServiceUser.setCollection(context.userApisPath)
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
      const cleanedEndpoints = endpoints.map(ep => ({
        ...ep,
        table: ep.table?.trim() || undefined,
      }));
      const data = await createApi({
        api_name: name,
        language: lang,
        db,
        usr: db === 'sqlite' ? 'user' : dbUser,
        paswd: db === 'sqlite' ? 'password' : dbPass,
        columns: columns.map(c => `${c.name} ${c.type}`),
        endpoints: cleanedEndpoints,
        generar_ui: generarUi,
      });
      console.log('API creada con puerto:', firebaseServiceUser.userCollectionRef);
      const firebaseEndpoints = cleanedEndpoints.map(ep => ({
        method: ep.method,
        path: ep.path,
        function_name: ep.function_name,
        logic: ep.logic,
        table: ep.table ?? null,
        is_public: ep.is_public,
      }));
      const savedApi = await firebaseServiceUser.saveApi(name, {
        api_name: name,
        port: data.puerto,
        backup_port: data.puerto + 1,
        db: db,
        language: lang,
        columns: columns.map(c => `${c.name} ${c.type}`),
        endpoints: firebaseEndpoints,
        generar_ui: generarUi,
      });
      if (savedApi) {
        showToast(`API "${name}" creada · Puerto ${data.puerto}`, 'success');
        reload();
        close();
      } else {
        await deleteApi(name);
        showToast('Error al guardar la API en la base de datos', 'error');
      }
    } catch (e) {
      await deleteApi(name);
      showToast('Error: ' + (e instanceof Error ? e.message : String(e)), 'error');
    }
    hideLoading();
  };

  const inputCls = 'w-full bg-bg border border-borderNormal rounded-xl px-3 py-2.5 text-sm focus:border-primary outline-none text-textMain transition-colors';
  const selectCls = 'w-full bg-bg border border-borderNormal rounded-xl px-3 py-2.5 text-sm focus:border-primary outline-none text-textMain cursor-pointer';
  const labelCls = 'block text-[10px] font-bold text-textMuted uppercase tracking-wider mb-1.5';
  const sectionCls = 'text-[10px] font-bold text-textMuted uppercase tracking-widest pb-2 border-b border-borderNormal mb-4';

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
                <input value={name} onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} className={inputCls} placeholder="mi_api_rest" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Lenguaje</label>
                  <select value={lang} onChange={e => setLang(e.target.value)} className={selectCls}>
                    {Object.entries(LANG_OPTS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Base de datos</label>
                  <select value={db} onChange={e => setDb(e.target.value)} className={selectCls}>
                    {Object.entries(DB_OPTS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
              </div>
              {db !== 'sqlite' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Usuario BD</label>
                    <input value={dbUser} onChange={e => setDbUser(e.target.value)} className={inputCls} placeholder="usuario" />
                  </div>
                  <div>
                    <label className={labelCls}>Contraseña BD</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} value={dbPass} onChange={e => setDbPass(e.target.value)} className={inputCls + ' pr-10'} placeholder="••••••••" />
                      <button onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textSoft text-sm">
                        <i className={`fas fa-eye${showPass ? '' : '-slash'}`}></i>
                      </button>
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
                  <input value={col.name} onChange={e => updateCol(i, 'name', e.target.value.replace(/\s/g, ''))} className={inputCls + ' flex-1 min-w-0'} placeholder="nombre_columna" />
                  <select value={col.type} onChange={e => updateCol(i, 'type', e.target.value)} className={selectCls + ' w-auto min-w-[110px] shrink-0 max-w-[150px]'}>
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
                      <select value={ep.method} onChange={e => updateEp(i, 'method', e.target.value)} className={selectCls}>
                        {['get', 'post', 'put', 'delete'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="text-[10px] text-textMuted font-bold uppercase mb-1">Lógica DB</div>
                      <select value={ep.logic} onChange={e => updateEp(i, 'logic', e.target.value)} className={selectCls}>
                        {['select', 'insert', 'update', 'delete'].map(l => {
                          const allowed = STRICT_MATRIX[ep.method] ?? [];
                          const disabled = !allowed.includes(l);
                          return <option key={l} value={l} disabled={disabled}>{l}{disabled ? ' ✗' : ''}</option>;
                        })}
                      </select>
                      <p className="text-[9px] text-textMuted mt-1">{ep.method.toUpperCase()} → {(STRICT_MATRIX[ep.method] ?? []).join(', ')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-textMuted font-bold uppercase mb-1">Path</div>
                      <input value={ep.path} onChange={e => updateEp(i, 'path', e.target.value)} className={inputCls} placeholder="/usuarios" />
                    </div>
                    <div>
                      <div className="text-[10px] text-textMuted font-bold uppercase mb-1">Nombre función</div>
                      <input value={ep.function_name} onChange={e => updateEp(i, 'function_name', e.target.value.replace(/\s/g, ''))} className={inputCls} placeholder="get_usuarios" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    <div>
                      <div className="text-[10px] text-textMuted font-bold uppercase mb-1">Tabla (opcional)</div>
                      <input value={ep.table ?? ''} onChange={e => updateEp(i, 'table', e.target.value.replace(/\s/g, ''))} className={inputCls} placeholder="tabla_por_defecto" />
                    </div>
                    <div className="flex items-center justify-between bg-bg border border-borderNormal rounded-xl px-3 py-2 mt-4">
                      <span className="text-xs text-textSoft font-semibold">Público</span>
                      <button onClick={() => toggleEpPublic(i)} className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${ep.is_public ? 'bg-primary' : 'bg-borderNormal'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${ep.is_public ? 'left-4' : 'left-0.5'}`}></span>
                      </button>
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
