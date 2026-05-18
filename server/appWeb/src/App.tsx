import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "./FirebaseConfig";
import LoginScreen from "./screens/LoginScreen";
import MainScreen from "./screens/MainScreen";
import { useContextStore } from "./contextZustand";
import ToastList from "./components/ToastList";
import RegisterScreen from "./screens/RegisterScreen";

export default function App() {
    const context = useContextStore();

    useEffect(() => {
        const unsub = onIdTokenChanged(auth, async (user) => {
            if (user) {
                const token = await user.getIdToken();
                document.cookie = `x_fb_token=${token}; path=/app/; SameSite=Lax; Secure`;
            } else {
                document.cookie = "x_fb_token=; path=/app/; max-age=0; SameSite=Lax; Secure";
            }
        });
        return () => unsub();
    }, []);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<LoginScreen />} />
                <Route path="/main" element={<MainScreen />} />
                <Route path="/register" element={<RegisterScreen />} />
            </Routes>
            <ToastList toasts={context.toastList} />
        </BrowserRouter>
    );
}