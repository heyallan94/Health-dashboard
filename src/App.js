import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Forgot from "./pages/Forgot/Forgot";
import Home from "./pages/Home/Home";
import React, { useEffect } from "react";
import KcalDiaria from "./pages/KcalDiaria/KcalDiaria";
import Calendario from "./pages/Calendario/Calendario";
import MeuPlano from "./pages/MeuPlano/MeuPlano";
import Metas from "./pages/Metas/metas";
import Agua from "./pages/agua/Agua";
import Confirmado from "./pages/confirmed/confirmado";
import Exercicio from "./pages/Exercicio/Exercicio";



function App() {

  useEffect(() => {
    const users = JSON.parse(localStorage.getItem("users")) || [];

    const existeTest = users.some(
      (u) => u.email === "test@gmail.com"
    );

    if (!existeTest) {
      const novoUser = {
        id: Date.now(),
        nome: "Test User",
        email: "test@gmail.com",
        senha: "@test"
      };

      localStorage.setItem(
        "users",
        JSON.stringify([...users, novoUser])
      );

      console.log("Usuário padrão criado ✅");
    }
  }, []);

  return (
    <BrowserRouter basename="/Health-dashboard">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/home" element={<Home />} />
        <Route path="/home/kcalDiaria" element={<KcalDiaria />} />
        <Route path="/home/calendario" element={<Calendario />} />
        <Route path="/home/plano" element={<MeuPlano />} />
        <Route path="/home/metas" element={<Metas />} />
        <Route path="/home/agua" element={<Agua />} />
        <Route path="/confirmado" element={<Confirmado />} />
        <Route path="/home/exercicio" element={<Exercicio />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;