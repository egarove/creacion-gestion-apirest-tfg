import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { firebaseAuth } from "../services/LogInService";
import { useContextStore } from "../contextZustand";
import { UserData } from "../types";
import { firebaseServiceUser } from "../services/FireStoreService";
import { v4 as uuidv4 } from 'uuid';
import ChangePasswdModal from "../components/modals/ChangePasswdModal";
import CustomTextField from "../components/CustomTextField";

export default function LoginScreen() {
    const navigate = useNavigate();
    const context = useContextStore();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [changePasswdModal, setChangePasswdModal] = useState(false);

    const handleLogin = async (e: React.SubmitEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const user = await firebaseAuth.signIn(username, password);
            if (user != undefined) {
                const userData = await firebaseServiceUser.getByIdentifier<UserData>("email", user.email!);
                if (userData != null) {
                    context.setUser(userData);
                    firebaseServiceUser.setCollection(userData.uid);
                    navigate("/main");
                    context.addToast({ msg: "Usuario logueado correctamente", type: "success", id: uuidv4() });
                } else {
                    context.addToast({ msg: "Usuario no encontrado", type: "error", id: uuidv4() });
                }
            } else {
                context.addToast({ msg: "Credenciales incorrectas", type: "error", id: uuidv4() });
            }
            setLoading(false);
        } catch (error) {
            context.addToast({ msg: "Error al iniciar sesión", type: "error", id: uuidv4() });
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-bg text-textMain font-sans">
            {changePasswdModal && <ChangePasswdModal onClose={() => { setChangePasswdModal(false); }} />}
            <form onSubmit={handleLogin} className="bg-card border border-borderNormal rounded-2xl shadow-2xl p-10 w-full max-w-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-500"></div>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primaryGlow text-primary mb-4">
                        <i className="fas fa-cubes text-3xl"></i>
                    </div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-textMain">Bienvenido</h2>
                    <p className="text-textSoft mt-2 text-sm">Inicia sesión para gestionar tus APIs</p>
                </div>
                <div className="space-y-5 mb-8">
                    <CustomTextField
                        type="email"
                        label="Correo electrónico"
                        value={username}
                        onChange={setUsername}
                        placeholder="ejemplo@correo.com"
                        prefixIcon="fa-envelope"
                    />
                    <div>
                        <label className="flex text-textSoft text-sm font-semibold mb-2 justify-between items-center">
                            Contraseña
                            <button
                                type="button"
                                onClick={() => { setChangePasswdModal(true); }}
                                className="text-primary hover:underline font-medium text-xs"
                            >
                                ¿Olvidaste la contraseña?
                            </button>
                        </label>
                        <CustomTextField
                            type="password"
                            value={password}
                            onChange={setPassword}
                            placeholder="••••••••"
                            prefixIcon="fa-lock"
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-br from-primary to-purple-500 hover:to-purple-600 rounded-xl px-5 py-3 text-white font-bold text-[15px] shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center disabled:opacity-50"
                >
                    {loading ? <><i className="fas fa-circle-notch animate-spin mr-2"></i> Entrando...</> : "Entrar al Panel"}
                </button>
                <div className="mt-8 text-center border-t border-borderNormal/50 pt-6">
                    <p className="text-textSoft text-sm">
                        ¿No tienes una cuenta?{" "}
                        <button
                            type="button" 
                            onClick={() => navigate("/register")}
                            className="text-primary hover:text-purple-400 font-bold transition-colors"
                        >
                            Regístrate ahora
                        </button>
                    </p>
                </div>
            </form>
        </div>
    );
}