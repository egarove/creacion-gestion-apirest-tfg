import { useState, useEffect } from "react";
import type { Api, Toast } from "../types";
import { LANG_OPTS, DB_OPTS } from "../constants";
import * as ApiService from "../services/apiService";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import ApiCard from "../components/ApiCard";
import Panel from "../components/Panel";
import CreateModal from "../components/modals/CreateModal";
import DeleteModal from "../components/modals/DeleteModal";
import LoadingOverlay from "../components/LoadingOverlay";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { useContextStore } from "../contextZustand";
import { firebaseServiceUser } from "../services/FireStoreService";

export default function App() {
  const navigate = useNavigate();
  const context = useContextStore();
  const user = context.user;
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);
  if (!user) return null;

  const [apis, setApis] = useState<Api[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState("");
  const [dbFilter, setDbFilter] = useState("");
  const [sortParam, setSortParam] = useState("name");

  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);

  const [panelApi, setPanelApi] = useState<Api | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const runCount = apis.filter((a) => a.status === "running").length;
  const stopCount = apis.length - runCount;
  const epsCount = apis.reduce((s, x) => s + (x.endpoints || []).length, 0);

  const showToast = (msg: string, type: Toast["type"] = "info") => {
    context.addToast({ id: uuidv4(), msg, type });
  };

  useEffect(() => {
    if (
      context.userApisPath !== "" &&
      firebaseServiceUser.userCollectionRef !== context.userApisPath
    ) {
      firebaseServiceUser.setCollection(context.userApisPath);
      console.log(
        "Collection set to: " + firebaseServiceUser.userCollectionRef,
      );
    }
  }, [context.userApisPath]);

  const showLoading = (msg: string) => setLoadingMsg(msg);
  const hideLoading = () => setLoadingMsg(null);

  const fetchApis = async (manual = false) => {
    try {
      const data = await ApiService.getAllApis();
      const userApis = await firebaseServiceUser.getUserApis(data);
      context.setUserApis(userApis);
      console.log(user);
      const myApis =
        user?.role === "admin"
          ? data
          : user?.apis
            ? data.filter((a) =>
                user?.apis?.map((api) => api.api_name).includes(a.api_name),
              )
            : [];
      setApis(myApis);
      if (panelApi) {
        const updated = myApis.find((a) => a.api_name === panelApi.api_name);
        if (updated) setPanelApi(updated);
      }
      if (manual) showToast("APIs actualizadas", "success");
    } catch (err) {
      showToast(
        "Error al cargar APIs: " +
          (err instanceof Error ? err.message : String(err)),
        "error",
      );
    }
  };

  useEffect(() => {
    fetchApis();
    const interval = setInterval(() => fetchApis(), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleApi = async (name: string, status: string) => {
    try {
      await ApiService.toggleApi(name, status);
      showToast(
        `API ${name} ${status === "running" ? "detenida" : "iniciada"}`,
        "success",
      );
      fetchApis();
    } catch (e) {
      showToast(
        "Error: " + (e instanceof Error ? e.message : String(e)),
        "error",
      );
    }
  };

  const handleRestoreApi = async (name: string) => {
    try {
      await ApiService.restoreApi(name);
      showToast(`Restaurando ${name}...`, "info");
      setTimeout(fetchApis, 3000);
    } catch (e) {
      showToast(
        "Error: " + (e instanceof Error ? e.message : String(e)),
        "error",
      );
    }
  };

  const handleDeleteApi = async () => {
    if (!deleteTarget) return;
    showLoading(`Eliminando ${deleteTarget}...`);
    try {
      await ApiService.deleteApi(deleteTarget);
      showToast(`API ${deleteTarget} eliminada`, "success");
      setDeleteTarget(null);
      if (panelApi?.api_name === deleteTarget) setPanelApi(null);
      fetchApis();
    } catch (e) {
      showToast(
        "Error: " + (e instanceof Error ? e.message : String(e)),
        "error",
      );
    }
    hideLoading();
  };

  let displayedApis = [...apis];
  if (filter === "running")
    displayedApis = displayedApis.filter((a) => a.status === "running");
  if (filter === "stopped")
    displayedApis = displayedApis.filter((a) => a.status !== "running");
  if (search)
    displayedApis = displayedApis.filter((a) =>
      a.api_name.includes(search.toLowerCase()),
    );
  if (langFilter)
    displayedApis = displayedApis.filter(
      (a) => (a.language || "python") === langFilter,
    );
  if (dbFilter) displayedApis = displayedApis.filter((a) => a.db === dbFilter);

  if (sortParam === "name")
    displayedApis.sort((a, b) => a.api_name.localeCompare(b.api_name));
  else if (sortParam === "status")
    displayedApis.sort(
      (a, b) =>
        (a.status === "running" ? 0 : 1) - (b.status === "running" ? 0 : 1),
    );
  else if (sortParam === "port") displayedApis.sort((a, b) => a.port - b.port);
  else if (sortParam === "eps")
    displayedApis.sort(
      (a, b) => (b.endpoints || []).length - (a.endpoints || []).length,
    );

  return (
    <div className="flex bg-bg text-textMain min-h-screen font-sans no-scrollbar">
      <Sidebar
        apis={apis}
        runCount={runCount}
        stopCount={stopCount}
        epsCount={epsCount}
        onRefresh={() => fetchApis(true)}
        onNewApi={() => setShowCreate(true)}
      />

      <main className="ml-[270px] flex-1 p-8 min-h-screen">
        {/* Header */}
        <header className="flex flex-wrap items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold leading-none">
              Panel de Control
            </h1>
            <p className="text-sm text-textMuted mt-1">
              {apis.length} APIs · {runCount} en ejecución · {epsCount}{" "}
              endpoints
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-textMuted text-sm"></i>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                type="text"
                placeholder="Buscar API..."
                className="bg-card border border-borderNormal rounded-xl py-2.5 pr-4 pl-10 text-sm w-60 focus:border-primary focus:ring-2 focus:ring-primaryGlow outline-none transition-all text-textMain"
              />
            </div>
            <button
              onClick={() => fetchApis(true)}
              className="bg-card border border-borderNormal rounded-xl px-4 py-2.5 text-textSoft hover:text-textMain hover:border-borderLight transition-all flex items-center gap-2 text-sm"
            >
              <i className="fas fa-sync-alt"></i>
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-gradient-to-br from-primary to-purple-500 rounded-xl px-5 py-2.5 text-white font-bold text-sm shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] hover:-translate-y-px transition-all flex items-center gap-2"
            >
              <i className="fas fa-plus"></i> Nueva API
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard
            icon="fa-layer-group"
            label="Total APIs"
            value={apis.length}
            color="purple"
          />
          <StatCard
            icon="fa-play-circle"
            label="En ejecución"
            value={runCount}
            color="green"
          />
          <StatCard
            icon="fa-stop-circle"
            label="Detenidas / Error"
            value={stopCount}
            color="red"
          />
          <StatCard
            icon="fa-code-branch"
            label="Total Endpoints"
            value={epsCount}
            color="blue"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex bg-card border border-borderNormal rounded-xl overflow-hidden">
            {["all", "running", "stopped"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${filter === f ? "bg-primary text-white" : "text-textMuted hover:text-textMain"}`}
              >
                {f === "all"
                  ? "Todas"
                  : f === "running"
                    ? "En ejecución"
                    : "Detenidas"}
              </button>
            ))}
          </div>
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="bg-card border border-borderNormal rounded-xl px-3 py-2 text-xs text-textSoft outline-none cursor-pointer focus:border-primary"
          >
            <option value="">Todos los lenguajes</option>
            {Object.keys(LANG_OPTS).map((k) => (
              <option key={k} value={k}>
                {LANG_OPTS[k].label}
              </option>
            ))}
          </select>
          <select
            value={dbFilter}
            onChange={(e) => setDbFilter(e.target.value)}
            className="bg-card border border-borderNormal rounded-xl px-3 py-2 text-xs text-textSoft outline-none cursor-pointer focus:border-primary"
          >
            <option value="">Todas las BD</option>
            {Object.keys(DB_OPTS).map((k) => (
              <option key={k} value={k}>
                {DB_OPTS[k].label}
              </option>
            ))}
          </select>
          <select
            value={sortParam}
            onChange={(e) => setSortParam(e.target.value)}
            className="bg-card border border-borderNormal rounded-xl px-3 py-2 text-xs text-textSoft outline-none cursor-pointer focus:border-primary"
          >
            <option value="name">Ordenar: Nombre</option>
            <option value="status">Ordenar: Estado</option>
            <option value="port">Ordenar: Puerto</option>
            <option value="eps">Ordenar: Endpoints</option>
          </select>
          <span className="ml-auto text-xs text-textMuted">
            {displayedApis.length} de {apis.length} APIs
          </span>
        </div>

        {/* API Grid */}
        {displayedApis.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 bg-card border-2 border-dashed border-borderNormal rounded-2xl gap-4 text-center">
            <div className="text-5xl text-borderLight">
              <i className="fas fa-wind"></i>
            </div>
            <h3 className="text-lg text-textSoft">
              {apis.length === 0 ? "No hay APIs creadas" : "Sin resultados"}
            </h3>
            <p className="text-sm text-textMuted">
              {apis.length === 0
                ? 'Pulsa "+ Nueva API" para crear tu primera.'
                : "Ajusta los filtros."}
            </p>
            {apis.length === 0 && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-primary to-purple-500 text-white font-bold text-sm"
              >
                <i className="fas fa-plus mr-2"></i>Nueva API
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-5">
            {displayedApis.map((api) => (
              <ApiCard
                key={api.api_name}
                api={api}
                toggleApi={handleToggleApi}
                restoreApi={handleRestoreApi}
                openPanel={() => setPanelApi(api)}
                setDeleteTarget={() => setDeleteTarget(api.api_name)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Overlays y modales */}
      {panelApi && (
        <Panel
          api={panelApi}
          close={() => setPanelApi(null)}
          toggleApi={handleToggleApi}
          restoreApi={handleRestoreApi}
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
        <DeleteModal
          target={deleteTarget}
          close={() => setDeleteTarget(null)}
          confirm={handleDeleteApi}
        />
      )}
      {loadingMsg && <LoadingOverlay message={loadingMsg} />}
    </div>
  );
}
