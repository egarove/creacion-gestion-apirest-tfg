import StatCard from "./StatCard";
import { DB_OPTS, LANG_OPTS } from "../constants";
import ApiCard from "./ApiCard";
import { Api, Toast } from "../types";
import CustomSelector from "./CustomSelector";
import { useState } from "react";
import CreateModal from "./modals/CreateModal";
import { useContextStore } from "../contextZustand";
import LoadingOverlay from "./LoadingOverlay";

interface DashBoardProps {
    apis: any[];
    runCount: number;
    stopCount: number;
    epsCount: number;
    search: string;
    setSearch: (s: string) => void;
    filter: string;
    setFilter: (f: string) => void;
    langFilter: string;
    setLangFilter: (f: string) => void;
    dbFilter: string;
    setDbFilter: (f: string) => void;
    sortParam: string;
    setSortParam: (s: string) => void;
    fetchApis: (force?: boolean) => void;
    displayedApis: Api[];
    handleToggleApi: (api_name: string, action: string) => Promise<void>;
    handleRestoreApi: (api_name: string) => Promise<void>;
    setPanelApi: (api: Api) => void;
    setDeleteTarget: (api_name: string) => void;
}

export default function DashBoard({
    apis,
    runCount,
    stopCount,
    epsCount,
    search,
    setSearch,
    filter,
    setFilter,
    langFilter,
    setLangFilter,
    dbFilter,
    setDbFilter,
    sortParam,
    setSortParam,
    fetchApis,
    displayedApis,
    handleToggleApi,
    handleRestoreApi,
    setPanelApi,
    setDeleteTarget
}: DashBoardProps) {
    const [showCreate, setShowCreate] = useState(false);
    const showLoading = (msg: string) => setLoadingMsg(msg);
    const hideLoading = () => setLoadingMsg(null);
    const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
    const context = useContextStore();
    const showToast = (msg: string, type: Toast["type"] = "info") => {
        context.addToast({ id: crypto.randomUUID(), msg, type });
    };


    return (
        <>
        {loadingMsg && <LoadingOverlay message={loadingMsg} />}
        {showCreate && (
            <CreateModal
                close={() => setShowCreate(false)}
                reload={async () => { fetchApis(); }}
                showLoading={showLoading}
                hideLoading={hideLoading}
                showToast={showToast}
            />
        )}
        <main className="ml-0 md:ml-[270px] flex-1 p-4 md:p-8 pt-[4.5rem] md:pt-8 min-h-screen">
            {/* Header Section */}
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-extrabold leading-none">Panel de Control</h1>
                <p className="text-sm text-textMuted mt-2">
                    {apis.length} APIs · {runCount} en ejecución · {epsCount} endpoints
                </p>
            </div>

            {/* Top Actions Bar */}
            <div className="flex flex-wrap items-center gap-3 mb-6 md:mb-8">
                <div className="relative flex-1 min-w-[160px]">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-textMuted text-sm"></i>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        type="text"
                        placeholder="Buscar API..."
                        className="w-full bg-card border border-borderNormal rounded-xl py-2.5 pr-4 pl-10 text-sm focus:border-primary focus:ring-2 focus:ring-primaryGlow outline-none transition-all text-textMain"
                    />
                </div>
                <button
                    onClick={() => fetchApis(true)}
                    className="bg-card border border-borderNormal rounded-xl px-4 py-2.5 text-textSoft hover:text-textMain hover:border-borderLight transition-all flex items-center gap-2 text-sm"
                    title="Actualizar"
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                    label="Detenidas"
                    value={stopCount}
                    color="red"
                />
                <StatCard
                    icon="fa-code-branch"
                    label="Endpoints"
                    value={epsCount}
                    color="blue"
                />
            </div>

            {/* Filters Section */}
            <div className="bg-card border border-borderNormal rounded-2xl p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Status Filter */}
                    <div className="flex bg-bg rounded-lg overflow-hidden border border-borderNormal">
                        {["all", "running", "stopped"].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${filter === f
                                    ? "bg-primary text-white"
                                    : "text-textMuted hover:text-textMain"
                                    }`}
                            >
                                {f === "all"
                                    ? "Todas"
                                    : f === "running"
                                        ? "En ejecución"
                                        : "Detenidas"}
                            </button>
                        ))}
                    </div>

                    {/* Language Filter */}
                    <CustomSelector
                        options={Object.keys(LANG_OPTS).map((k) => ({ value: k, label: LANG_OPTS[k].label }))}
                        value={langFilter}
                        onChange={(e) => setLangFilter(e)}
                    />

                    {/* Database Filter */}
                    <CustomSelector
                        options={Object.keys(DB_OPTS).map((k) => ({ value: k, label: DB_OPTS[k].label }))}
                        value={dbFilter}
                        onChange={(e) => setDbFilter(e)}
                    />

                    {/* Sort */}
                    <CustomSelector
                        value={sortParam}
                        options={[
                            { value: "name", label: "Nombre" },
                            { value: "status", label: "Estado" },
                            { value: "port", label: "Puerto" },
                            { value: "eps", label: "Endpoints" },
                        ]}
                        onChange={(e) => setSortParam(e)}
                    />

                    {/* Result Count */}
                    <div className="ml-auto flex items-center text-xs text-textMuted whitespace-nowrap">
                        {displayedApis.length} de {apis.length}
                    </div>
                </div>
            </div>

            {/* APIs Grid or Empty State */}
            {
                displayedApis.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 bg-card border-2 border-dashed border-borderNormal rounded-2xl gap-4 text-center">
                        <div className="text-5xl text-borderLight">
                            <i className="fas fa-inbox"></i>
                        </div>
                        <h3 className="text-lg font-semibold text-textSoft">
                            {apis.length === 0 ? "No hay APIs" : "Sin resultados"}
                        </h3>
                        <p className="text-sm text-textMuted">
                            {apis.length === 0
                                ? 'Crea tu primera API para comenzar'
                                : "Ajusta los filtros para ver más"}
                        </p>
                        {apis.length === 0 && (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-br from-primary to-purple-500 text-white font-bold text-sm hover:shadow-lg transition-all"
                            >
                                <i className="fas fa-plus mr-2"></i>Nueva API
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                )
            }
        </main>
        </>
    );
}