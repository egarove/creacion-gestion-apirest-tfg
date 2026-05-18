import { useEffect, useState } from "react";
import { useContextStore } from "../contextZustand";
import { useNavigate } from "react-router-dom";
import { firebaseAuth } from "../services/LogInService";
import { UserData } from "../types";
import { v4 as uuidv4 } from "uuid";
import CustomTextField from "../components/CustomTextField";
import { collection, setDoc, doc } from "firebase/firestore";
import { fireStore } from "../FirebaseConfig";
import { FirebaseService } from "../services/FireStoreService";

export default function RegisterScreen() {
  const navigate = useNavigate();
  const context = useContextStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const user = context.user;

  useEffect(() => {
    if (user) {
      navigate("/main");
    }
  }, [user, navigate]);

  if (user) return null;

  // Validar email
  const validateEmail = (value: string) => {
    setEmail(value);
    if (!value) {
      setEmailError("El email es requerido");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("Email inválido");
    } else {
      setEmailError("");
    }
  };

  // Validar contraseña
  const validatePassword = (value: string) => {
    setPassword(value);
    if (!value) {
      setPasswordError("La contraseña es requerida");
    } else if (value.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres");
    } else {
      setPasswordError("");
      // Revalidar confirmPassword si ya tiene contenido
      if (confirmPassword && value !== confirmPassword) {
        setConfirmPasswordError("Las contraseñas no coinciden");
      } else if (confirmPassword && value === confirmPassword) {
        setConfirmPasswordError("");
      }
    }
  };

  // Validar confirmación de contraseña
  const validateConfirmPassword = (value: string) => {
    setConfirmPassword(value);
    if (!value) {
      setConfirmPasswordError("Confirmar la contraseña es requerido");
    } else if (value !== password) {
      setConfirmPasswordError("Las contraseñas no coinciden");
    } else {
      setConfirmPasswordError("");
    }
  };

  const isFormValid =
    email.length > 0 &&
    password.length >= 6 &&
    confirmPassword.length >= 6 &&
    password === confirmPassword &&
    !emailError &&
    !passwordError &&
    !confirmPasswordError;

  const handleRegister = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validar una última vez antes de enviar
    if (!isFormValid) {
      return;
    }

    setLoading(true);
    try {
      const newUser = await firebaseAuth.createUser(email, password);

      if (newUser) {
        const firestore = new FirebaseService();

        const userData: UserData = {
          uid: newUser.uid,
          role: "usuario",
          apis: [],
          email: email,
        };

        const firebaseData = {
          createdAt: new Date(),
          email: userData.email,
          role: userData.role,
          provider: "password",
          uid: userData.uid,
        }

        const doc = await firestore.add(firebaseData);

        if (doc != undefined) {
          await firestore.update(doc.id, { ...firebaseData, uid: doc.id });

          context.setUser(userData);

          context.addToast({
            msg: "Cuenta creada correctamente. Bienvenido!",
            type: "success",
            id: uuidv4(),
          });

          navigate("/main");
        }
      } else {
        context.addToast({
          msg: "El email ya está registrado o hay un error",
          type: "error",
          id: uuidv4(),
        });
      }
    } catch (error: any) {
      let errorMsg = "Error al registrar la cuenta";
      if (error.code === "auth/email-already-in-use") {
        errorMsg = "El email ya está registrado";
        setEmailError("Este email ya está registrado");
      } else if (error.code === "auth/invalid-email") {
        errorMsg = "Email inválido";
        setEmailError("Email inválido");
      } else if (error.code === "auth/weak-password") {
        errorMsg = "La contraseña es muy débil";
        setPasswordError("La contraseña es muy débil");
      }

      context.addToast({ msg: errorMsg, type: "error", id: uuidv4() });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg text-textMain font-sans">
      <form
        onSubmit={handleRegister}
        className="bg-card border border-borderNormal rounded-2xl shadow-2xl p-6 sm:p-10 w-full max-w-md mx-4 sm:mx-0 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-500"></div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primaryGlow text-primary mb-4">
            <i className="fas fa-user-plus text-3xl"></i>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-textMain">
            Crear Cuenta
          </h2>
          <p className="text-textSoft mt-2 text-sm">
            Únete para empezar a gestionar tus APIs
          </p>
        </div>

        <div className="space-y-5 mb-8">
          <CustomTextField
            type="email"
            label="Correo electrónico"
            value={email}
            onChange={validateEmail}
            placeholder="ejemplo@correo.com"
            prefixIcon="fa-envelope"
            error={emailError}
          />
          <CustomTextField
            type="password"
            label="Contraseña"
            value={password}
            onChange={validatePassword}
            placeholder="••••••••"
            prefixIcon="fa-lock"
            error={passwordError}
          />
          <CustomTextField
            type="password"
            label="Confirmar Contraseña"
            value={confirmPassword}
            onChange={validateConfirmPassword}
            placeholder="••••••••"
            prefixIcon="fa-lock"
            error={confirmPasswordError}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !isFormValid}
          className="w-full bg-gradient-to-br from-primary to-purple-500 hover:to-purple-600 rounded-xl px-5 py-3 text-white font-bold text-[15px] shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <i className="fas fa-circle-notch animate-spin mr-2"></i>
              Creando cuenta...
            </>
          ) : (
            "Crear Cuenta"
          )}
        </button>

        <div className="mt-8 text-center border-t border-borderNormal/50 pt-6">
          <p className="text-textSoft text-sm">
            ¿Ya tienes una cuenta?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-primary hover:underline font-medium"
            >
              Inicia sesión aquí
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}
