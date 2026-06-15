import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Treinos.css";

const BICEPS_COMPLETO = [
  { nome: "Rosca Direta", concluido: false },
  { nome: "Rosca Martelo", concluido: false },
  { nome: "Rosca Scott", concluido: false },
];

const isDesktop = () => window.innerWidth >= 768;
const STORAGE_KEY = "treinos";

function Treinos({ onClose }) {
  const navigate = useNavigate();

  const [treinos, setTreinos] = useState([]);
  const [view, setView] = useState("list");
  const [treinoAtivoId, setTreinoAtivoId] = useState(null);
  const [nomeTreino, setNomeTreino] = useState("");
  const [showGrupos, setShowGrupos] = useState(false);
  const [showOpcoes, setShowOpcoes] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setTreinos(JSON.parse(saved));
    } catch (e) {
      /* ignore */
    }
  }, []);

  const salvarTreinos = useCallback((novos) => {
    setTreinos(novos);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novos));
  }, []);

  const criarTreino = () => {
    const nome = nomeTreino.trim();
    if (!nome) return;
    const novoTreino = {
      id: Date.now(),
      nome,
      exercicios: [],
    };
    salvarTreinos([...treinos, novoTreino]);
    setNomeTreino("");
    setView("list");
  };

  const toggleExercicio = (treinoId, exIndex) => {
    const atualizados = treinos.map((t) => {
      if (t.id !== treinoId) return t;
      const novosExercicios = t.exercicios.map((ex, i) =>
        i === exIndex ? { ...ex, concluido: !ex.concluido } : ex
      );
      return { ...t, exercicios: novosExercicios };
    });
    salvarTreinos(atualizados);
  };

  const adicionarBicepsCompleto = (treinoId) => {
    const atualizados = treinos.map((t) => {
      if (t.id !== treinoId) return t;
      return { ...t, exercicios: [...t.exercicios, ...BICEPS_COMPLETO] };
    });
    salvarTreinos(atualizados);
    setShowGrupos(false);
    setShowOpcoes(false);
  };

  const abrirTreino = (treino) => {
    setTreinoAtivoId(treino.id);
    setView("detail");
    setShowGrupos(false);
    setShowOpcoes(false);
  };

  const voltarParaLista = () => {
    setView("list");
    setTreinoAtivoId(null);
    setNomeTreino("");
    setShowGrupos(false);
    setShowOpcoes(false);
  };

  const voltarParaHome = () => {
    if (onClose) {
      onClose();
    } else {
      navigate("/home");
    }
  };

  const treinoAtivo = treinoAtivoId
    ? treinos.find((t) => t.id === treinoAtivoId)
    : null;

  return (
    <div className="treinosContainer">
      <button
        className="btnVoltar"
        style={{ display: isDesktop() ? "none" : "flex" }}
        onClick={() => {
          if (view === "list") voltarParaHome();
          else voltarParaLista();
        }}
      >
        ← Voltar
      </button>

      <h2 className="treinosTitulo">Meus Treinos</h2>

      {/* ── VIEW: CREATE ─────────────────────────────────────────────── */}
      {view === "create" && (
        <div className="treinosCard">
          <label className="treinosLabel">Nome do treino</label>
          <input
            className="treinosInput"
            type="text"
            placeholder="Treino A"
            value={nomeTreino}
            onChange={(e) => setNomeTreino(e.target.value)}
            autoFocus
          />
          <div className="treinosBotoes">
            <button
              className="treinosBtnCancelar"
              onClick={voltarParaLista}
            >
              Cancelar
            </button>
            <button
              className="treinosBtnCriar"
              onClick={criarTreino}
              disabled={!nomeTreino.trim()}
            >
              Criar
            </button>
          </div>
        </div>
      )}

      {/* ── VIEW: DETAIL ─────────────────────────────────────────────── */}
      {view === "detail" && treinoAtivo && (
        <div className="treinosCard">
          <h3 className="treinosNomeTreino">{treinoAtivo.nome}</h3>

          <p className="treinosSubtitulo">Exercícios:</p>

          {treinoAtivo.exercicios.length === 0 ? (
            <p className="treinosVazio">Nenhum exercício adicionado</p>
          ) : (
            <div className="treinosExercicios">
              {treinoAtivo.exercicios.map((ex, i) => (
                <label key={i} className="treinosExercicioItem">
                  <input
                    type="checkbox"
                    checked={ex.concluido}
                    onChange={() => toggleExercicio(treinoAtivo.id, i)}
                    className="treinosCheckbox"
                  />
                  <span
                    className={`treinosExercicioNome${ex.concluido ? " concluido" : ""}`}
                  >
                    {ex.concluido ? "\u2713 " : ""}{ex.nome}
                  </span>
                </label>
              ))}
            </div>
          )}

          {!showGrupos && !showOpcoes && (
            <button
              className="treinosBtnAdicionar"
              onClick={() => setShowGrupos(true)}
            >
              + Adicionar Exercício
            </button>
          )}

          {showGrupos && !showOpcoes && (
            <div className="treinosOpcoes">
              <p className="treinosOpcoesTitulo">Grupo muscular:</p>
              <button
                className="treinosBtnOpcao"
                onClick={() => setShowOpcoes(true)}
              >
                Bíceps
              </button>
              <button
                className="treinosBtnCancelarPequeno"
                onClick={() => setShowGrupos(false)}
              >
                Cancelar
              </button>
            </div>
          )}

          {showOpcoes && (
            <div className="treinosOpcoes">
              <p className="treinosOpcoesTitulo">Tipo de treino:</p>
              <button className="treinosBtnOpcao treinosBtnOpcaoOutline">
                Treino Personalizado
              </button>
              <button
                className="treinosBtnOpcao"
                onClick={() => adicionarBicepsCompleto(treinoAtivo.id)}
              >
                Bíceps Completo
              </button>
              <button
                className="treinosBtnCancelarPequeno"
                onClick={() => {
                  setShowOpcoes(false);
                  setShowGrupos(false);
                }}
              >
                Cancelar
              </button>
            </div>
          )}

          <button className="treinosBtnVoltarLista" onClick={voltarParaLista}>
            ← Voltar para treinos
          </button>
        </div>
      )}

      {/* ── VIEW: LIST ───────────────────────────────────────────────── */}
      {view === "list" && (
        <>
          {treinos.length === 0 ? (
            <div className="treinosVazioEstado">
              <p className="treinosVazioTexto">Nenhum treino cadastrado</p>
              <button
                className="treinosBtnCriar"
                onClick={() => setView("create")}
              >
                + Criar Treino
              </button>
            </div>
          ) : (
            <div className="treinosLista">
              {treinos.map((treino) => {
                const concluidos = treino.exercicios.filter(
                  (ex) => ex.concluido
                ).length;
                const total = treino.exercicios.length;
                return (
                  <div key={treino.id} className="treinosCard treinosCardItem">
                    <h3 className="treinosNomeTreino">{treino.nome}</h3>
                    <p className="treinosContador">
                      {total > 0
                        ? `${concluidos}/${total} exercícios concluídos`
                        : "0 exercícios"}
                    </p>
                    <button
                      className="treinosBtnAbrir"
                      onClick={() => abrirTreino(treino)}
                    >
                      Abrir
                    </button>
                  </div>
                );
              })}
              <button
                className="treinosBtnCriar"
                onClick={() => setView("create")}
              >
                + Criar Treino
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Treinos;
