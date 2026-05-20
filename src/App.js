import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Forgot from "./pages/Forgot/Forgot";
import Confirmado from "./pages/confirmed/confirmado";

import Home from "./pages/Home/Home";
import KcalDiaria from "./pages/KcalDiaria/KcalDiaria";
import Calendario from "./pages/Calendario/Calendario";
import MeuPlano from "./pages/MeuPlano/MeuPlano";
import Metas from "./pages/Metas/metas";
import Agua from "./pages/agua/Agua";
import Exercicio from "./pages/Exercicio/Exercicio";

// Components
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter basename="/Health-dashboard">
      <Routes>

        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/confirmado" element={<Confirmado />} />

        {/* PRIVATE ROUTES */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home/kcaldiaria"
          element={
            <ProtectedRoute>
              <KcalDiaria />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home/calendario"
          element={
            <ProtectedRoute>
              <Calendario />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home/plano"
          element={
            <ProtectedRoute>
              <MeuPlano />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home/metas"
          element={
            <ProtectedRoute>
              <Metas />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home/agua"
          element={
            <ProtectedRoute>
              <Agua />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home/exercicio"
          element={
            <ProtectedRoute>
              <Exercicio />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;