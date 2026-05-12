import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import './index.css'
import LoginScreen from "./screens/LoginScreen";
import MainScreen from "./screens/MainScreen";

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/main" element={<MainScreen />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
