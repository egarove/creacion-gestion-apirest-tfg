import { useState } from "react";
import { useContextStore } from "../../contextZustand";
import { firebaseAuth } from "../../services/LogInService";
import { v4 as uuidv4 } from 'uuid';
import CustomTextField from "../CustomTextField";

interface ChangePasswdModalProps {
    onClose: () => void;
}

export default function ChangePasswdModal({ onClose }: ChangePasswdModalProps) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const context = useContextStore();
    const handleConfirm = async () => {
        try {
            setLoading(true);
            await firebaseAuth.changePasswdEmail(email);
            context.addToast({ msg: "Correo enviado correctamente, revise la bandeja de entrada y spam", type: "success", id: uuidv4() });
            onClose();
            setLoading(false);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === "Firebase: Error (auth/user-not-found).") {
                    context.addToast({ msg: "Correo no encontrado", type: "error", id: uuidv4() });
                } else {
                    context.addToast({ msg: "Error al enviar correo" + error.message, type: "error", id: uuidv4() });
                }
            }
            setLoading(false);
        }
    };
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-card rounded-2xl shadow-2xl p-10 max-w-md w-full mx-4 border border-borderNormal relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-textSoft hover:text-textMain hover:bg-white/5">
                    <i className="fas fa-times text-sm"></i>
                </button>
                <h2 className="text-2xl font-bold mb-4 text-textMain">Cambiar contraseña</h2>
                <p className="text-textSoft mb-6">Introduce tu correo electrónico para recibir un enlace de restablecimiento de contraseña.</p>

                <form onSubmit={handleConfirm} className="space-y-4">
                    <CustomTextField
                        type="email"
                        value={email}
                        onChange={setEmail}
                        label="Correo electrónico"
                        prefixIcon="fa-at"
                        placeholder="ejemplo@correo.com"
                    />

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-700 text-textMain transition-colors">
                            Cancelar
                        </button>
                        {loading ? (
                            <button type="button" disabled={loading} className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white transition-colors">
                                <i className="fas fa-circle-notch animate-spin mr-2"></i> Enviando...
                            </button>
                        ) : (
                            <button type="submit" className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white transition-colors">
                                Enviar enlace
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}