import { useState, useEffect } from "react";
import type { Api, Toast } from "../types";
import * as ApiService from "../services/apiService";
import Sidebar from "../components/Sidebar";
import Panel from "../components/Panel";
import CreateModal from "../components/modals/CreateModal";
import DeleteModal from "../components/modals/DeleteModal";
import LoadingOverlay from "../components/LoadingOverlay";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { useContextStore } from "../contextZustand";
import { firebaseServiceUser } from "../services/FireStoreService";
import DashBoard from "../components/DashBoard";
import UserPanel from "../components/UserPanel";

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
      let myApis: Api[];
      if (user?.role === "admin") {
        myApis = data;
      } else {
        // Get this user's API names from Firestore, then keep server data (has status)
        const userApiEntries = await firebaseServiceUser.getUserApis(data);
        const userApiNames = new Set(userApiEntries.map((a) => (a as Api).api_name));
        myApis = data.filter((a) => userApiNames.has(a.api_name));
      }
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
      await firebaseServiceUser.deleteApiDoc(deleteTarget);
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

      {context.selectedView === "dashboard" ? (<DashBoard
        apis={apis}
        runCount={runCount}
        stopCount={stopCount}
        epsCount={epsCount}
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
        langFilter={langFilter}
        setLangFilter={setLangFilter}
        dbFilter={dbFilter}
        setDbFilter={setDbFilter}
        sortParam={sortParam}
        setSortParam={setSortParam}
        fetchApis={fetchApis}
        setShowCreate={setShowCreate}
        displayedApis={displayedApis}
        handleToggleApi={handleToggleApi}
        handleRestoreApi={handleRestoreApi}
        setPanelApi={setPanelApi}
        setDeleteTarget={setDeleteTarget}
      />) : (
        <UserPanel />
      )

      }

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
