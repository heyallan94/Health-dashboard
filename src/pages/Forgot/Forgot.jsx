import React, { useState } from "react";
import "./Forgot.css";
import loadingImg from "../../assets/loading.png";
import logoas     from "../../assets/logoas.png";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";

function Forgot() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRecover = async () => {
    if (!email) {
      setErro("Digite seu email");
      return;
    }

    setErro("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/reset-password",
    });

    setLoading(false);

    if (error) {
      console.log(error);
      setErro("Erro ao enviar email ❌");
      return;
    }

    setErro("Email de recuperação enviado 📩");
  };

  return (
    <div className="container">

      {loading && (
        <div className="overlay">
          <img src={loadingImg} alt="loading" className="loadingImg" />
        </div>
      )}

      <div className="logoContainer">
        <img src="/logoas.png" alt="Logo" className="logoImg" />
      </div>

      <div className="title">Recuperar senha</div>

      <div className="form">

        <input
          type="email"
          placeholder="Email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {erro && <span className="error">{erro}</span>}

        <button
          className="button"
          onClick={handleRecover}
        >
          Enviar recuperação
        </button>

        <div className="links">
          <button
            className="linkButton"
            onClick={() => navigate("/")}
          >
            Voltar ao Login
          </button>
        </div>

      </div>
    </div>
  );
}

export default Forgot;