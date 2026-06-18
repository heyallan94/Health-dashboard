import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CardMuscle from "../../components/CardMuscle/CardMuscle";
import { calcularDiasDesde } from "../../utils/dateUtils";
import "./Treinos.css";

const MUSCULOS = [
  { id: "bracos", name: "Bra\u00e7os" },
  { id: "triceps", name: "Tr\u00edceps" },
  { id: "costas", name: "Costas" },
  { id: "ombro", name: "Ombro" },
  { id: "perna", name: "Perna" },
  { id: "abdomen", name: "Abd\u00f4men" },
];

const STORAGE_KEY = "muscleWorkouts";

function Treinos() {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setWorkouts(JSON.parse(saved));
    } catch (e) {
      /* ignore */
    }
  }, []);

  const musculosComStatus = useMemo(() => {
    return MUSCULOS.map((m) => {
      const lastWorkoutDate = workouts[m.id] || null;
      const diasDesdeUltimoTreino = lastWorkoutDate
        ? calcularDiasDesde(lastWorkoutDate)
        : null;
      return {
        ...m,
        lastWorkoutDate,
        diasDesdeUltimoTreino,
      };
    });
  }, [workouts]);

  const handleCardClick = useCallback(
    (musculo) => {
      navigate(`/muscle/${musculo.id}`);
    },
    [navigate]
  );

  return (
    <div className="treinosContainer">
      <button
        className="treinosBtnVoltar"
        onClick={() => navigate(-1)}
        aria-label="Voltar"
      >
        &#8592; Voltar
      </button>

      <h1 className="treinosTitulo">Treinos</h1>

      <div className="treinosGrid">
        {musculosComStatus.map((m) => (
          <CardMuscle
            key={m.id}
            musculo={m}
            onClick={() => handleCardClick(m)}
          />
        ))}
      </div>

      <div className="treinosSecaoCards">
        <div
          className="treinosCardEspecial"
          onClick={() => navigate("/criar-treinos")}
        >
          <span className="treinosCardEspecialNome">Criar treinos</span>
        </div>
        <div
          className="treinosCardEspecial"
          onClick={() => navigate("/treino/iniciantes")}
        >
          <span className="treinosCardEspecialNome">Treino de iniciantes</span>
        </div>
        <div
          className="treinosCardEspecial"
          onClick={() => navigate("/treino/intermediario")}
        >
          <span className="treinosCardEspecialNome">Treino intermediário</span>
        </div>
      </div>
    </div>
  );
}

export default Treinos;
