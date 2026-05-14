import StatCard from "./StatCard";
import { DB_OPTS, LANG_OPTS } from "../constants";
import ApiCard from "./ApiCard";
import { Api } from "../types";

interface StatCardProps {
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
    setShowCreate: (b: boolean) => void;
    displayedApis: Api[];
    handleToggleApi: (api_name: string, action: string) => Promise<void>;
    handleRestoreApi: (api_name: string) => Promise<void>;
    setPanelApi: (api: Api) => void;
    setDeleteTarget: (api_name: string) => void;
}

export default function DashBoard({ apis, runCount, stopCount, epsCount, search, setSearch, filter, setFilter, langFilter, setLangFilter, dbFilter, setDbFilter, sortParam, setSortParam, fetchApis, setShowCreate, displayedApis, handleToggleApi, handleRestoreApi, setPanelApi, setDeleteTarget }: StatCardProps) {

    return (
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
    );
}