import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import "./Exercicio.css";
import {
  EXERCICIOS,
  calcularKcal,
  getMensagem,
  FRASES_EDUCATIVAS,
  calcularConsistencia,
  formatarData,
} from "./ExercicioHelpers.js";

const isDesktop = () => window.innerWidth >= 768;

const FRASE_INICIAL =
  FRASES_EDUCATIVAS[Math.floor(Math.random() * FRASES_EDUCATIVAS.length)];

const aplicarFatorConservador = (kcal) => Math.round(kcal * 0.8);

const intervaloHojeISO = () => {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);

  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);

  return {
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
  };
};

const getExercicioById = (id) => EXERCICIOS.find((ex) => ex.id === id);

const getKcalRegistro = (reg) => Number(reg.kcal_final || 0);

function Exercicio({ onClose }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);

  const [exercicioAtivo, setExercicioAtivo] = useState(EXERCICIOS[0]);
  const carrosselRef = useRef(null);

  const [valor, setValor] = useState("");
  const [resultado, setResultado] = useState(null);

  const [kcalEdit, setKcalEdit] = useState("");
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [registrosHoje, setRegistrosHoje] = useState([]);

  const [historico, setHistorico] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [consistencia, setConsistencia] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from("registros")
      .select("peso, altura, sexo, idade")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) setPerfil(data);
      });
  }, [user?.id]);

  const buscarRegistrosHoje = useCallback(async () => {
    if (!user?.id) return;

    const { inicio, fim } = intervaloHojeISO();

    const { data, error } = await supabase
      .from("gasto_calorico")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_At", inicio)
      .lt("created_At", fim)
      .order("created_At", { ascending: false });

    if (!error && data) {
      setRegistrosHoje(data);
    } else {
      console.warn("Erro ao buscar exercícios de hoje:", error?.message);
      setRegistrosHoje([]);
    }
  }, [user?.id]);

  const carregarHistorico = useCallback(async () => {
    if (!user?.id) return;

    setLoadingHist(true);

    const { data, error } = await supabase
      .from("gasto_calorico")
      .select("*")
      .eq("user_id", user.id)
      .order("created_At", { ascending: false })
      .limit(20);

    if (!error && data) {
      setHistorico(data);
      setConsistencia(calcularConsistencia(data));
    } else {
      console.warn("Erro ao carregar histórico:", error?.message);
    }

    setLoadingHist(false);
  }, [user?.id]);

  useEffect(() => {
    buscarRegistrosHoje();
    carregarHistorico();
  }, [buscarRegistrosHoje, carregarHistorico]);

  useEffect(() => {
    const num = parseFloat(valor);

    if (!num || num <= 0 || !perfil) {
      setResultado(null);
      setConfirmando(false);
      return;
    }

    const calc = calcularKcal(exercicioAtivo.id, num, perfil);

    setResultado({
      ...calc,
      kcal: aplicarFatorConservador(calc.kcal),
    });

    setConfirmando(false);
  }, [exercicioAtivo, valor, perfil]);

  const scrollCarrossel = (dir) => {
    if (!carrosselRef.current) return;
    carrosselRef.current.scrollBy({ left: dir * 160, behavior: "smooth" });
  };

  const handleCalcular = () => {
    if (!resultado || resultado.kcal <= 0) return;

    setKcalEdit(String(resultado.kcal));
    setEditando(false);
    setConfirmando(true);
  };

  const montarMedidas = (num) => {
    const medidas = {
      duracao: null,
      distancia: null,
      passos: null,
    };

    if (exercicioAtivo.inputType === "min") {
      medidas.duracao = num;
    }

    if (exercicioAtivo.inputType === "km") {
      medidas.distancia = num;
      if (resultado?.duracaoMin) medidas.duracao = resultado.duracaoMin;
    }

    if (exercicioAtivo.inputType === "passos") {
      medidas.passos = Math.round(num);
      if (resultado?.duracaoMin) medidas.duracao = resultado.duracaoMin;
    }

    if (exercicioAtivo.inputType === "andares") {
      if (resultado?.duracaoMin) medidas.duracao = resultado.duracaoMin;
    }

    return medidas;
  };

  const handleSalvar = async () => {
    if (!user?.id || !resultado) return;

    if (registrosHoje.length >= 5) {
      alert("Você já salvou 5 atividades hoje. Exclua uma para adicionar outra.");
      return;
    }

    const num = parseFloat(valor);

    if (!num || num <= 0) {
      alert("Informe um valor válido para o exercício.");
      return;
    }

    setSalvando(true);

    const kcalCalculada = Number(resultado.kcal || 0);
    const kcalFinal = editando && kcalEdit ? Number(kcalEdit) : kcalCalculada;
    const valorEditado = editando && kcalEdit ? Number(kcalEdit) : null;
    const medidas = montarMedidas(num);

    const payload = {
      user_id: user.id,
      tipo_exercicio: exercicioAtivo.id,
      valor_calculado: kcalCalculada,
      valor_editado: valorEditado,
      kcal_final: kcalFinal,
      duracao: medidas.duracao,
      distancia: medidas.distancia,
      passos: medidas.passos,
    };

    const { data, error } = await supabase
      .from("gasto_calorico")
      .insert(payload)
      .select()
      .single();

    setSalvando(false);

    if (error) {
      console.warn("Falha ao salvar gasto calórico:", error.message);
      alert("Erro ao salvar exercício.");
      return;
    }

    setRegistrosHoje((prev) => [data, ...prev]);
    setHistorico((prev) => [data, ...prev]);

    setConsistencia((prev) => calcularConsistencia([data, ...historico]));

    setConfirmando(false);
    setEditando(false);
    setValor("");
    setResultado(null);

    carregarHistorico();
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Excluir exercício deste dia?")) return;

    const { error } = await supabase
      .from("gasto_calorico")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (!error) {
      setRegistrosHoje((prev) => prev.filter((r) => r.id !== id));

      setHistorico((prev) => {
        const novo = prev.filter((r) => r.id !== id);
        setConsistencia(calcularConsistencia(novo));
        return novo;
      });
    } else {
      console.warn("Erro ao excluir:", error.message);
    }
  };

  const kcalExibida = editando && kcalEdit ? Number(kcalEdit) : resultado?.kcal ?? 0;
  const mensagem = getMensagem(kcalExibida);

  const totalKcalHoje = registrosHoje.reduce(
    (acc, reg) => acc + getKcalRegistro(reg),
    0
  );

  return (
    <div className="exercicioPage">
      <button
        className="exBtnBack"
        style={{ display: isDesktop() ? "none" : "flex" }}
        onClick={() => (onClose ? onClose() : navigate("/home"))}
      >
        ← Voltar
      </button>

      <div className="exHeader">
        <h1 className="exTitle">Cardio & Gasto</h1>

        {!perfil && (
          <p className="exNoPerfil">
            Crie seu plano primeiro para calcular com precisão.
          </p>
        )}
      </div>

      {consistencia && (
        <div className="exBadgeRow">
          {consistencia.treinouHoje && (
            <span className="exBadge exBadge--green">✓ Treinou hoje</span>
          )}

          {consistencia.diasConsecutivos >= 2 && (
            <span className="exBadge exBadge--blue">
              🔥 {consistencia.diasConsecutivos} dias seguidos
            </span>
          )}

          {consistencia.semanaAtiva && (
            <span className="exBadge exBadge--amber">⭐ Semana ativa</span>
          )}
        </div>
      )}

      {registrosHoje.length > 0 && (
        <div className="exCard exCard--salvoHoje">
          <p className="exCardLabel">
            Exercícios de hoje ({registrosHoje.length}/5)
          </p>

          <p className="exSalvoHojeKcal">
            🔥 Total de hoje: {totalKcalHoje} kcal queimadas
          </p>

          {registrosHoje.map((reg) => {
            const ex = getExercicioById(reg.tipo_exercicio);

            return (
              <div key={reg.id} className="exSalvoHojeRow">
                <span className="exSalvoHojeEmoji">
                  {ex?.emoji ?? "🏃"}
                </span>

                <div className="exSalvoHojeInfo">
                  <p className="exSalvoHojeNome">
                    {ex?.label ?? reg.tipo_exercicio}
                  </p>

                  <p className="exSalvoHojeKcal">
                    🔥 {getKcalRegistro(reg)} kcal queimadas
                  </p>
                </div>

                <button
                  className="exBtnExcluir"
                  onClick={() => handleExcluir(reg.id)}
                >
                  ×
                </button>
              </div>
            );
          })}

          <p className="exSalvoAviso">
            Você pode salvar até 5 atividades por dia.
          </p>
        </div>
      )}

      <section className="exCard">
        <p className="exCardLabel">Qual exercício você fez?</p>

        <div className="exCarrosselWrapper">
          {isDesktop() && (
            <button
              className="exArrow exArrow--left"
              onClick={() => scrollCarrossel(-1)}
            >
              ‹
            </button>
          )}

          <div className="exCarrossel" ref={carrosselRef}>
            {EXERCICIOS.map((ex) => (
              <button
                key={ex.id}
                className={`exExercicioItem ${
                  exercicioAtivo.id === ex.id ? "exExercicioItem--ativo" : ""
                }`}
                onClick={() => {
                  setExercicioAtivo(ex);
                  setValor("");
                  setResultado(null);
                  setConfirmando(false);
                }}
              >
                <span className="exExercicioEmoji">{ex.emoji}</span>
                <span className="exExercicioLabel">{ex.label}</span>
              </button>
            ))}
          </div>

          {isDesktop() && (
            <button
              className="exArrow exArrow--right"
              onClick={() => scrollCarrossel(1)}
            >
              ›
            </button>
          )}
        </div>
      </section>

      <section className="exCard">
        <p className="exCardLabel">{exercicioAtivo.inputLabel}</p>

        <div className="exInputWrapper">
          <input
            className="exInput"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            placeholder={
              exercicioAtivo.inputType === "passos" ? "ex: 8000" :
              exercicioAtivo.inputType === "km" ? "ex: 5.0" :
              exercicioAtivo.inputType === "andares" ? "ex: 10" :
              "ex: 45"
            }
            value={valor}
            onChange={(e) => {
              setValor(e.target.value);
              setConfirmando(false);
            }}
          />

          <span className="exInputUnit">
            {exercicioAtivo.inputType === "km" ? "km" :
             exercicioAtivo.inputType === "passos" ? "passos" :
             exercicioAtivo.inputType === "andares" ? "and." :
             "min"}
          </span>
        </div>

        <p className="exHint">{exercicioAtivo.hint}</p>

        {resultado && resultado.kcal > 0 && !confirmando && (
          <button className="exBtnCalcular" onClick={handleCalcular}>
            Calcular
          </button>
        )}
      </section>

      {confirmando && resultado && resultado.kcal > 0 && (
        <section className={`exCard exCard--resultado exCard--${mensagem.nivel}`}>
          <p className="exCardLabel">Queima estimada</p>

          <div className="exKcalDisplay">
            {editando ? (
              <input
                className="exKcalInput"
                type="number"
                inputMode="numeric"
                value={kcalEdit}
                onChange={(e) => setKcalEdit(e.target.value)}
                placeholder={String(resultado.kcal)}
                autoFocus
              />
            ) : (
              <span className="exKcalValor">~{resultado.kcal}</span>
            )}

            <span className="exKcalUnidade">kcal</span>
          </div>

          {resultado.duracaoMin > 0 && (
            <p className="exDuracao">{resultado.duracaoMin} min estimados</p>
          )}

          <p className="exMensagem">{mensagem.texto}</p>

          <p className="exDisclaimer">
            Estimativa conservadora (−20% sobre MET padrão). Margem real de ±15%.
          </p>

          <div className="exBotoesResultado">
            {editando ? (
              <>
                <button
                  className="exBtnSecondary"
                  onClick={() => setEditando(false)}
                >
                  Cancelar
                </button>

                <button
                  className="exBtnPrimary"
                  onClick={handleSalvar}
                  disabled={salvando}
                >
                  {salvando ? "Salvando..." : "Salvar valor"}
                </button>
              </>
            ) : (
              <>
                <button
                  className="exBtnSecondary"
                  onClick={() => {
                    setEditando(true);
                    setKcalEdit(String(resultado.kcal));
                  }}
                >
                  Editar kcal
                </button>

                <button
                  className="exBtnPrimary"
                  onClick={handleSalvar}
                  disabled={salvando}
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {!resultado && (
        <div className="exFrase">
          <p>💡 {FRASE_INICIAL}</p>
        </div>
      )}

      <section className="exHistoricoSection">
        <h2 className="exHistoricoTitulo">Histórico de cardio</h2>

        {loadingHist && <p className="exHistoricoVazio">Carregando...</p>}

        {!loadingHist && historico.length === 0 && (
          <p className="exHistoricoVazio">Nenhum exercício salvo ainda.</p>
        )}

        <div className="exHistoricoGrid">
          {historico.map((reg) => {
            const ex = getExercicioById(reg.tipo_exercicio);

            return (
              <div key={reg.id} className="exHistoricoCard">
                <span className="exHistoricoEmoji">
                  {ex?.emoji ?? "🏃"}
                </span>

                <div className="exHistoricoInfo">
                  <p className="exHistoricoNome">
                    {ex?.label ?? reg.tipo_exercicio}
                  </p>

                  <p className="exHistoricoData">
                    {formatarData(reg.created_At)}
                  </p>
                </div>

                <div className="exHistoricoKcal">
                  <span className="exHistoricoKcalValor">
                    {getKcalRegistro(reg)}
                  </span>

                  <span className="exHistoricoKcalUnit">kcal</span>
                </div>

                <button
                  className="exBtnExcluirSmall"
                  onClick={() => handleExcluir(reg.id)}
                  title="Excluir"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default Exercicio;
