import { User } from "firebase/auth";
import { useState } from "react";
import CustomTextField from "../CustomTextField";
import DeleteModal from "./DeleteModal";
import { useContextStore } from "../../contextZustand";
import { auth } from "../../FirebaseConfig";
import { deleteApi } from "../../services/apiService";
import LoadingOverlay from "../LoadingOverlay";
import DeleteAccountConfirmationModal from "./DeleteAccountConfirmationModal";
import { firebaseAuth } from "../../services/LogInService";
import { v4 as uuidv4 } from 'uuid';

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
  const [email, setEmail] = useState("");
  const [loadingChangePasswd, setLoadingChangePasswd] = useState(false);
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoadingChangePasswd(true);
      await firebaseAuth.changePasswdEmail(email);
      context.addToast({ msg: "Correo enviado correctamente, revise la bandeja de entrada y spam", type: "success", id: uuidv4() });
      setEmail("");
      setLoadingChangePasswd(false);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Firebase: Error (auth/user-not-found).") {
          context.addToast({ msg: "Correo no encontrado", type: "error", id: uuidv4() });
        } else {
          context.addToast({ msg: "Error al enviar correo" + error.message, type: "error", id: uuidv4() });
        }
      }
      setLoadingChangePasswd(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-3 sm:p-4 md:p-0" onClick={onClose}>
      {deletingApis && (<LoadingOverlay message="Eliminando cuenta..." />)}
      {showDeleteModal && (
        <DeleteAccountConfirmationModal
          user={user}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
        />
      )}
      <div className="w-full max-w-md rounded-xl bg-surface border border-borderNormal p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center mb-3 gap-2 sm:gap-4">
          <h1 className="text-lg sm:text-xl font-bold text-textMain">
            Cambiar Contraseña
          </h1>

          <button
            onClick={() => setIsDeleting(true)}
            className="ml-0 sm:ml-auto text-danger hover:text-danger/80 hover:underline transition-colors text-xs sm:text-sm whitespace-nowrap"
          >
            darse de baja
          </button>
          <button
            onClick={onClose}
            className="text-textSoft hover:text-textMain transition-colors"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>
        {deleteAccount && (
          <DeleteModal
            target="cuenta"
            close={() => setIsDeleting(false)}
            confirm={() => { context.user?.provider === "password" ? setShowDeleteModal(true) : handleDelete(); setIsDeleting(false); }}
          />
        )
        }
        <div className="bg-card border border-borderNormal rounded-lg p-2 sm:p-3 mb-4 sm:mb-6">
          <div className="text-[9px] sm:text-[10px] text-textMuted uppercase font-bold mb-1">
            Email
          </div>
          <p className="text-xs sm:text-sm text-textSoft font-mono break-all">
            {user?.email}
          </p>
        </div>

        {context.user?.provider === "password" ? (
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
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
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-textMain mb-1 sm:mb-2">Cambiar contraseña</h2>
            <p className="text-xs sm:text-sm text-textSoft mb-3 sm:mb-4">Introduce tu correo electrónico para recibir un enlace de restablecimiento de contraseña.</p>

            <CustomTextField
              type="email"
              value={email}
              onChange={setEmail}
              label="Correo electrónico"
              placeholder="ejemplo@correo.com"
            />

            <div className="flex justify-end gap-2">
              {loadingChangePasswd ? (
                <button type="button" disabled className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-borderNormal text-textMuted text-xs font-semibold cursor-not-allowed opacity-50">
                  <i className="fas fa-circle-notch animate-spin mr-1 sm:mr-2"></i>
                  <span className="hidden sm:inline">Enviando...</span>
                  <span className="inline sm:hidden">...</span>
                </button>
              ) : (
                <button type="submit" className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-success hover:bg-opacity-90 text-white text-xs font-semibold transition-all shadow-lg shadow-success/30">
                  Enviar enlace
                </button>
              )}
            </div>
          </form>
        )}

        {context.user?.provider === "password" && (
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 sm:py-2.5 rounded-lg border border-borderLight text-textSoft text-xs sm:text-sm font-semibold hover:text-textMain hover:border-borderNormal transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isPasswordValid}
              className={`flex-1 py-2 sm:py-2.5 rounded-lg text-white text-xs sm:text-sm font-bold transition-all ${isPasswordValid
                ? "bg-success hover:bg-opacity-90 shadow-lg shadow-success/30"
                : "bg-borderNormal text-textMuted cursor-not-allowed opacity-50"
                }`}
            >
              Actualizar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
