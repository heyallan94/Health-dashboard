import React from "react";
import { formatarStatusTreino } from "../../utils/dateUtils";
import "./CardMuscle.css";

function CardMuscle({ musculo, onClick }) {
  const dias = musculo.diasDesdeUltimoTreino;
  const status = formatarStatusTreino(dias);

  return (
    <div className="cardMuscle" onClick={onClick}>
      <span className="cardMuscleNome">{musculo.name}</span>
      <span className={`cardMuscleStatus cardMuscleStatus--${status.classe}`}>
        {status.texto}
      </span>
    </div>
  );
}

export default CardMuscle;
