# -*- coding: utf-8 -*-
"""
Proxy de panel web (/ui) servido por la meta-API para TODOS los lenguajes.
Nginx redirige /app/{api}/ui* a /ui-proxy/{api}* en el puerto 8000.
"""
import json
from fastapi import APIRouter, Depends, Body, Response
from fastapi.responses import HTMLResponse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from models import DBModel
from events.db import get_db
from routes.auth import firebase_dep
from services.db_manager import _build_database_url, _get_user_schema

router = APIRouter()


def _get_engine(api_data: DBModel):
    if api_data.db == "sqlite":
        # Management API container has the file at deployments/{name}/{name}.db (WORKDIR=/api)
        db_path = f"deployments/{api_data.api_name}/{api_data.api_name}.db"
        return create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    url = _build_database_url(api_data.db, api_data.usr, api_data.paswd, api_data.api_name)
    return create_engine(url)


def _build_ui_html(api_name: str, table_schema: dict, tables: list, default_table: str) -> str:
    tables_js = json.dumps(tables)
    table_schema_js = json.dumps(table_schema)
    default_table_js = json.dumps(default_table)
    name_js = json.dumps(api_name)
    cols_js = json.dumps(table_schema.get(default_table, []))
    ncols = len(table_schema.get(default_table, []))
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Panel · {api_name}</title>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
:root{{
  --bg:#060b14;--surface:#0d1526;--card:#111827;--card2:#1e293b;
  --border:#1f2d45;--border2:#334155;--text:#e2e8f0;--muted:#64748b;--soft:#94a3b8;
  --primary:#6366f1;--pg:rgba(99,102,241,.14);
  --success:#10b981;--sg:rgba(16,185,129,.12);
  --danger:#ef4444;--dg:rgba(239,68,68,.12);
  --warning:#f59e0b;--wg:rgba(245,158,11,.12);
  --info:#3b82f6;--ig:rgba(59,130,246,.12);
  --radius:.75rem;
}}
body{{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;-webkit-tap-highlight-color:transparent}}
::-webkit-scrollbar{{width:4px;height:4px}}::-webkit-scrollbar-track{{background:transparent}}::-webkit-scrollbar-thumb{{background:var(--border2);border-radius:4px}}
.topbar{{background:linear-gradient(135deg,#1e1b4b,#312e81);padding:.75rem 1rem;display:flex;align-items:center;gap:.625rem;border-bottom:1px solid rgba(99,102,241,.3);position:sticky;top:0;z-index:50;box-shadow:0 2px 16px rgba(0,0,0,.4)}}
.tlogo{{width:32px;height:32px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:8px;display:grid;place-items:center;font-size:.95rem;flex-shrink:0}}
.tname{{font-size:.95rem;font-weight:800;color:#fff;line-height:1.2}}.tsub{{font-size:.65rem;color:rgba(255,255,255,.4);margin-top:1px}}
.tright{{margin-left:auto;display:flex;align-items:center;gap:.375rem}}
.pill{{padding:.15rem .55rem;border-radius:9999px;font-size:.68rem;font-weight:700;border:1px solid transparent;white-space:nowrap}}
.pill-g{{background:rgba(16,185,129,.2);border-color:rgba(16,185,129,.4);color:#34d399}}
.pill-b{{background:rgba(99,102,241,.25);border-color:rgba(99,102,241,.4);color:#a5b4fc}}
.topbtn{{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.75);padding:.4rem .75rem;border-radius:.5rem;cursor:pointer;font-size:.75rem;font-weight:600;transition:.2s;font-family:inherit;min-height:36px}}
.topbtn:active{{background:rgba(255,255,255,.2)}}
.page{{max-width:1400px;margin:0 auto;padding:1rem}}
.stats{{display:grid;grid-template-columns:repeat(4,1fr);gap:.625rem;margin-bottom:.875rem}}
.sc{{background:var(--card2);border:1px solid var(--border2);border-radius:var(--radius);padding:.75rem .875rem;display:flex;align-items:center;gap:.625rem}}
.si{{width:34px;height:34px;border-radius:.5rem;display:grid;place-items:center;font-size:.9rem;flex-shrink:0}}
.si-p{{background:var(--pg);color:var(--primary)}}.si-g{{background:var(--sg);color:var(--success)}}.si-b{{background:var(--ig);color:var(--info)}}.si-a{{background:var(--wg);color:var(--warning)}}
.sv{{font-size:1.3rem;font-weight:800;line-height:1;color:var(--text)}}.sl{{font-size:.65rem;color:var(--muted);margin-top:2px}}
.toolbar{{background:var(--card2);border:1px solid var(--border2);border-radius:var(--radius);padding:.625rem .875rem;margin-bottom:.625rem;display:flex;align-items:center;gap:.375rem;flex-wrap:wrap}}
.sw{{position:relative;flex:1;min-width:160px}}
.si-inp{{width:100%;background:var(--bg);border:1.5px solid var(--border);border-radius:.5rem;padding:.45rem .75rem .45rem 2rem;color:var(--text);font-size:.875rem;outline:none;transition:.2s;font-family:inherit;min-height:38px}}
.si-inp:focus{{border-color:var(--primary);box-shadow:0 0 0 3px var(--pg)}}.si-inp::placeholder{{color:var(--muted)}}
.sico{{position:absolute;left:.6rem;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;font-size:.875rem}}
.tbbtn{{border:1px solid var(--border2);background:var(--bg);color:var(--soft);border-radius:.5rem;padding:.45rem .7rem;font-size:.78rem;font-weight:600;cursor:pointer;transition:.2s;font-family:inherit;display:flex;align-items:center;gap:.3rem;white-space:nowrap;min-height:38px}}
.tbbtn:hover,.tbbtn:active{{border-color:var(--primary);color:var(--text)}}.tbbtn.on{{border-color:var(--primary);color:var(--primary);background:var(--pg)}}
.btnadd{{background:linear-gradient(135deg,var(--primary),#7c3aed);color:#fff;border:none;border-radius:.5rem;padding:.45rem .9rem;font-size:.875rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:.35rem;transition:.2s;white-space:nowrap;font-family:inherit;box-shadow:0 4px 12px rgba(99,102,241,.3);min-height:38px}}
.btnadd:active{{opacity:.85;transform:scale(.98)}}
.drop{{position:relative}}
.dropmenu{{display:none;position:absolute;top:calc(100% + 4px);right:0;background:var(--card2);border:1px solid var(--border2);border-radius:.625rem;min-width:150px;overflow:hidden;z-index:60;box-shadow:0 8px 25px rgba(0,0,0,.5)}}
.dropmenu.show{{display:block}}
.ditem{{display:block;width:100%;padding:.55rem .9rem;background:none;border:none;color:var(--soft);font-size:.83rem;font-weight:500;cursor:pointer;text-align:left;font-family:inherit;transition:.15s}}
.ditem:hover,.ditem:active{{background:var(--pg);color:var(--text)}}
.fpanel{{background:var(--card2);border:1px solid var(--border2);border-radius:var(--radius);padding:.875rem;margin-bottom:.625rem;display:none}}
.fpanel.open{{display:block}}
.fgrid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.5rem;margin-bottom:.5rem}}
.fi label{{display:block;font-size:.65rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.2rem}}
.fi input{{background:var(--bg);border:1px solid var(--border);border-radius:.375rem;padding:.38rem .55rem;color:var(--text);font-size:.8rem;outline:none;transition:.2s;font-family:inherit;width:100%;min-height:34px}}
.fi input:focus{{border-color:var(--primary)}}.fi input::placeholder{{color:var(--muted)}}
.bulkbar{{background:linear-gradient(135deg,rgba(99,102,241,.12),rgba(124,58,237,.08));border:1px solid rgba(99,102,241,.3);border-radius:var(--radius);padding:.5rem .875rem;margin-bottom:.625rem;display:none;align-items:center;gap:.5rem;flex-wrap:wrap}}
.bulkbar.show{{display:flex}}
.tcard{{background:var(--card2);border:1px solid var(--border2);border-radius:var(--radius);overflow:hidden}}
.tinfo{{padding:.45rem .875rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:.5rem;font-size:.75rem;color:var(--muted);flex-wrap:wrap}}
.tinfo-r{{margin-left:auto;display:flex;align-items:center;gap:.35rem}}
.pgsel{{background:var(--bg);border:1px solid var(--border);border-radius:.375rem;padding:.22rem .4rem;color:var(--soft);font-size:.72rem;outline:none;font-family:inherit}}
.tscroll{{overflow-x:auto;-webkit-overflow-scrolling:touch}}
table{{width:100%;border-collapse:collapse;min-width:380px}}
th{{padding:.5rem .875rem;text-align:left;font-size:.65rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;border-bottom:2px solid var(--border2);background:var(--bg);white-space:nowrap;cursor:pointer;user-select:none;transition:.15s}}
th:hover{{color:var(--text)}}th.sorted{{color:var(--primary)}}
td{{padding:.5rem .875rem;border-bottom:1px solid var(--border);font-size:.875rem;color:var(--soft);cursor:pointer;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:background .12s}}
td:hover{{background:rgba(99,102,241,.05);color:var(--text)}}
tr.sel td{{background:var(--pg)!important}}tr:last-child td{{border-bottom:none}}
.td-chk{{width:34px;cursor:default!important}}.td-chk:hover{{background:transparent!important}}
.td-id{{color:var(--muted);font-size:.72rem}}
.td-act{{width:68px;white-space:nowrap;cursor:default!important}}.td-act:hover{{background:transparent!important}}
input[type=checkbox]{{width:13px;height:13px;cursor:pointer;accent-color:var(--primary)}}
.abtn{{border:none;background:none;cursor:pointer;border-radius:.35rem;width:28px;height:28px;display:inline-grid;place-items:center;font-size:.85rem;transition:.15s}}
.ae{{color:var(--muted)}}.ae:hover{{background:var(--pg);color:var(--primary)}}
.ad{{color:var(--muted)}}.ad:hover{{background:var(--dg);color:var(--danger)}}
.empty-state{{padding:3rem 1.5rem;text-align:center;color:var(--muted)}}
.empty-icon{{font-size:2rem;margin-bottom:.5rem}}
.loading-spin{{display:inline-block;width:20px;height:20px;border:2.5px solid var(--border2);border-top-color:var(--primary);border-radius:50%;animation:spin .7s linear infinite}}
@keyframes spin{{to{{transform:rotate(360deg)}}}}
.cards-list{{display:none}}
.mcard{{background:var(--card2);border:1px solid var(--border2);border-radius:var(--radius);padding:.875rem;margin-bottom:.625rem}}
.mcard-id{{font-size:.7rem;color:var(--muted);font-weight:700;margin-bottom:.5rem;display:flex;align-items:center;justify-content:space-between}}
.mcard-row{{display:flex;justify-content:space-between;align-items:flex-start;padding:.3rem 0;border-bottom:1px solid var(--border);gap:.5rem}}
.mcard-row:last-of-type{{border-bottom:none}}
.mcard-key{{font-size:.7rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;flex-shrink:0;padding-top:1px}}
.mcard-val{{font-size:.875rem;color:var(--text);text-align:right;word-break:break-word;min-width:0}}
.mcard-actions{{display:flex;gap:.5rem;margin-top:.75rem;padding-top:.625rem;border-top:1px solid var(--border)}}
.mcard-actions .btn{{flex:1;justify-content:center;min-height:40px}}
.pgbar{{display:flex;align-items:center;justify-content:center;gap:.25rem;padding:.625rem .875rem;border-top:1px solid var(--border);flex-wrap:wrap}}
.pgbtn{{border:1px solid var(--border2);background:var(--bg);color:var(--soft);border-radius:.35rem;min-width:32px;height:32px;padding:0 .35rem;display:grid;place-items:center;cursor:pointer;font-size:.8rem;transition:.15s;font-family:inherit}}
.pgbtn:hover:not(:disabled){{border-color:var(--primary);color:var(--primary)}}
.pgbtn.cur{{background:var(--primary);border-color:var(--primary);color:#fff;font-weight:700}}
.pgbtn:disabled{{opacity:.3;cursor:default}}
.ov{{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:200;display:flex;align-items:flex-end;justify-content:center;padding:0;opacity:0;pointer-events:none;transition:.2s;backdrop-filter:blur(4px)}}
.ov.show{{opacity:1;pointer-events:all}}
.modal{{background:var(--surface);border:1px solid var(--border2);border-radius:1.25rem 1.25rem 0 0;width:100%;max-width:100%;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;transform:translateY(40px);transition:.25s}}
.ov.show .modal{{transform:none}}
.mhead{{padding:1rem 1.25rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:.5rem;flex-shrink:0}}
.mtitle{{font-size:.95rem;font-weight:700;flex:1}}.mclose{{width:30px;height:30px;border:1px solid var(--border2);background:var(--card);border-radius:.45rem;display:grid;place-items:center;cursor:pointer;color:var(--muted);transition:.15s;flex-shrink:0;font-size:1rem}}
.mbody{{padding:1rem 1.25rem;overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch}}
.mfoot{{padding:.875rem 1.25rem;border-top:1px solid var(--border);display:flex;gap:.5rem;justify-content:flex-end;flex-shrink:0}}
.mfgrid{{display:grid;grid-template-columns:1fr;gap:.625rem}}
.mfi label{{display:block;font-size:.7rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.25rem}}
.mfi input{{background:var(--card);border:1.5px solid var(--border2);border-radius:.5rem;padding:.6rem .875rem;color:var(--text);font-size:1rem;outline:none;transition:.2s;font-family:inherit;width:100%;min-height:44px}}
.mfi input:focus{{border-color:var(--primary);box-shadow:0 0 0 3px var(--pg)}}.mfi input::placeholder{{color:var(--muted)}}
.btn{{border:none;border-radius:.5rem;padding:.55rem 1rem;font-size:.875rem;font-weight:600;cursor:pointer;transition:.2s;display:inline-flex;align-items:center;gap:.4rem;font-family:inherit;min-height:40px}}
.btn-p{{background:linear-gradient(135deg,var(--primary),#7c3aed);color:#fff;box-shadow:0 2px 8px rgba(99,102,241,.3)}}.btn-p:active{{opacity:.85;transform:scale(.98)}}
.btn-s{{background:var(--card);border:1px solid var(--border2);color:var(--soft)}}.btn-s:active{{color:var(--text)}}
.btn-d{{background:var(--dg);border:1px solid rgba(239,68,68,.3);color:var(--danger)}}.btn-d:active{{background:rgba(239,68,68,.2)}}
.btn-sm{{padding:.4rem .75rem;font-size:.78rem;min-height:34px}}.btn:disabled{{opacity:.5;cursor:default;transform:none!important}}
.btn-full{{width:100%;justify-content:center}}
.conn-error{{background:var(--dg);border:1px solid rgba(239,68,68,.3);border-radius:var(--radius);padding:2rem 1.5rem;text-align:center;display:none}}
.conn-error.show{{display:block}}
.conn-error h3{{color:var(--danger);margin-bottom:.5rem;font-size:1rem}}
.conn-error p{{color:var(--soft);font-size:.875rem;margin-bottom:1rem}}
.toasts{{position:fixed;bottom:1rem;left:50%;transform:translateX(-50%);z-index:500;display:flex;flex-direction:column-reverse;gap:.35rem;pointer-events:none;width:calc(100% - 2rem);max-width:360px}}
.toast{{background:var(--card2);border:1px solid var(--border2);border-radius:.75rem;padding:.6rem 1rem;font-size:.84rem;font-weight:500;display:flex;align-items:center;gap:.5rem;pointer-events:all;box-shadow:0 8px 25px rgba(0,0,0,.5);animation:tin .22s ease;border-left:3px solid transparent}}
.toast.out{{animation:tout .22s ease forwards}}
.tok{{border-color:var(--success)}}.tok .ti{{color:var(--success)}}
.terr{{border-color:var(--danger)}}.terr .ti{{color:var(--danger)}}
.tinf{{border-color:var(--primary)}}.tinf .ti{{color:var(--primary)}}
.twrn{{border-color:var(--warning)}}.twrn .ti{{color:var(--warning)}}
.ti{{font-size:.9rem;flex-shrink:0}}.tm{{flex:1;color:var(--text)}}
@keyframes tin{{from{{opacity:0;transform:translateY(20px)}}to{{opacity:1;transform:none}}}}
@keyframes tout{{to{{opacity:0;transform:translateY(20px)}}}}
.fab{{display:none;position:fixed;bottom:1.25rem;right:1.25rem;z-index:100;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#7c3aed);border:none;color:#fff;font-size:1.5rem;cursor:pointer;box-shadow:0 4px 20px rgba(99,102,241,.5);align-items:center;justify-content:center;transition:.2s}}
.fab:active{{transform:scale(.9)}}
@media(max-width:700px){{
  .stats{{grid-template-columns:repeat(2,1fr);gap:.5rem}}
  .sv{{font-size:1.1rem}}.sc{{padding:.625rem .75rem;gap:.5rem}}.si{{width:30px;height:30px;font-size:.8rem}}
  .tbbtn-hide{{display:none}}
  .tcard{{display:none}}.cards-list{{display:block}}.fab{{display:flex}}
  .ov{{align-items:flex-end}}.modal{{border-radius:1.25rem 1.25rem 0 0;max-height:88vh}}
  .mfgrid{{grid-template-columns:1fr}}.mfoot{{flex-direction:column-reverse}}.mfoot .btn{{width:100%;justify-content:center}}
  .bulkbar{{font-size:.8rem}}.fpanel{{display:none!important}}
  .toasts{{bottom:.875rem}}.pill-hide{{display:none}}.page{{padding:.75rem .625rem}}
  .tname{{max-width:calc(100vw - 110px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
  .si-inp{{font-size:16px}}.mfi input{{font-size:16px}}.fi input{{font-size:16px}}
}}
@media(max-width:380px){{.stats{{gap:.35rem}}.sc{{padding:.5rem;gap:.375rem}}.sl{{display:none}}.tsub{{display:none}}.topbtn{{padding:.4rem .5rem}}}}
@media(min-width:701px){{
  .ov{{align-items:center;padding:1rem}}.modal{{border-radius:1.1rem;max-width:540px}}
  .mfgrid{{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}}
}}
</style>
</head>
<body>
<div class="topbar">
  <div class="tlogo">⚡</div>
  <div><div class="tname">{api_name}</div><div class="tsub">Panel de datos</div></div>
  <div class="tright">
    <span class="pill pill-g" id="tb-total">● …</span>
    <span class="pill pill-b pill-hide" id="tb-cols">{ncols} col</span>
    <select id="tsel" class="topbtn" onchange="changeTable(this.value)" style="cursor:pointer;padding:.4rem .5rem" title="Seleccionar tabla"></select>
    <button class="topbtn" onclick="loadData()" title="Recargar">↻</button>
  </div>
</div>
<div class="page">
  <div class="stats">
    <div class="sc"><div class="si si-p">📋</div><div><div class="sv" id="s-total">—</div><div class="sl">Total</div></div></div>
    <div class="sc"><div class="si si-g">🔍</div><div><div class="sv" id="s-filt">—</div><div class="sl">Filtrados</div></div></div>
    <div class="sc"><div class="si si-b">✅</div><div><div class="sv" id="s-sel">0</div><div class="sl">Sel.</div></div></div>
    <div class="sc"><div class="si si-a">📄</div><div><div class="sv">{ncols}</div><div class="sl">Cols</div></div></div>
  </div>
  <div class="toolbar">
    <div class="sw"><span class="sico">🔍</span><input class="si-inp" id="search" placeholder="Buscar…" oninput="onSearch()" autocomplete="off"></div>
    <button class="tbbtn tbbtn-hide" id="fbtn" onclick="toggleFilters()">☰ Filtros</button>
    <div class="drop tbbtn-hide">
      <button class="tbbtn" onclick="toggleDrop('exp-menu')">↓ Exportar</button>
      <div class="dropmenu" id="exp-menu">
        <button class="ditem" onclick="exportCSV()">📊 CSV</button>
        <button class="ditem" onclick="exportJSON()">{{}} JSON</button>
      </div>
    </div>
    <button class="btnadd tbbtn-hide" onclick="openAddModal()">＋ Añadir</button>
  </div>
  <div class="fpanel" id="fpanel"><div class="fgrid" id="fgrid"></div>
    <div style="display:flex;align-items:center;gap:.5rem;margin-top:.25rem">
      <button class="btn btn-s btn-sm" onclick="resetFilters()">↺ Limpiar</button>
      <span style="font-size:.72rem;color:var(--muted)" id="finfo"></span>
    </div>
  </div>
  <div class="bulkbar" id="bulkbar">
    <span style="font-size:.84rem;font-weight:600;color:var(--primary)" id="bulk-info">0 sel</span>
    <button class="btn btn-d btn-sm" onclick="bulkDelete()">🗑 Eliminar</button>
    <button class="btn btn-s btn-sm" onclick="clearSel()">✕ Desel.</button>
    <button class="btn btn-s btn-sm tbbtn-hide" onclick="exportSelCSV()">↓ CSV</button>
  </div>
  <div class="conn-error" id="conn-error"><h3>⚠ Sin conexión</h3><p id="conn-msg">No se pudo conectar.</p><button class="btn btn-p btn-full" onclick="loadData()">↺ Reintentar</button></div>
  <div class="tcard">
    <div class="tinfo"><span id="tinfo-txt">Cargando…</span>
      <div class="tinfo-r"><span style="font-size:.7rem">Filas:</span>
        <select class="pgsel" onchange="setPS(+this.value)">
          <option value="10">10</option><option value="25" selected>25</option>
          <option value="50">50</option><option value="100">100</option><option value="0">Todas</option>
        </select>
      </div>
    </div>
    <div class="tscroll"><table><thead id="thead"></thead><tbody id="tbody"><tr><td colspan="10" style="text-align:center;padding:3rem"><div class="loading-spin"></div></td></tr></tbody></table></div>
    <div class="pgbar" id="pgbar"></div>
  </div>
  <div class="cards-list" id="cards-list"><div style="text-align:center;padding:3rem"><div class="loading-spin"></div></div></div>
</div>
<button class="fab" onclick="openAddModal()" title="Añadir registro">＋</button>
<div class="ov" id="ov-add" onclick="if(event.target===this)closeOv('ov-add')">
  <div class="modal"><div class="mhead"><span>＋</span><span class="mtitle">Añadir registro</span><button class="mclose" onclick="closeOv('ov-add')">✕</button></div>
  <div class="mbody"><div class="mfgrid" id="add-fields"></div></div>
  <div class="mfoot"><button class="btn btn-s" onclick="closeOv('ov-add')">Cancelar</button><button class="btn btn-p" onclick="submitAdd()">＋ Añadir</button></div></div>
</div>
<div class="ov" id="ov-edit" onclick="if(event.target===this)closeOv('ov-edit')">
  <div class="modal"><div class="mhead"><span>✏</span><span class="mtitle">Editar <span id="edit-lbl" style="color:var(--muted);font-weight:400"></span></span><button class="mclose" onclick="closeOv('ov-edit')">✕</button></div>
  <div class="mbody"><div class="mfgrid" id="edit-fields"></div></div>
  <div class="mfoot"><button class="btn btn-s" onclick="closeOv('ov-edit')">Cancelar</button><button class="btn btn-p" onclick="submitEdit()">✓ Guardar</button></div></div>
</div>
<div class="ov" id="ov-del" onclick="if(event.target===this)closeOv('ov-del')">
  <div class="modal" style="max-width:380px"><div class="mhead"><span style="color:var(--danger)">⚠</span><span class="mtitle">Eliminar</span><button class="mclose" onclick="closeOv('ov-del')">✕</button></div>
  <div class="mbody"><div style="text-align:center;padding:.5rem 0">
    <div style="width:52px;height:52px;background:var(--dg);border-radius:50%;display:grid;place-items:center;margin:0 auto .75rem;font-size:1.4rem;color:var(--danger)">🗑</div>
    <div id="del-msg" style="font-size:.9rem;color:var(--soft)"></div>
    <div style="font-size:.75rem;color:var(--muted);margin-top:.35rem">Esta acción no se puede deshacer.</div>
  </div></div>
  <div class="mfoot"><button class="btn btn-s" onclick="closeOv('ov-del')">Cancelar</button><button class="btn btn-d" id="del-btn" onclick="execDel()">🗑 Eliminar</button></div></div>
</div>
<div class="toasts" id="toasts"></div>
<script>
window.__jsOk=false;
window.__fbToken=null;
window.onerror=function(msg,src,line,col,err){{
  if(window.__jsOk)return false;
  var el=document.getElementById('conn-error'),ml=document.getElementById('conn-msg'),tb=document.getElementById('tbody'),cl=document.getElementById('cards-list');
  if(el)el.classList.add('show');if(ml)ml.textContent='Error JS (línea '+line+'): '+msg;if(tb)tb.innerHTML='';if(cl)cl.innerHTML='';return true;
}};
window.addEventListener('unhandledrejection',function(e){{
  if(window.__jsOk)return;
  var el=document.getElementById('conn-error'),ml=document.getElementById('conn-msg');
  if(el)el.classList.add('show');if(ml)ml.textContent='Error async: '+(e.reason&&e.reason.message?e.reason.message:String(e.reason));
}});
</script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
<script>
(function(){{
  var _app=firebase.initializeApp({{
    apiKey:"AIzaSyC-l4wevzwLNuoeuUrv8gWqnqbbkUBt0-M",
    authDomain:"gestion-api-rest-dam.firebaseapp.com",
    projectId:"gestion-api-rest-dam",
    storageBucket:"gestion-api-rest-dam.firebasestorage.app",
    messagingSenderId:"181457370400",
    appId:"1:181457370400:web:dc460dc4f9c86cbef82b45"
  }});
  var _auth=firebase.auth(_app);
  _auth.onAuthStateChanged(async function(user){{
    if(!user){{
      var ce=document.getElementById('conn-error'),cm=document.getElementById('conn-msg');
      if(ce)ce.classList.add('show');
      if(cm)cm.textContent='Debes iniciar sesión en el panel web para acceder a este panel.';
      document.getElementById('tbody').innerHTML='';
      document.getElementById('cards-list').innerHTML='';
      return;
    }}
    window.__fbToken=await user.getIdToken();
    setInterval(async function(){{
      if(_auth.currentUser)window.__fbToken=await _auth.currentUser.getIdToken(true);
    }},50*60*1000);
    window.__jsOk=true;
    try{{await init();}}catch(e){{showError('Error al iniciar: '+e.message);}}
  }});
}})();
</script>
<script>
const TABLES = {tables_js};
const TABLE_SCHEMA = {table_schema_js};
let CURRENT_TABLE = {default_table_js};
let COLS = TABLE_SCHEMA[CURRENT_TABLE] || {cols_js};
const API_NAME = {name_js};
const BASE = window.location.pathname.replace(/\/ui.*$/, '');
const FETCH_TIMEOUT = 8000;
let DATA=[], filtered=[], editId=null, delTarget=null, retryTimer=null;
let ST={{q:'',cf:{{}},idMin:'',idMax:'',sc:'id',sd:'asc',page:1,ps:25,sel:new Set(),hid:new Set()}};
async function fetchT(url,opts={{}}){{
  const hdrs={{...(opts.headers||{{}})}};
  if(window.__fbToken)hdrs['Authorization']='Bearer '+window.__fbToken;
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),FETCH_TIMEOUT);
  try{{const r=await fetch(url,{{...opts,headers:hdrs,signal:ctrl.signal}});clearTimeout(timer);return r;}}
  catch(e){{clearTimeout(timer);throw e;}}
}}
async function init(){{initTableSel();buildAddForm();buildFilters();await loadData();}}
function showError(msg){{
  const el=document.getElementById('conn-error');document.getElementById('conn-msg').textContent=msg;el.classList.add('show');
  document.getElementById('tinfo-txt').textContent='Error';document.getElementById('tbody').innerHTML='';document.getElementById('cards-list').innerHTML='';
  document.getElementById('s-total').textContent='!';document.getElementById('s-filt').textContent='!';document.getElementById('tb-total').textContent='● Error';
  if(retryTimer)clearTimeout(retryTimer);retryTimer=setTimeout(loadData,10000);
}}
async function loadData(){{
  if(retryTimer){{clearTimeout(retryTimer);retryTimer=null;}}
  document.getElementById('conn-error').classList.remove('show');
  document.getElementById('tbody').innerHTML='<tr><td colspan="99" style="text-align:center;padding:3rem"><div class="loading-spin"></div></td></tr>';
  document.getElementById('cards-list').innerHTML='<div style="text-align:center;padding:3rem"><div class="loading-spin"></div></div>';
  try{{
    const r=await fetchT(BASE+'/ui/data?table='+encodeURIComponent(CURRENT_TABLE));
    if(!r.ok)throw new Error('HTTP '+r.status);
    DATA=await r.json();applyFilters();renderAll();
  }}catch(e){{
    const msg=e.name==='AbortError'?'Tiempo de espera agotado (8s). La API puede estar iniciando...':'No se pudo conectar. Reintentando en 10s…';
    showError(msg);toast(e.name==='AbortError'?'Timeout: API no responde':'Error de conexión','err');
  }}
}}
function applyFilters(){{
  const q=ST.q.toLowerCase(),allC=['id',...COLS];
  filtered=DATA.filter(row=>{{
    if(q&&!allC.some(c=>String(row[c]??'').toLowerCase().includes(q)))return false;
    if(ST.idMin!==''&&row.id<+ST.idMin)return false;if(ST.idMax!==''&&row.id>+ST.idMax)return false;
    for(const[c,v]of Object.entries(ST.cf))if(v&&!String(row[c]??'').toLowerCase().includes(v.toLowerCase()))return false;
    return true;
  }});
  filtered.sort((a,b)=>{{let va=a[ST.sc]??'',vb=b[ST.sc]??'';if(!isNaN(va)&&!isNaN(vb)){{va=+va;vb=+vb;}}else{{va=String(va);vb=String(vb);}}return ST.sd==='asc'?(va>vb?1:va<vb?-1:0):(va<vb?1:va>vb?-1:0);}});
  ST.page=1;
}}
function onSearch(){{ST.q=document.getElementById('search').value;applyFilters();renderAll();}}
function onCF(col,val){{ST.cf[col]=val;applyFilters();renderAll();}}
function onId(){{ST.idMin=document.getElementById('f-imin').value;ST.idMax=document.getElementById('f-imax').value;applyFilters();renderAll();}}
function resetFilters(){{ST.q='';ST.cf={{}};ST.idMin='';ST.idMax='';document.getElementById('search').value='';try{{document.getElementById('f-imin').value='';document.getElementById('f-imax').value='';}}catch(e){{}}COLS.forEach(c=>{{const e=document.getElementById('f-c-'+c);if(e)e.value='';}});applyFilters();renderAll();toast('Filtros limpiados','inf');}}
function toggleFilters(){{document.getElementById('fpanel').classList.toggle('open');document.getElementById('fbtn').classList.toggle('on');}}
function buildFilters(){{
  const el=document.getElementById('fgrid');if(!el)return;
  el.innerHTML=`<div class="fi"><label>ID mín</label><input id="f-imin" type="number" placeholder="Desde…" oninput="onId()"></div><div class="fi"><label>ID máx</label><input id="f-imax" type="number" placeholder="Hasta…" oninput="onId()"></div>${{COLS.map(c=>`<div class="fi"><label>${{c}}</label><input id="f-c-${{c}}" placeholder="Filtrar…" oninput="onCF('${{c}}',this.value)"></div>`).join('')}}`;
}}
function sortBy(col){{if(ST.sc===col)ST.sd=ST.sd==='asc'?'desc':'asc';else{{ST.sc=col;ST.sd='asc';}}applyFilters();renderAll();}}
function renderAll(){{renderHead();renderBody();renderCards();renderPg();renderStats();updateBulk();}}
function esc(s){{return String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}}
function renderHead(){{
  const cols=['id',...COLS].filter(c=>!ST.hid.has(c)),allSel=filtered.length>0&&filtered.every(r=>ST.sel.has(r.id));
  document.getElementById('thead').innerHTML=`<tr><th class="td-chk"><input type="checkbox" ${{allSel?'checked':''}} onchange="toggleAll()"></th>${{cols.map(c=>{{const s=ST.sc===c,a=s?(ST.sd==='asc'?'↑':'↓'):'↕';return `<th onclick="sortBy('${{c}}')" class="${{s?'sorted':''}}">${{c}} <span style="opacity:${{s?1:.35}};font-size:.6rem">${{a}}</span></th>`;}}).join('')}}<th>Act.</th></tr>`;
}}
function renderBody(){{
  const ps=ST.ps,start=ps===0?0:(ST.page-1)*ps,end=ps===0?filtered.length:start+ps,rows=filtered.slice(start,end),cols=['id',...COLS].filter(c=>!ST.hid.has(c));
  if(!rows.length){{const msg=DATA.length===0?'Sin registros. Pulsa ＋ para añadir.':'Sin resultados para los filtros.';document.getElementById('tbody').innerHTML=`<tr><td colspan="99" class="empty-state"><div class="empty-icon">🔍</div><div>${{msg}}</div></td></tr>`;document.getElementById('tinfo-txt').textContent='0 registros';return;}}
  document.getElementById('tbody').innerHTML=rows.map(row=>{{const sel=ST.sel.has(row.id),cells=cols.map(c=>{{const v=esc(String(row[c]??''));return `<td class="${{c==='id'?'td-id':''}}" title="${{v}}">${{v}}</td>`;}}).join('');return `<tr class="${{sel?'sel':''}}" id="tr-${{row.id}}"><td class="td-chk"><input type="checkbox" ${{sel?'checked':''}} onchange="toggleSel(${{row.id}})"></td>${{cells}}<td class="td-act"><button class="abtn ae" onclick="openEdit(${{row.id}})">✏</button><button class="abtn ad" onclick="openDel(${{row.id}})">🗑</button></td></tr>`;}}).join('');
  const tot=filtered.length,from=ps===0?1:start+1,to=ps===0?tot:Math.min(end,tot),extra=hasFilter()?` (de ${{DATA.length}})`:'';
  document.getElementById('tinfo-txt').textContent=`${{from}}–${{to}} de ${{tot}}${{extra}}`;
}}
function renderCards(){{
  const el=document.getElementById('cards-list');if(!el)return;
  const ps=ST.ps,start=ps===0?0:(ST.page-1)*ps,end=ps===0?filtered.length:start+ps,rows=filtered.slice(start,end);
  if(!rows.length){{el.innerHTML=`<div class="empty-state"><div class="empty-icon">🔍</div><div>${{DATA.length===0?'Sin registros. Pulsa ＋ para añadir.':'Sin resultados.'}}</div></div>`;return;}}
  el.innerHTML=rows.map(row=>{{const fields=COLS.map(c=>`<div class="mcard-row"><span class="mcard-key">${{c}}</span><span class="mcard-val">${{esc(String(row[c]??''))}}</span></div>`).join('');return `<div class="mcard"><div class="mcard-id"><span>ID #${{row.id}}</span></div>${{fields}}<div class="mcard-actions"><button class="btn btn-s btn-sm" onclick="openEdit(${{row.id}})">✏ Editar</button><button class="btn btn-d btn-sm" onclick="openDel(${{row.id}})">🗑 Eliminar</button></div></div>`;}}).join('');
}}
function hasFilter(){{return ST.q||Object.values(ST.cf).some(v=>v)||ST.idMin||ST.idMax;}}
function renderPg(){{
  const ps=ST.ps;if(ps===0||filtered.length<=ps){{document.getElementById('pgbar').innerHTML='';return;}}
  const tot=Math.ceil(filtered.length/ps),p=ST.page,pages=new Set([1,tot,p-1,p,p+1].filter(x=>x>=1&&x<=tot));
  let html='',prev=0;for(const pg of[...pages].sort((a,b)=>a-b)){{if(prev&&pg-prev>1)html+='<span style="color:var(--muted);padding:0 .2rem">…</span>';html+=`<button class="pgbtn ${{pg===p?'cur':''}}" onclick="setP(${{pg}})">${{pg}}</button>`;prev=pg;}}
  document.getElementById('pgbar').innerHTML=`<button class="pgbtn" onclick="setP(${{p-1}})" ${{p<=1?'disabled':''}}>←</button>${{html}}<button class="pgbtn" onclick="setP(${{p+1}})" ${{p>=tot?'disabled':''}}>→</button>`;
}}
function renderStats(){{document.getElementById('s-total').textContent=DATA.length;document.getElementById('s-filt').textContent=filtered.length;document.getElementById('s-sel').textContent=ST.sel.size;document.getElementById('tb-total').textContent='● '+DATA.length;document.getElementById('finfo').textContent=hasFilter()?`${{filtered.length}} de ${{DATA.length}} visibles`:'';}}
function setP(n){{const t=ST.ps===0?1:Math.ceil(filtered.length/ST.ps);ST.page=Math.max(1,Math.min(n,t));renderBody();renderCards();renderPg();}}
function setPS(n){{ST.ps=n;ST.page=1;renderBody();renderCards();renderPg();}}
function toggleSel(id){{ST.sel.has(id)?ST.sel.delete(id):ST.sel.add(id);const tr=document.getElementById('tr-'+id);if(tr)tr.className=ST.sel.has(id)?'sel':'';const chk=document.querySelector(`#tr-${{id}} input[type=checkbox]`);if(chk)chk.checked=ST.sel.has(id);const ah=document.querySelector('#thead input[type=checkbox]');if(ah)ah.checked=filtered.length>0&&filtered.every(r=>ST.sel.has(r.id));renderStats();updateBulk();}}
function toggleAll(){{const all=filtered.every(r=>ST.sel.has(r.id));filtered.forEach(r=>all?ST.sel.delete(r.id):ST.sel.add(r.id));renderAll();}}
function clearSel(){{ST.sel.clear();renderAll();}}
function updateBulk(){{const bar=document.getElementById('bulkbar'),n=ST.sel.size;n>0?bar.classList.add('show'):bar.classList.remove('show');document.getElementById('bulk-info').textContent=n+' seleccionado'+(n!==1?'s':'');}}
function buildAddForm(){{document.getElementById('add-fields').innerHTML=COLS.map(c=>`<div class="mfi"><label>${{c}}</label><input id="add-${{c}}" placeholder="${{c}}…" autocomplete="off"></div>`).join('');}}
function openAddModal(){{COLS.forEach(c=>{{const e=document.getElementById('add-'+c);if(e)e.value='';}});openOv('ov-add');setTimeout(()=>{{const f=document.querySelector('#add-fields input');if(f)f.focus();}},80);}}
async function submitAdd(){{
  const body={{}};let ok=true;COLS.forEach(c=>{{const v=(document.getElementById('add-'+c)?.value??'').trim();if(!v)ok=false;body[c]=v;}});
  if(!ok){{toast('Rellena todos los campos','wrn');return;}}
  const btn=document.querySelector('#ov-add .btn-p');btn.disabled=true;btn.textContent='Añadiendo…';
  try{{const r=await fetchT(BASE+'/ui/add?table='+encodeURIComponent(CURRENT_TABLE),{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify(body)}});if(r.ok){{closeOv('ov-add');toast('Registro añadido','ok');await loadData();}}else toast('Error al añadir','err');}}
  catch(e){{toast('Error de conexión','err');}}
  btn.disabled=false;btn.innerHTML='＋ Añadir';
}}
function openEdit(id){{
  const row=DATA.find(r=>r.id===id);if(!row)return;editId=id;
  document.getElementById('edit-lbl').textContent='#'+id;
  document.getElementById('edit-fields').innerHTML=COLS.map(c=>`<div class="mfi"><label>${{c}}</label><input id="edit-${{c}}" value="${{esc(String(row[c]??''))}}" autocomplete="off"></div>`).join('');
  openOv('ov-edit');setTimeout(()=>{{const f=document.querySelector('#edit-fields input');if(f)f.focus();}},80);
}}
async function submitEdit(){{
  if(editId===null)return;const body={{}};COLS.forEach(c=>{{body[c]=document.getElementById('edit-'+c)?.value??'';}});
  const btn=document.querySelector('#ov-edit .btn-p');btn.disabled=true;btn.textContent='Guardando…';
  try{{const r=await fetchT(BASE+'/ui/update/'+editId+'?table='+encodeURIComponent(CURRENT_TABLE),{{method:'PUT',headers:{{'Content-Type':'application/json'}},body:JSON.stringify(body)}});if(r.ok){{closeOv('ov-edit');toast('Cambios guardados','ok');await loadData();}}else toast('Error al guardar','err');}}
  catch(e){{toast('Error de conexión','err');}}
  btn.disabled=false;btn.innerHTML='✓ Guardar';
}}
function openDel(id){{delTarget={{ids:[id]}};document.getElementById('del-msg').textContent='¿Eliminar el registro #'+id+'?';openOv('ov-del');}}
function bulkDelete(){{if(!ST.sel.size)return;delTarget={{ids:[...ST.sel]}};document.getElementById('del-msg').textContent='¿Eliminar '+ST.sel.size+' registros?';openOv('ov-del');}}
async function execDel(){{
  if(!delTarget)return;const btn=document.getElementById('del-btn');btn.disabled=true;btn.textContent='Eliminando…';
  try{{
    if(delTarget.ids.length===1){{await fetchT(BASE+'/ui/delete/'+delTarget.ids[0]+'?table='+encodeURIComponent(CURRENT_TABLE),{{method:'DELETE'}});}}
    else{{await fetchT(BASE+'/ui/bulk-delete?table='+encodeURIComponent(CURRENT_TABLE),{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify(delTarget.ids)}});}}
    closeOv('ov-del');ST.sel.clear();toast(delTarget.ids.length===1?'Registro eliminado':delTarget.ids.length+' eliminados','ok');await loadData();
  }}catch(e){{toast('Error al eliminar','err');}}
  btn.disabled=false;btn.innerHTML='🗑 Eliminar';
}}
function exportCSV(){{const cols=['id',...COLS],csv=[cols.join(','),...filtered.map(r=>cols.map(c=>JSON.stringify(r[c]??'')).join(','))].join('\\n');dl(API_NAME+'_export.csv',csv,'text/csv');closeDrop('exp-menu');toast('CSV exportado','ok');}}
function exportJSON(){{const cols=['id',...COLS];dl(API_NAME+'_export.json',JSON.stringify(filtered.map(r=>Object.fromEntries(cols.map(c=>[c,r[c]]))),null,2),'application/json');closeDrop('exp-menu');toast('JSON exportado','ok');}}
function exportSelCSV(){{const sel=DATA.filter(r=>ST.sel.has(r.id)),cols=['id',...COLS],csv=[cols.join(','),...sel.map(r=>cols.map(c=>JSON.stringify(r[c]??'')).join(','))].join('\\n');dl(API_NAME+'_seleccion.csv',csv,'text/csv');toast('Exportado CSV','ok');}}
function dl(name,content,type){{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{{type}}));a.download=name;a.click();}}
function openOv(id){{document.getElementById(id).classList.add('show');document.body.style.overflow='hidden';}}
function closeOv(id){{document.getElementById(id).classList.remove('show');document.body.style.overflow='';}}
function toggleDrop(id){{document.querySelectorAll('.dropmenu').forEach(m=>{{if(m.id!==id)m.classList.remove('show');}});document.getElementById(id).classList.toggle('show');}}
function closeDrop(id){{document.getElementById(id).classList.remove('show');}}
function toast(msg,type='inf'){{
  const cls={{ok:'tok',err:'terr',inf:'tinf',wrn:'twrn'}},ic={{ok:'✓',err:'✕',inf:'ℹ',wrn:'⚠'}};
  const el=document.createElement('div');el.className='toast '+(cls[type]||'tinf');
  el.innerHTML=`<span class="ti">${{ic[type]||'ℹ'}}</span><span class="tm">${{msg}}</span>`;
  document.getElementById('toasts').prepend(el);setTimeout(()=>{{el.classList.add('out');setTimeout(()=>el.remove(),220);}},3200);
}}
document.addEventListener('keydown',e=>{{
  if(e.key==='Escape'){{['ov-add','ov-edit','ov-del'].forEach(closeOv);document.querySelectorAll('.dropmenu').forEach(m=>m.classList.remove('show'));}}
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;
  if(e.key==='n'||e.key==='N')openAddModal();if(e.key==='f'||e.key==='F')toggleFilters();if(e.key==='r'||e.key==='R')loadData();
}});
document.addEventListener('click',e=>{{if(!e.target.closest('.drop'))document.querySelectorAll('.dropmenu').forEach(m=>m.classList.remove('show'));}});
function initTableSel(){{const sel=document.getElementById('tsel');if(!sel)return;TABLES.forEach(t=>{{const o=document.createElement('option');o.value=t;o.textContent=t;if(t===CURRENT_TABLE)o.selected=true;sel.appendChild(o);}});if(TABLES.length<=1)sel.style.display='none';}}
function changeTable(t){{CURRENT_TABLE=t;COLS=TABLE_SCHEMA[t]||[];DATA=[];filtered=[];ST={{q:'',cf:{{}},idMin:'',idMax:'',sc:'id',sd:'asc',page:1,ps:25,sel:new Set(),hid:new Set()}};buildAddForm();buildFilters();loadData();}}
// init() se llama desde el bloque de Firebase auth cuando el usuario está autenticado
</script>
</body></html>"""


@router.get("/ui-proxy/{api_name}", response_class=HTMLResponse)
def ui_proxy_panel(api_name: str, db: Session = Depends(get_db)):
    api_data = db.query(DBModel).filter(DBModel.api_name == api_name).first()
    if not api_data:
        return Response(status_code=404, content="API no encontrada")
    try:
        schema = _get_user_schema(api_data.db, api_data.api_name, api_data.usr, api_data.paswd)
    except Exception:
        schema = []
    table_schema = {t["table"]: [c["name"] for c in t["columns"] if not c.get("pk")] for t in schema}
    tables = [t["table"] for t in schema]
    default_table = f"data_{api_name}"
    if tables and default_table not in tables:
        default_table = tables[0]
    return _build_ui_html(api_name, table_schema, tables, default_table)


@router.get("/ui-proxy/{api_name}/data")
def ui_proxy_data(api_name: str, table: str | None = None, db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    api_data = db.query(DBModel).filter(DBModel.api_name == api_name).first()
    if not api_data:
        return Response(status_code=404)
    import re as _re
    tname = table if table else f"data_{api_name}"
    if not _re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', tname):
        return Response(status_code=400, content="Nombre de tabla inválido")
    engine = _get_engine(api_data)
    try:
        with engine.connect() as conn:
            rows = conn.execute(text(f"SELECT * FROM {tname}")).fetchall()
            return [dict(r._mapping) for r in rows]
    except Exception as e:
        return Response(status_code=500, content=str(e))


@router.post("/ui-proxy/{api_name}/add")
def ui_proxy_add(api_name: str, data: dict = Body(...), table: str | None = None, db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    api_data = db.query(DBModel).filter(DBModel.api_name == api_name).first()
    if not api_data:
        return Response(status_code=404)
    import re as _re
    tname = table if table else f"data_{api_name}"
    if not _re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', tname):
        return Response(status_code=400, content="Nombre de tabla inválido")
    engine = _get_engine(api_data)
    with engine.connect() as conn:
        cols = ", ".join(data.keys())
        vals = ", ".join(f":{k}" for k in data.keys())
        conn.execute(text(f"INSERT INTO {tname} ({cols}) VALUES ({vals})"), data)
        conn.commit()
    return {"ok": True}


@router.put("/ui-proxy/{api_name}/update/{row_id}")
def ui_proxy_update(api_name: str, row_id: int, data: dict = Body(...), table: str | None = None, db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    api_data = db.query(DBModel).filter(DBModel.api_name == api_name).first()
    if not api_data:
        return Response(status_code=404)
    import re as _re
    tname = table if table else f"data_{api_name}"
    if not _re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', tname):
        return Response(status_code=400, content="Nombre de tabla inválido")
    engine = _get_engine(api_data)
    with engine.connect() as conn:
        sets = ", ".join(f"{k} = :{k}" for k in data.keys())
        params = dict(data)
        params["id"] = row_id
        conn.execute(text(f"UPDATE {tname} SET {sets} WHERE id = :id"), params)
        conn.commit()
    return {"ok": True}


@router.delete("/ui-proxy/{api_name}/delete/{row_id}")
def ui_proxy_delete(api_name: str, row_id: int, table: str | None = None, db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    api_data = db.query(DBModel).filter(DBModel.api_name == api_name).first()
    if not api_data:
        return Response(status_code=404)
    import re as _re
    tname = table if table else f"data_{api_name}"
    if not _re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', tname):
        return Response(status_code=400, content="Nombre de tabla inválido")
    engine = _get_engine(api_data)
    with engine.connect() as conn:
        conn.execute(text(f"DELETE FROM {tname} WHERE id = :id"), {"id": row_id})
        conn.commit()
    return {"ok": True}


@router.post("/ui-proxy/{api_name}/bulk-delete")
def ui_proxy_bulk_delete(api_name: str, ids: list = Body(...), table: str | None = None, db: Session = Depends(get_db), _auth: dict = Depends(firebase_dep)):
    api_data = db.query(DBModel).filter(DBModel.api_name == api_name).first()
    if not api_data:
        return Response(status_code=404)
    import re as _re
    tname = table if table else f"data_{api_name}"
    if not _re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', tname):
        return Response(status_code=400, content="Nombre de tabla inválido")
    engine = _get_engine(api_data)
    with engine.connect() as conn:
        for id_val in ids:
            conn.execute(text(f"DELETE FROM {tname} WHERE id = :id"), {"id": id_val})
        conn.commit()
    return {"ok": True, "deleted": len(ids)}
