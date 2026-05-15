import { User } from "firebase/auth";
import { useState } from "react";
import CustomTextField from "../CustomTextField";
import DeleteModal from "./DeleteModal";
import { useContextStore } from "../../contextZustand";
import { auth } from "../../FirebaseConfig";
import { useNavigate } from "react-router-dom";
import { deleteApi } from "../../services/apiService";
import LoadingOverlay from "../LoadingOverlay";
import DeleteAccountConfirmationModal from "./DeleteAccountConfirmationModal";

interface UserModalProps {
  user: User | null;
  onClose: () => void;
  onConfirm: (
    current: string,
    newPass: string,
    confirm: string,
  ) => Promise<boolean>;
}

export function UserModal({ user, onClose, onConfirm }: UserModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isError, setIsError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteAccount, setIsDeleting] = useState(false);
  const [deletingApis, setDeletingApis] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const context = useContextStore();

  const isPasswordValid =
    currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    confirmPassword.length >= 6 &&
    newPassword === confirmPassword &&
    currentPassword !== newPassword;

  const handleConfirm = async () => {
    if (isPasswordValid) {
      const result = await onConfirm(
        currentPassword,
        newPassword,
        confirmPassword,
      );
      if (result) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setIsError(true);
        setErrorMsg("Error al actualizar la contraseña. Inténtalo de nuevo.");
      }
    }
  };

  const handleDelete = async (): Promise<boolean> => {
    try {
      setDeletingApis(true);
      const deletePromises = context.apis.map((api) => deleteApi(api.api_name));
      await Promise.all(deletePromises);
      if (auth.currentUser) {
        await auth.currentUser.delete();
        setDeletingApis(false);
        return true;
      } else {
        setDeletingApis(false);
        return false;
      }
    } catch (error) {
      setDeletingApis(false);
      context.addToast({
        id: crypto.randomUUID(),
        msg: "Hubo un error al procesar la eliminación. Inténtalo de nuevo.",
        type: "error"
      });
      return false;
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
      {deletingApis && (<LoadingOverlay message="Eliminando cuenta..." />)}
      {showDeleteModal && (
        <DeleteAccountConfirmationModal
          user={user}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
        />
      )}
      <div className="w-full max-w-md rounded-xl bg-surface border border-borderNormal p-6 shadow-2xl">
        <div className="flex flex-row items-center mb-3 gap-4">
          <h1 className="text-xl font-bold text-textMain">
            Cambiar Contraseña
          </h1>

          <button
            onClick={() => setIsDeleting(true)}
            className="ml-auto text-danger hover:text-danger/80 hover:underline transition-colors"
          >
            darse de baja
          </button>
        </div>
        {deleteAccount && (
          <DeleteModal
            target="cuenta"
            close={() => setIsDeleting(false)}
            confirm={() => { setIsDeleting(false); setShowDeleteModal(true); }}
          />
        )
        }
        <div className="bg-card border border-borderNormal rounded-lg p-3 mb-6">
          <div className="text-[10px] text-textMuted uppercase font-bold mb-1">
            Email
          </div>
          <p className="text-sm text-textSoft font-mono break-all">
            {user?.email}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <CustomTextField
            label="Contraseña Actual"
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e);
              setIsError(false);
            }}
            placeholder="Ingresa tu contraseña actual"
          />

          <CustomTextField
            label="Nueva Contraseña"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e)
              setIsError(false);
            }}
            placeholder="Ingresa tu nueva contraseña"
          />

          <CustomTextField
            label="Confirmar Nueva Contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e);
              setIsError(false);
            }}
            placeholder="Confirma tu nueva contraseña"
          />

          {newPassword &&
            confirmPassword &&
            newPassword !== confirmPassword && (
              <div className="text-[11px] text-danger bg-dangerBg border border-danger/20 rounded-lg p-2">
                Las contraseñas no coinciden
              </div>
            )}

          {newPassword && newPassword.length < 6 && (
            <div className="text-[11px] text-warning bg-warningBg border border-warning/20 rounded-lg p-2">
              La contraseña debe tener mínimo 6 caracteres
            </div>
          )}

          {isError && (
            <div className="text-[11px] text-danger bg-dangerBg border border-danger/20 rounded-lg p-2">
              {errorMsg}
            </div>
          )}

          {currentPassword &&
            newPassword &&
            currentPassword === newPassword && (
              <div className="text-[11px] text-warning bg-warningBg border border-warning/20 rounded-lg p-2">
                La nueva contraseña debe ser diferente a la actual
              </div>
            )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-borderLight text-textSoft text-xs font-semibold hover:text-textMain hover:border-borderNormal transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isPasswordValid}
            className={`flex-1 py-2.5 rounded-lg text-white text-xs font-bold transition-all ${isPasswordValid
              ? "bg-success hover:bg-opacity-90 shadow-lg shadow-success/30"
              : "bg-borderNormal text-textMuted cursor-not-allowed opacity-50"
              }`}
          >
            Actualizar
          </button>
        </div>
      </div>
    </div>
  );
}
