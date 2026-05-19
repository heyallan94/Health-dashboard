import React from "react";
import "./Confirmado.css";
import { useNavigate } from "react-router-dom";

function Confirmado() {
  const navigate = useNavigate();

  return (
    <div className="confirmadoContainer">

      <div className="confirmadoCard">

        <div className="icone">✅</div>

        <h1>Email confirmado</h1>

        <p>
          Sua conta foi ativada com sucesso.
        </p>

        <p className="subtexto">
          Agora você já pode acessar o AS saúde,
          registrar refeições, acompanhar metas,
          consumo de água e muito mais.
        </p>

        <button
          className="btnVoltarLogin"
          onClick={() => navigate("/")}
        >
          Ir para Login
        </button>

      </div>

    </div>
  );
}

export default Confirmado;