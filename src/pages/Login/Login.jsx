import React, { useState } from "react";
import "./Login.css";
import { useNavigate } from "react-router-dom";
import { SupabaseClient } from "@supabase/supabase-js";
import loadingImg from "/TI 2026/React/login-app/src/components/assets/loading.png";
import { supabase } from "../../services/supabaseClient";


function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !senha) {
      setErro("Preencha email e senha");
      return;
    }

    setErro("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: senha,
    });

    setLoading(false);

    if (error) {
      setErro("Email ou senha inválidos ❌");
      return;
    }

    // login ok
    console.log("Usuário logado:", data.user);

    setErro("Login autorizado ✅");

    setTimeout(() => {
      navigate("/home");
    }, 800);
  };

  return (
    <div className="container">

      {/* LOADING */}
      {loading && (
        <div className="overlay">
          <img src={loadingImg} alt="loading" className="loadingImg" />
        </div>
      )}

      {/* LOGO */}
      <div className="logoContainer">
        <img src="/logoas.png" alt="Logo" className="logoImg" />
      </div>

      {/* FORM */}
      <div className="form">

        <input
          type="email"
          placeholder="Email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          className="input"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        {erro && <span className="error">{erro}</span>}

        <button className="button" onClick={handleLogin}>
          Entrar
        </button>

        <div className="links">
          <button
            className="linkButton"
            onClick={() => navigate("/Register")}
          >
            Criar conta 
          </button>

          <button
            className="linkButton"
            onClick={() => navigate("/Forgot")}
          >
           | Esqueci a senha
          </button>
        </div>

      </div>
    </div>
  );
}

export default Login;