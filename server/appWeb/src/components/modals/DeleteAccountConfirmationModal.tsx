import { useState } from "react";
import { useContextStore } from "../../contextZustand";
import { useNavigate } from "react-router-dom";
import { User, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import CustomTextField from "../CustomTextField";
import { firebaseServiceUser } from "../../services/FireStoreService";

export interface DeleteAccountModalProps {
    user: User | null;
    onClose: () => void;
    onConfirm: () => Promise<boolean>;
}

export default function DeleteAccountConfirmationModal({
    user,
    onClose,
    onConfirm,
}: DeleteAccountModalProps) {
    const [password, setPassword] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const context = useContextStore();
    const navigate = useNavigate();

    const handleVerifyAndPasswordDelete = async () => {
        if (!password || !user || !user.email) return;

        setIsDeleting(true);
        setErrorMsg("");

        try {
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);
            const success = await onConfirm();

            if (success) {
                context.addToast({
                    id: crypto.randomUUID(),
                    msg: "Cuenta eliminada exitosamente.",
                    type: "success",
                });
                context.clearUser();
                await firebaseServiceUser.delete(["email"], [user.email]);
                context.setUserApisPath("");
                navigate("/login");
                onClose();
            } else {
                setErrorMsg("La contraseña era correcta, pero ocurrió un error al limpiar tus datos del servidor.");
            }
        } catch (error: any) {
            if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
                setErrorMsg("La contraseña introducida es incorrecta.");
            } else if (error.code === "auth/too-many-requests") {
                setErrorMsg("Demasiados intentos fallidos. Inténtalo más tarde.");
            } else {
                setErrorMsg("Error de autenticación. Inténtalo de nuevo.");
            }
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <div className="w-full max-w-sm rounded-xl bg-surface border border-borderNormal p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                <h2 className="text-lg font-bold text-textMain mb-2">
                    Verificación de Seguridad
                </h2>

                <p className="text-xs text-textSoft mb-4 leading-relaxed">
                    Para eliminar definitivamente tu cuenta asociada a <span className="font-mono text-textMain font-semibold">{user?.email}</span>, por favor introduce tu contraseña actual. Esta acción borrará todas tus APIs y no se puede deshacer.
                </p>

                <div className="space-y-4 mb-5">
                    <CustomTextField
                        label="Contraseña"
                        type="password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e);
                            setErrorMsg("");
                        }}
                        placeholder="Introduce tu contraseña para confirmar"
                    />

                    {errorMsg && (
                        <div className="text-[11px] text-danger bg-dangerBg border border-danger/20 rounded-lg p-2">
                            {errorMsg}
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1 py-2 rounded-lg border border-borderLight text-textSoft text-xs font-semibold hover:text-textMain hover:border-borderNormal transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleVerifyAndPasswordDelete}
                        disabled={isDeleting || password.length < 6}
                        className={`flex-1 py-2 rounded-lg text-white text-xs font-bold transition-all ${isDeleting || password.length < 6
                                ? "bg-borderNormal text-textMuted cursor-not-allowed opacity-50"
                                : "bg-danger hover:bg-danger/90 shadow-lg shadow-danger/20"
                            }`}
                    >
                        {isDeleting ? "Procesando..." : "Confirmar Eliminación"}
                    </button>
                </div>
            </div>
        </div>
    );
}