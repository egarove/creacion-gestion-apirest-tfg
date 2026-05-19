import { useState } from "react";
import type { Api, Toast } from "../types";
import * as ApiService from "../services/apiService";
import DashBoard from "./DashBoard";

interface DashBoardContainerProps {
  onPanelOpen: (api: Api) => void;
  onDeleteTarget: (target: string) => void;
  showToast: (msg: string, type?: Toast["type"]) => void;
  apis: Api[];
  fetchApis: () => void;
  isLoading: boolean;
}

export default function DashBoardContainer({
  onPanelOpen,
  onDeleteTarget,
  apis,
  fetchApis,
  showToast,
  isLoading,
}: DashBoardContainerProps) {

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState("");
  const [dbFilter, setDbFilter] = useState("");
  const [sortParam, setSortParam] = useState("name");

  const runCount = apis.filter((a) => a.status === "running").length;
  const stopCount = apis.length - runCount;
  const epsCount = apis.reduce((s, x) => s + (x.endpoints || []).length, 0);

  // Toggle API
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

  // Restore API
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

  // Filter and sort
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
    <DashBoard
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
      displayedApis={displayedApis}
      handleToggleApi={handleToggleApi}
      handleRestoreApi={handleRestoreApi}
      setPanelApi={onPanelOpen}
      setDeleteTarget={onDeleteTarget}
      isLoading={isLoading}
    />
  );
}
