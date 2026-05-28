import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import loadingImg from "../../assets/loading.png";
import logoas     from "../../assets/logoas.png";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email,   setEmail]   = useState("");
  const [senha,   setSenha]   = useState("");
  const [erro,    setErro]    = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !senha) {
      setErro("Preencha email e senha");
      return;
    }

    setErro("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        setErro("Email ou senha inválidos ❌");
        return;
      }

      // Persiste nome para uso offline (boas-vindas, header)
      // A sessão JWT é gerenciada automaticamente pelo Supabase no localStorage
      const nome = data.user.user_metadata?.nome || "";
      if (nome) localStorage.setItem("nomeUsuario", nome);

      navigate("/home");

    } catch (err) {
      console.error(err);
      setErro("Erro interno ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="loginPage">

      {loading && (
        <div className="loadingOverlay">
          <img src={loadingImg} alt="loading" className="loadingSpinner" />
        </div>
      )}

      <div className="logoWrapper">
        <img src={logoas} alt="Logo" className="logoImg" />
      </div>

      <div className="loginCard">

        <input
          type="email"
          placeholder="Email"
          className="loginInput"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <input
          type="password"
          placeholder="Senha"
          className="loginInput"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {erro && <span className="loginMessage">{erro}</span>}

        <button className="loginButton" onClick={handleLogin}>
          Entrar
        </button>

        <div className="loginLinks">
          <button className="loginLinkButton" onClick={() => navigate("/register")}>
            Criar conta
          </button>
          <button className="loginLinkButton" onClick={() => navigate("/forgot")}>
            | Esqueci a senha
          </button>
        </div>
        <div className="version">v0.220526</div>
      </div>
    </div>
  );
}

export default Login;