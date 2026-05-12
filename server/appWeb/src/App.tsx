import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginScreen from "./screens/LoginScreen";
import MainScreen from "./screens/MainScreen";
import { useContextStore } from "./contextZustand";
import ToastList from "./components/ToastList";

export default function App() {
    const context = useContextStore();
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<LoginScreen />} />
                <Route path="/main" element={<MainScreen />} />
            </Routes>
            <ToastList toasts={context.toastList} />
        </BrowserRouter>
    );
}