import { useState, useEffect } from "react";
import type { Api, Endpoint, Tabs, Toast } from "../types";
import { getLogs, addEndpoint, deleteEndpoint } from "../services/apiService";
import { firebaseServiceUser } from "../services/FireStoreService";
import PanelHeader from "./PanelHeader";
import PanelTabs from "./tabs/PanelTabs";
import InfoTab from "./tabs/InfoTab";
import EndpointsTab from "./EndpointsTab";
import LogsTab from "./tabs/LogsTab";
import SchemaTab from "./tabs/SchemaTab";

interface PanelProps {
  api: Api;
  close: () => void;
  toggleApi: (name: string, status: string) => Promise<void>;
  restoreApi: (name: string) => Promise<void>;
  showToast: (msg: string, type?: Toast["type"]) => void;
  reload: () => void;
}

export default function Panel({
  api,
  close,
  toggleApi,
  restoreApi,
  showToast,
  reload,
}: PanelProps) {
  const [tab, setTab] = useState<Tabs>("info");
  const [logs, setLogs] = useState<string>("");
  const [logsLoading, setLogsLoading] = useState(false);
  const [addingEp, setAddingEp] = useState<boolean>(false);
  const [newEp, setNewEp] = useState<Endpoint>({
    method: "get",
    path: "/",
    function_name: "get_items",
    logic: "select",
    table: undefined,
    is_public: false,
  });
  const [savingEp, setSavingEp] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const eps = api.endpoints || [];

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(close, 300);
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    setLogs(await getLogs(api.api_name));
    setLogsLoading(false);
  };

  useEffect(() => {
    if (tab === "logs") fetchLogs();
  }, [tab]);

  const handleDeleteEndpoint = async (functionName: string) => {
    try {
      await deleteEndpoint(api.api_name, functionName);
      const updatedEndpoints = eps
        .filter(ep => ep.function_name !== functionName)
        .map(ep => ({
          method: ep.method,
          path: ep.path,
          function_name: ep.function_name,
          logic: ep.logic,
          table: ep.table ?? null,
          is_public: ep.is_public,
        }));
      await firebaseServiceUser.update(api.api_name, { endpoints: updatedEndpoints });
      showToast("Endpoint eliminado · Reconstruyendo contenedor...", "success");
      setTimeout(reload, 5000);
    } catch (e) {
      showToast("Error: " + (e instanceof Error ? e.message : String(e)), "error");
    }
  };

  const handleAddEndpoint = async () => {
    if (!newEp.path.startsWith("/")) {
      showToast("El path debe empezar por /", "error");
      return;
    }
    if (!newEp.function_name || /\s/.test(newEp.function_name)) {
      showToast("Nombre de función inválido", "error");
      return;
    }
    setSavingEp(true);
    try {
      await addEndpoint(api.api_name, newEp);
      // Sync to Firestore so Flutter app sees the new endpoint
      const updatedEndpoints = [...eps, {
        method: newEp.method,
        path: newEp.path,
        function_name: newEp.function_name,
        logic: newEp.logic,
        table: newEp.table ?? null,
        is_public: newEp.is_public,
      }];
      await firebaseServiceUser.update(api.api_name, { endpoints: updatedEndpoints });
      showToast("Endpoint añadido · Reconstruyendo contenedor...", "success");
      setAddingEp(false);
      setNewEp({
        method: "get",
        path: "/",
        function_name: "get_items",
        logic: "select",
        table: undefined,
        is_public: false,
      });
      setTimeout(reload, 5000);
    } catch (e) {
      showToast(
        "Error: " + (e instanceof Error ? e.message : String(e)),
        "error",
      );
    }
    setSavingEp(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[190] backdrop-blur-[2px] md:hidden"
        onClick={handleClose}
      ></div>
      <div className={`fixed top-0 right-0 w-full md:w-[520px] h-screen bg-surface border-l border-borderNormal z-[200] flex flex-col shadow-2xl ${isClosing ? "animate-drawer-out" : "animate-drawer-in"}`}>
        <PanelHeader
          apiName={api.api_name}
          port={api.port}
          backupPort={api.backup_port!!}
          status={api.status}
          backupStatus={api.backup_status}
          onClose={handleClose}
        />

        <PanelTabs
          currentTab={tab}
          endpointsCount={eps.length}
          onTabChange={setTab}
        />

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "info" && (
            <InfoTab
              api={api}
              onToggleApi={toggleApi}
              onRestoreApi={restoreApi}
            />
          )}

          {tab === "endpoints" && (
            <EndpointsTab
              endpoints={eps}
              addingEndpoint={addingEp}
              newEndpoint={newEp}
              savingEndpoint={savingEp}
              onAddingChange={setAddingEp}
              onNewEndpointChange={setNewEp}
              onSubmitEndpoint={handleAddEndpoint}
              onDeleteEndpoint={handleDeleteEndpoint}
            />
          )}

          {tab === "logs" && (
            <LogsTab logs={logs} loading={logsLoading} onRefresh={fetchLogs} />
          )}

          {tab === "schema" && (
            <SchemaTab
              apiName={api.api_name}
              dbType={api.db}
              showToast={showToast}
            />
          )}
        </div>
      </div>
    </>
  );
}
