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

const FRASE_INICIAL = FRASES_EDUCATIVAS[Math.floor(Math.random() * FRASES_EDUCATIVAS.length)];

function Exercicio({ onClose }) {
  const navigate = useNavigate();

  // ── Auth + perfil ──────────────────────────────────────────────────────────
  const [user,   setUser]   = useState(null);
  const [perfil, setPerfil] = useState(null);

  // ── Seleção de exercício ───────────────────────────────────────────────────
  const [exercicioAtivo, setExercicioAtivo] = useState(EXERCICIOS[0]);
  const carrosselRef = useRef(null);

  // ── Input de atividade ─────────────────────────────────────────────────────
  const [valor, setValor] = useState("");

  // ── Resultado ──────────────────────────────────────────────────────────────
  const [resultado, setResultado]     = useState(null);
  const [editando,  setEditando]      = useState(false);
  const [kcalEdit,  setKcalEdit]      = useState("");
  const [salvando,  setSalvando]      = useState(false);
  const [salvoId,   setSalvoId]       = useState(null);

  // ── Histórico ──────────────────────────────────────────────────────────────
  const [historico,     setHistorico]     = useState([]);
  const [loadingHist,   setLoadingHist]   = useState(false);
  const [consistencia,  setConsistencia]  = useState(null);

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });
  }, []);

  // ── Carrega perfil do Supabase ─────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const buscarPerfil = async () => {
      const { data, error } = await supabase
        .from("registros")
        .select("peso, altura, sexo, idade")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!error && data) setPerfil(data);
    };
    buscarPerfil();
  }, [user?.id]);

  // ── Carrega histórico ──────────────────────────────────────────────────────
  const carregarHistorico = useCallback(async () => {
    if (!user?.id) return;
    setLoadingHist(true);
    const { data, error } = await supabase
      .from("gasto_calorico")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error && data) {
      setHistorico(data);
      setConsistencia(calcularConsistencia(data));
    }
    setLoadingHist(false);
  }, [user?.id]);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  // ── Recalcula ao trocar exercício ou valor ─────────────────────────────────
  useEffect(() => {
    const num = parseFloat(valor);
    if (!num || num <= 0 || !perfil) {
      setResultado(null);
      return;
    }
    const calc = calcularKcal(exercicioAtivo.id, num, perfil);
    setResultado(calc);
  }, [exercicioAtivo, valor, perfil]);

  // ── Scroll do carrossel no desktop com setas ───────────────────────────────
  const scrollCarrossel = (dir) => {
    if (!carrosselRef.current) return;
    carrosselRef.current.scrollBy({ left: dir * 160, behavior: "smooth" });
  };

  // ── Salvar no Supabase ─────────────────────────────────────────────────────
  const handleSalvar = async () => {
    if (!user?.id || !resultado) return;
    setSalvando(true);

    const kcalFinal = editando && kcalEdit ? Number(kcalEdit) : resultado.kcal;
    const num       = parseFloat(valor);

    const payload = {
      user_id:         user.id,
      tipo_exercicio:  exercicioAtivo.id,
      valor_calculado: resultado.kcal,
      valor_editado:   editando && kcalEdit ? Number(kcalEdit) : null,
      kcal_final:      kcalFinal,
      duracao:         exercicioAtivo.inputType === "min"     ? num : resultado.duracaoMin,
      distancia:       ["km"].includes(exercicioAtivo.inputType) ? num : null,
      passos:          exercicioAtivo.inputType === "passos"  ? num : null,
    };

    const { data, error } = await supabase
      .from("gasto_calorico")
      .insert(payload)
      .select()
      .single();

    setSalvando(false);

    if (!error && data) {
      setSalvoId(data.id);
      setEditando(false);
      carregarHistorico();
    } else {
      console.warn("Falha ao salvar gasto calórico:", error?.message);
    }
  };

  // ── Helpers visuais ────────────────────────────────────────────────────────
  const kcalExibida = editando && kcalEdit ? Number(kcalEdit) : resultado?.kcal ?? 0;
  const mensagem    = getMensagem(kcalExibida);

  // ─────────────────────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="exercicioPage">

      {/* Voltar — só mobile */}
      <button
        className="exBtnBack"
        style={{ display: isDesktop() ? "none" : "flex" }}
        onClick={() => (onClose ? onClose() : navigate("/home"))}
      >
        ← Back
      </button>

      {/* Header */}
      <div className="exHeader">
        <h1 className="exTitle">Cardio & Gasto</h1>
        {!perfil && (
          <p className="exNoPerfil">Crie seu plano primeiro para calcular com precisão.</p>
        )}
      </div>

      {/* ── Badges de consistência ── */}
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

      {/* ─────────── CARD 1: Carrossel de exercícios ─────────── */}
      <section className="exCard">
        <p className="exCardLabel">Qual exercício você fez?</p>

        <div className="exCarrosselWrapper">
          {isDesktop() && (
            <button className="exArrow exArrow--left" onClick={() => scrollCarrossel(-1)}>‹</button>
          )}

          <div className="exCarrossel" ref={carrosselRef}>
            {EXERCICIOS.map((ex) => (
              <button
                key={ex.id}
                className={`exExercicioItem ${exercicioAtivo.id === ex.id ? "exExercicioItem--ativo" : ""}`}
                onClick={() => { setExercicioAtivo(ex); setValor(""); setResultado(null); setSalvoId(null); }}
              >
                <span className="exExercicioEmoji">{ex.emoji}</span>
                <span className="exExercicioLabel">{ex.label}</span>
              </button>
            ))}
          </div>

          {isDesktop() && (
            <button className="exArrow exArrow--right" onClick={() => scrollCarrossel(1)}>›</button>
          )}
        </div>
      </section>

      {/* ─────────── CARD 2: Input dinâmico ─────────── */}
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
              exercicioAtivo.inputType === "passos" ? "ex: 8000"  :
              exercicioAtivo.inputType === "km"     ? "ex: 5.0"   :
              exercicioAtivo.inputType === "andares"? "ex: 10"    :
              "ex: 45"
            }
            value={valor}
            onChange={(e) => { setValor(e.target.value); setSalvoId(null); }}
          />
          <span className="exInputUnit">
            {exercicioAtivo.inputType === "km"      ? "km"     :
             exercicioAtivo.inputType === "passos"  ? "passos" :
             exercicioAtivo.inputType === "andares" ? "and."   :
             "min"}
          </span>
        </div>

        <p className="exHint">{exercicioAtivo.hint}</p>
      </section>

      {/* ─────────── CARD 3: Resultado ─────────── */}
      {resultado && resultado.kcal > 0 && (
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
            Estimativa com margem aproximada de ±10%. Valores variam por intensidade e condicionamento físico.
          </p>

          <div className="exBotoesResultado">
            {!salvoId && (
              <>
                {editando ? (
                  <>
                    <button className="exBtnSecondary" onClick={() => setEditando(false)}>
                      Cancelar
                    </button>
                    <button className="exBtnPrimary" onClick={handleSalvar} disabled={salvando}>
                      {salvando ? "Salvando..." : "Salvar valor"}
                    </button>
                  </>
                ) : (
                  <>
                    <button className="exBtnSecondary" onClick={() => { setEditando(true); setKcalEdit(String(resultado.kcal)); }}>
                      Editar gasto
                    </button>
                    <button className="exBtnPrimary" onClick={handleSalvar} disabled={salvando}>
                      {salvando ? "Salvando..." : "Salvar"}
                    </button>
                  </>
                )}
              </>
            )}
            {salvoId && (
              <p className="exSalvoOk">✓ Salvo com sucesso</p>
            )}
          </div>
        </section>
      )}

      {/* Frase educativa */}
      {!resultado && (
        <div className="exFrase">
          <p>💡 {FRASE_INICIAL}</p>
        </div>
      )}

      {/* ─────────── Histórico ─────────── */}
      <section className="exHistoricoSection">
        <h2 className="exHistoricoTitulo">Histórico de cardio</h2>

        {loadingHist && <p className="exHistoricoVazio">Carregando...</p>}

        {!loadingHist && historico.length === 0 && (
          <p className="exHistoricoVazio">Nenhum exercício salvo ainda.</p>
        )}

        <div className="exHistoricoGrid">
          {historico.map((reg) => {
            const ex = EXERCICIOS.find((e) => e.id === reg.tipo_exercicio);
            return (
              <div key={reg.id} className="exHistoricoCard">
                <span className="exHistoricoEmoji">{ex?.emoji ?? "🏃"}</span>
                <div className="exHistoricoInfo">
                  <p className="exHistoricoNome">{ex?.label ?? reg.tipo_exercicio}</p>
                  <p className="exHistoricoData">{formatarData(reg.created_at)}</p>
                </div>
                <div className="exHistoricoKcal">
                  <span className="exHistoricoKcalValor">
                    {reg.valor_editado ?? reg.kcal_final}
                  </span>
                  <span className="exHistoricoKcalUnit">kcal</span>
                  {reg.valor_editado && (
                    <span className="exHistoricoEditadoBadge">editado</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}

export default Exercicio;