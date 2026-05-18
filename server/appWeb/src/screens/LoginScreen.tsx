import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { firebaseAuth } from "../services/LogInService";
import { useContextStore } from "../contextZustand";
import { UserData } from "../types";
import { firebaseServiceUser, FirebaseService } from "../services/FireStoreService";
import { v4 as uuidv4 } from "uuid";
import ChangePasswdModal from "../components/modals/ChangePasswdModal";
import CustomTextField from "../components/CustomTextField";

export default function LoginScreen() {
  const navigate = useNavigate();
  const context = useContextStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [changePasswdModal, setChangePasswdModal] = useState(false);
  const user = context.user;
  useEffect(() => {
    if (user) {
      navigate("/main");
    }
  }, [user, navigate]);
  if (user) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const credential = await firebaseAuth.signInWithGoogle();
      const fbUser = credential.user;

      // Buscar usuario en Firestore por email
      let userData = await firebaseServiceUser.getByIdentifier<UserData>("email", fbUser.email!);

      if (!userData) {
        // Primera vez con Google: crear documento en Firestore
        const firestore = new FirebaseService();
        const firebaseData = {
          createdAt: new Date(),
          email: fbUser.email,
          role: "usuario",
          provider: "google",
          uid: fbUser.uid,
        };
        const docRef = await firestore.add(firebaseData);
        if (docRef) {
          await firestore.update(docRef.id, { ...firebaseData, uid: docRef.id });
          userData = { uid: docRef.id, role: "usuario", apis: [], email: fbUser.email ?? undefined };
        }
      }

      if (userData) {
        context.setUser(userData);
        const path = `${userData.uid}/apis`;
        firebaseServiceUser.setCollection(path);
        context.setUserApisPath(path);
        navigate("/main");
        context.addToast({ msg: "Sesión iniciada con Google", type: "success", id: uuidv4() });
      } else {
        context.addToast({ msg: "Error al obtener datos de usuario", type: "error", id: uuidv4() });
      }
    } catch (error) {
      context.addToast({ msg: "Error al iniciar sesión con Google", type: "error", id: uuidv4() });
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await firebaseAuth.signIn(username, password);
      if (user != undefined) {
        const userData = await firebaseServiceUser.getByIdentifier<UserData>(
          "email",
          user.email!,
        );
        if (userData != null) {
          context.setUser(userData);
          const path = `${userData.uid}/apis`;
          firebaseServiceUser.setCollection(path);
          context.setUserApisPath(path);
          console.log(firebaseServiceUser.userCollectionRef);
          navigate("/main");
          context.addToast({
            msg: "Usuario logueado correctamente",
            type: "success",
            id: uuidv4(),
          });
        } else {
          context.addToast({
            msg: "Usuario no encontrado",
            type: "error",
            id: uuidv4(),
          });
        }
      } else {
        context.addToast({
          msg: "Credenciales incorrectas",
          type: "error",
          id: uuidv4(),
        });
      }
      setLoading(false);
    } catch (error) {
      context.addToast({
        msg: "Error al iniciar sesión",
        type: "error",
        id: uuidv4(),
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg text-textMain font-sans">
      {changePasswdModal && (
        <ChangePasswdModal
          onClose={() => {
            setChangePasswdModal(false);
          }}
        />
      )}
      <form
        onSubmit={handleLogin}
        className="bg-card border border-borderNormal rounded-2xl shadow-2xl p-6 sm:p-10 w-full max-w-md mx-4 sm:mx-0 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-500"></div>

        <div className="text-center mb-8">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 rounded-2xl object-contain mx-auto mb-4" />
          <h2 className="text-3xl font-extrabold tracking-tight text-textMain">
            Bienvenido
          </h2>
          <p className="text-textSoft mt-2 text-sm">
            Inicia sesión para gestionar tus APIs
          </p>
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
                onClick={() => {
                  setChangePasswdModal(true);
                }}
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
          {loading ? (
            <>
              <i className="fas fa-circle-notch animate-spin mr-2"></i>{" "}
              Entrando...
            </>
          ) : (
            "Entrar al Panel"
          )}
        </button>
        <div className="mt-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-borderNormal/50"></div>
            <span className="text-textMuted text-xs">o continúa con</span>
            <div className="flex-1 h-px bg-borderNormal/50"></div>
          </div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-borderNormal rounded-xl px-5 py-3 text-textMain text-sm font-semibold hover:bg-white/5 transition-all disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
        </div>

        <div className="mt-6 text-center border-t border-borderNormal/50 pt-6">
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
