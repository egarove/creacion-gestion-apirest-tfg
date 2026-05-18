import { useState, useEffect } from "react";
import type { Api, Toast, UserData } from "../types";
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
import DashBoardContainer from "../components/DashBoardContainer";
import AdminPanel from "../components/AdminPanel";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../FirebaseConfig";

export default function MainScreen() {
  const navigate = useNavigate();
  const context = useContextStore();
  const user = context.user;

  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
  const [panelApi, setPanelApi] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showToast = (msg: string, type: Toast["type"] = "info") => {
    context.addToast({ id: uuidv4(), msg, type });
  };

  const showLoading = (msg: string) => setLoadingMsg(msg);
  const hideLoading = () => setLoadingMsg(null);

  const fetchApis = async (manual = false) => {
    try {
      const data = await ApiService.getAllApis();
      let myApis: Api[];
      if (user?.role === "admin") {
        myApis = data;
      } else {
        const userApiEntries = await firebaseServiceUser.getUserApis(data);
        const userApiNames = new Set(userApiEntries.map((a) => (a as Api).api_name));
        myApis = data.filter((a) => userApiNames.has(a.api_name));
      }
      context.setUserApis(myApis);
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
    if (!user) {
      navigate("/login");
      return;
    }
    const verifyUser = async () => {
      try {
        firebaseServiceUser.setCollection("");
        const userData = await firebaseServiceUser.getByIdentifier<UserData>(
          "email",
          user.email!,
        );

        if (userData == null) {
          context.addToast({
            msg: "Usuario no encontrado en la base de datos",
            type: "error",
            id: uuidv4(),
          });
          context.setUser(null);
          navigate("/login");
        } else {
          context.setUser(userData);
        }
      } catch (error) {
        console.error("Error verificando usuario:", error);
        context.setUser(null);
        navigate("/login");
      }
    };

    verifyUser();
  }, []);

  useEffect(() => {
    if (
      context.userApisPath !== "" &&
      firebaseServiceUser.userCollectionRef !== context.userApisPath
    ) {
      firebaseServiceUser.setCollection(context.userApisPath);
    }
  }, [context.userApisPath]);

  useEffect(() => {
    fetchApis();
    const interval = setInterval(() => fetchApis(), 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) fetchApis();
    });
    return () => unsub();
  }, []);

  const handleDeleteApi = async () => {
    if (!deleteTarget) return;
    showLoading(`Eliminando ${deleteTarget}...`);
    try {
      await ApiService.deleteApi(deleteTarget);
      await firebaseServiceUser.deleteApiDoc(deleteTarget);
      showToast(`API ${deleteTarget} eliminada`, "success");
      setDeleteTarget(null);
      if (panelApi?.api_name === deleteTarget) setPanelApi(null);
    } catch (e) {
      showToast(
        "Error: " + (e instanceof Error ? e.message : String(e)),
        "error",
      );
    }
    hideLoading();
  };

  if (!user) return null;

  return (
    <div className="flex bg-bg text-textMain min-h-screen font-sans no-scrollbar">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-surface border-b border-borderNormal flex items-center px-4 z-40 md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-textSoft hover:text-textMain hover:bg-white/5 transition-colors"
        >
          <i className="fas fa-bars text-lg"></i>
        </button>
        <div className="ml-3 font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-300">
          APIGen Master
        </div>
      </div>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onRefresh={() => {
          fetchApis(true);
        }}
        onNewApi={() => setShowCreate(true)}
      />

      {context.selectedView === "dashboard" ? (
        <DashBoardContainer
          onPanelOpen={setPanelApi}
          onDeleteTarget={setDeleteTarget}
          showToast={showToast}
          apis={context.apis}
          fetchApis={fetchApis}
        />
      ) : (
        <AdminPanel />
      )}

      {/* API Detail Panel */}
      {panelApi && (
        <Panel
          api={panelApi}
          close={() => setPanelApi(null)}
          toggleApi={async () => { }}
          restoreApi={async () => { }}
          showToast={showToast}
          reload={async () => { }}
        />
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateModal
          close={() => setShowCreate(false)}
          reload={async () => { }}
          showLoading={showLoading}
          hideLoading={hideLoading}
          showToast={showToast}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          close={() => setDeleteTarget(null)}
          confirm={handleDeleteApi}
        />
      )}

      {/* Loading Overlay */}
      {loadingMsg && <LoadingOverlay message={loadingMsg} />}
    </div>
  );
}
