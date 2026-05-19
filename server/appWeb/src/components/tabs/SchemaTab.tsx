import { useState, useEffect } from "react";
import type { ApiSchema, SchemaTable, Toast } from "../../types";
import * as ApiService from "../../services/apiService";
import DeleteModal from "../modals/DeleteModal";

interface SchemaTabProps {
  apiName: string;
  dbType: string;
  showToast: (msg: string, type?: Toast["type"]) => void;
}

const COL_TYPES = ["VARCHAR(255)", "INTEGER", "BOOLEAN", "TEXT", "FLOAT", "DATE", "BIGINT", "TIMESTAMP"];

export default function SchemaTab({ apiName, dbType, showToast }: SchemaTabProps) {
  const [schema, setSchema] = useState<ApiSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddTable, setShowAddTable] = useState(false);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // New table form
  const [newTableName, setNewTableName] = useState("");
  const [newCols, setNewCols] = useState([{ name: "", type: "VARCHAR(255)", nullable: true }]);

  // Add column form per table
  const [addColFor, setAddColFor] = useState<string | null>(null);
  const [colName, setColName] = useState("");
  const [colType, setColType] = useState("VARCHAR(255)");

  const [dropConfirmTable, setDropConfirmTable] = useState<string | null>(null);

  // Add FK form
  const [addFkFor, setAddFkFor] = useState<string | null>(null);
  const [fkCol, setFkCol] = useState("");
  const [fkRefTable, setFkRefTable] = useState("");
  const [fkRefCol, setFkRefCol] = useState("");

  const fetchSchema = async () => {
    setLoading(true);
    try {
      const s = await ApiService.getSchema(apiName);
      setSchema(s);
    } catch (e) {
      showToast("Error al cargar esquema: " + (e instanceof Error ? e.message : String(e)), "error");
    }
    setLoading(false);
  };

  useEffect(() => { fetchSchema(); }, [apiName]);

  const handleCreateTable = async () => {
    if (!newTableName || !/^[a-z_][a-z0-9_]*$/.test(newTableName)) {
      showToast("Nombre de tabla inválido (solo a-z, números, _)", "error"); return;
    }
    for (const c of newCols) {
      if (!c.name || !/^[a-z_][a-z0-9_]*$/.test(c.name)) {
        showToast(`Columna '${c.name}' inválida`, "error"); return;
      }
    }
    setSaving(true);
    try {
      await ApiService.createTable(apiName, newTableName, newCols.map(c => ({
        name: c.name, type: c.type, nullable: c.nullable,
        ref_table: c.refTable || undefined, ref_col: c.refCol || undefined,
      })));
      showToast(`Tabla '${newTableName}' creada`, "success");
      setShowAddTable(false);
      setNewTableName("");
      setNewCols([{ name: "", type: "VARCHAR(255)", nullable: true }]);
      await fetchSchema();
    } catch (e) {
      showToast("Error: " + (e instanceof Error ? e.message : String(e)), "error");
    }
    setSaving(false);
  };

  const handleDropTable = async (tableName: string) => {
    setSaving(true);
    try {
      await ApiService.dropTable(apiName, tableName);
      showToast(`Tabla '${tableName}' eliminada`, "success");
      if (expandedTable === tableName) setExpandedTable(null);
      await fetchSchema();
    } catch (e) {
      showToast("Error: " + (e instanceof Error ? e.message : String(e)), "error");
    }
    setSaving(false);
    setDropConfirmTable(null);
  };

  const handleAddColumn = async (tableName: string) => {
    if (!colName || !/^[a-z_][a-z0-9_]*$/.test(colName)) {
      showToast("Nombre de columna inválido", "error"); return;
    }
    setSaving(true);
    try {
      await ApiService.addColumn(apiName, tableName, { name: colName, type: colType });
      showToast(`Columna '${colName}' añadida a '${tableName}'`, "success");
      setAddColFor(null); setColName(""); setColType("VARCHAR(255)");
      await fetchSchema();
    } catch (e) {
      showToast("Error: " + (e instanceof Error ? e.message : String(e)), "error");
    }
    setSaving(false);
  };

  const handleAddUnique = async (tableName: string, colName: string) => {
    if (dbType === "sqlite") {
      showToast("SQLite no soporta ADD UNIQUE en tablas existentes.", "error"); return;
    }
    setSaving(true);
    try {
      await ApiService.addUnique(apiName, tableName, colName);
      showToast(`UNIQUE añadido a '${tableName}.${colName}'`, "success");
      await fetchSchema();
    } catch (e) {
      showToast("Error: " + (e instanceof Error ? e.message : String(e)), "error");
    }
    setSaving(false);
  };

  const handleAddFK = async (tableName: string) => {
    if (!fkCol || !fkRefTable || !fkRefCol) {
      showToast("Completa todos los campos de FK", "error"); return;
    }
    if (dbType === "sqlite") {
      showToast("SQLite no soporta ALTER TABLE ADD FK. Recrea la tabla con la FK.", "error"); return;
    }
    setSaving(true);
    try {
      await ApiService.addFK(apiName, tableName, { column: fkCol, ref_table: fkRefTable, ref_column: fkRefCol });
      showToast(`FK añadida: ${tableName}.${fkCol} → ${fkRefTable}.${fkRefCol}`, "success");
      setAddFkFor(null); setFkCol(""); setFkRefTable(""); setFkRefCol("");
      await fetchSchema();
    } catch (e) {
      showToast("Error: " + (e instanceof Error ? e.message : String(e)), "error");
    }
    setSaving(false);
  };

  const cls = {
    input: "w-full bg-bg border border-borderNormal rounded-lg px-3 py-2 text-xs text-textMain outline-none focus:border-primary transition-colors",
    select: "w-full bg-bg border border-borderNormal rounded-lg px-3 py-2 text-xs text-textMain outline-none focus:border-primary cursor-pointer",
    btn: "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
    btnPrimary: "bg-primary text-white hover:opacity-90 disabled:opacity-50",
    btnDanger: "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
    btnGhost: "border border-borderLight text-textSoft hover:text-textMain",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-textMuted text-sm">
        <span className="animate-spin mr-2">⟳</span> Cargando esquema...
      </div>
    );
  }

  const tables = schema?.tables ?? [];
  const otherTables = tables.map(t => t.table);

  return (
    <div className="space-y-4">
      {dropConfirmTable && (
        <DeleteModal
          target={dropConfirmTable}
          close={() => setDropConfirmTable(null)}
          confirm={() => handleDropTable(dropConfirmTable)}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-textMain">{tables.length} tabla{tables.length !== 1 ? "s" : ""}</p>
          <p className="text-[10px] text-textMuted">{dbType.toUpperCase()}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchSchema} className={`${cls.btn} ${cls.btnGhost}`}>
            <i className="fas fa-sync-alt mr-1"></i>Actualizar
          </button>
          <button onClick={() => setShowAddTable(v => !v)} className={`${cls.btn} ${cls.btnPrimary}`}>
            <i className="fas fa-plus mr-1"></i>Nueva tabla
          </button>
        </div>
      </div>

      {/* New table form */}
      {showAddTable && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-primary">Nueva tabla</p>
          <div>
            <label className="text-[10px] text-textMuted font-bold uppercase mb-1 block">Nombre</label>
            <input
              value={newTableName}
              onChange={e => setNewTableName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              className={cls.input}
              placeholder="nombre_tabla"
            />
          </div>
          <div>
            <label className="text-[10px] text-textMuted font-bold uppercase mb-1 block">Columnas</label>
            <div className="space-y-2">
              {newCols.map((col, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex gap-2 items-center">
                    <input
                      value={col.name}
                      onChange={e => setNewCols(c => c.map((x, i) => i === idx ? { ...x, name: e.target.value.replace(/\s/g, "") } : x))}
                      className={cls.input + " flex-1"}
                      placeholder="nombre_col"
                    />
                    <select
                      value={col.type}
                      onChange={e => setNewCols(c => c.map((x, i) => i === idx ? { ...x, type: e.target.value } : x))}
                      className={cls.select + " !w-[130px] flex-shrink-0"}
                    >
                      {COL_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    {col.refTable === undefined ? (
                      <button
                        onClick={() => setNewCols(c => c.map((x, i) => i === idx ? { ...x, refTable: "", refCol: "" } : x))}
                        className="text-[10px] border border-borderNormal text-textMuted hover:text-primary hover:border-primary rounded px-1.5 py-1 whitespace-nowrap"
                        title="Añadir FK"
                      >FK</button>
                    ) : (
                      <button
                        onClick={() => setNewCols(c => c.map((x, i) => i === idx ? { ...x, refTable: undefined, refCol: undefined } : x))}
                        className="text-[10px] border border-primary/50 text-primary rounded px-1.5 py-1 whitespace-nowrap"
                        title="Quitar FK"
                      >FK ✓</button>
                    )}
                    <button
                      onClick={() => setNewCols(c => c.filter((_, i) => i !== idx))}
                      disabled={newCols.length === 1}
                      className="text-danger hover:bg-danger/10 rounded px-2 py-1 text-xs disabled:opacity-30"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                  {col.refTable !== undefined && (
                    <div className="flex gap-2 ml-1 pl-2 border-l-2 border-primary/30">
                      <div className="flex-1">
                        <label className="text-[9px] text-textMuted block mb-0.5">Tabla ref.</label>
                        <select
                          value={col.refTable}
                          onChange={e => setNewCols(c => c.map((x, i) => i === idx ? { ...x, refTable: e.target.value, refCol: "" } : x))}
                          className={cls.select + " !text-[11px]"}
                        >
                          <option value="">— Tabla —</option>
                          {tables.map(t => <option key={t.table} value={t.table}>{t.table}</option>)}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-[9px] text-textMuted block mb-0.5">Columna ref.</label>
                        <select
                          value={col.refCol}
                          onChange={e => setNewCols(c => c.map((x, i) => i === idx ? { ...x, refCol: e.target.value } : x))}
                          className={cls.select + " !text-[11px]"}
                          disabled={!col.refTable}
                        >
                          <option value="">— Col —</option>
                          {col.refTable && tables.find(t => t.table === col.refTable)?.columns.map(cx => (
                            <option key={cx.name} value={cx.name}>{cx.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setNewCols(c => [...c, { name: "", type: "VARCHAR(255)", nullable: true }])}
              className="w-full mt-2 py-1.5 rounded-lg border border-dashed border-borderNormal text-textMuted hover:text-primary hover:border-primary text-xs transition-colors"
            >
              <i className="fas fa-plus mr-1"></i>Añadir columna
            </button>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowAddTable(false)} className={`${cls.btn} ${cls.btnGhost} flex-1`}>Cancelar</button>
            <button onClick={handleCreateTable} disabled={saving} className={`${cls.btn} ${cls.btnPrimary} flex-1`}>
              {saving ? "Creando..." : "Crear tabla"}
            </button>
          </div>
        </div>
      )}

      {/* Table list */}
      {tables.length === 0 ? (
        <div className="text-center text-textMuted text-sm py-8 bg-card border border-dashed border-borderNormal rounded-xl">
          <i className="fas fa-table text-2xl mb-2 block opacity-40"></i>
          Sin tablas. Crea la primera arriba.
        </div>
      ) : (
        <div className="space-y-2">
          {tables.map((t: SchemaTable) => (
            <div key={t.table} className="bg-card border border-borderNormal rounded-xl overflow-hidden">
              {/* Table header */}
              <div
                className="flex items-center px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpandedTable(prev => prev === t.table ? null : t.table)}
              >
                <i className="fas fa-table text-primary text-xs mr-2.5 shrink-0"></i>
                <span className="text-sm font-semibold text-textMain flex-1">{t.table}</span>
                <span className="text-[10px] text-textMuted mr-3">{t.columns.length} cols · {t.foreign_keys.length} fks</span>
                <i className={`fas fa-chevron-${expandedTable === t.table ? "up" : "down"} text-textMuted text-xs`}></i>
              </div>

              {expandedTable === t.table && (
                <div className="border-t border-borderNormal px-4 pb-4 pt-3 space-y-3">
                  {/* Columns */}
                  <div>
                    <p className="text-[10px] text-textMuted font-bold uppercase mb-2">Columnas</p>
                    <div className="space-y-1">
                      {t.columns.map(col => (
                        <div key={col.name} className="flex items-center gap-2 text-xs py-1 border-b border-borderNormal/50 last:border-0">
                          {col.pk && <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1 rounded">PK</span>}
                          {col.unique && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1 rounded">UQ</span>}
                          <span className="text-textMain font-mono font-medium">{col.name}</span>
                          <span className="text-textMuted ml-auto">{col.type}</span>
                          {col.nullable === false && <span className="text-[9px] text-orange-400">NOT NULL</span>}
                          {!col.pk && !col.unique && dbType !== "sqlite" && (
                            <button
                              onClick={() => handleAddUnique(t.table, col.name)}
                              disabled={saving}
                              title="Añadir UNIQUE"
                              className="text-[9px] border border-borderNormal text-textMuted hover:text-blue-400 hover:border-blue-400 rounded px-1 py-0.5 transition-colors disabled:opacity-30"
                            >UQ</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* FKs */}
                  {t.foreign_keys.length > 0 && (
                    <div>
                      <p className="text-[10px] text-textMuted font-bold uppercase mb-2">Foreign Keys</p>
                      <div className="space-y-1">
                        {t.foreign_keys.map((fk, fi) => (
                          <div key={fi} className="text-xs text-textMuted font-mono">
                            <span className="text-textSoft">{fk.column}</span>
                            {" → "}
                            <span className="text-primary">{fk.ref_table}</span>
                            .{fk.ref_column}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add column inline */}
                  {addColFor === t.table ? (
                    <div className="bg-bg rounded-lg p-3 space-y-2 border border-borderNormal">
                      <p className="text-[10px] font-bold text-textMuted uppercase">Añadir columna</p>
                      <div className="flex gap-2">
                        <input value={colName} onChange={e => setColName(e.target.value.replace(/\s/g, ""))} className={cls.input + " flex-1"} placeholder="nombre_col" />
                        <select value={colType} onChange={e => setColType(e.target.value)} className={cls.select + " !w-[130px] flex-shrink-0"}>
                          {COL_TYPES.map(tp => <option key={tp}>{tp}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setAddColFor(null)} className={`${cls.btn} ${cls.btnGhost} flex-1 text-xs`}>Cancelar</button>
                        <button onClick={() => handleAddColumn(t.table)} disabled={saving} className={`${cls.btn} ${cls.btnPrimary} flex-1 text-xs`}>
                          {saving ? "..." : "Añadir"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Add FK inline */}
                  {addFkFor === t.table ? (() => {
                    const srcCols = t.columns.filter(c => !c.pk).map(c => c.name);
                    const refTable = tables.find(x => x.table === fkRefTable);
                    const refCols = refTable ? refTable.columns.map(c => c.name) : [];
                    return (
                      <div className="bg-bg rounded-lg p-3 space-y-2 border border-borderNormal">
                        <p className="text-[10px] font-bold text-textMuted uppercase">Añadir FK</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] text-textMuted block mb-1">Columna origen</label>
                            <select value={fkCol} onChange={e => setFkCol(e.target.value)} className={cls.select}>
                              <option value="">—</option>
                              {srcCols.map(n => <option key={n}>{n}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] text-textMuted block mb-1">Tabla referencia</label>
                            <select value={fkRefTable} onChange={e => { setFkRefTable(e.target.value); setFkRefCol(""); }} className={cls.select}>
                              <option value="">—</option>
                              {otherTables.filter(n => n !== t.table).map(n => <option key={n}>{n}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] text-textMuted block mb-1">Columna referencia</label>
                            <select value={fkRefCol} onChange={e => setFkRefCol(e.target.value)} className={cls.select} disabled={!fkRefTable}>
                              <option value="">—</option>
                              {refCols.map(n => <option key={n}>{n}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setAddFkFor(null)} className={`${cls.btn} ${cls.btnGhost} flex-1 text-xs`}>Cancelar</button>
                          <button onClick={() => handleAddFK(t.table)} disabled={saving} className={`${cls.btn} ${cls.btnPrimary} flex-1 text-xs`}>
                            {saving ? "..." : "Añadir FK"}
                          </button>
                        </div>
                      </div>
                    );
                  })() : null}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {addColFor !== t.table && (
                      <button onClick={() => { setAddColFor(t.table); setAddFkFor(null); }} className={`${cls.btn} ${cls.btnGhost} text-xs`}>
                        <i className="fas fa-plus mr-1"></i>Columna
                      </button>
                    )}
                    {addFkFor !== t.table && dbType !== "sqlite" && (
                      <button onClick={() => { setAddFkFor(t.table); setAddColFor(null); }} className={`${cls.btn} ${cls.btnGhost} text-xs`}>
                        <i className="fas fa-link mr-1"></i>FK
                      </button>
                    )}
                    <button onClick={() => setDropConfirmTable(t.table)} disabled={saving} className={`${cls.btn} ${cls.btnDanger} text-xs ml-auto`}>
                      <i className="fas fa-trash mr-1"></i>Eliminar tabla
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
