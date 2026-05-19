import { supabase } from "../../services/supabaseClient";
import React, { useEffect, useState, useCallback } from "react";
import "./Calendario.css";
import { useNavigate } from "react-router-dom";

const isDesktop = () => window.innerWidth >= 768;

// ─────────────────────────────────────────────────────────────────────────────
//  Agrupa linhas da tabela `refeicoes` por dia (campo `datad`)
// ─────────────────────────────────────────────────────────────────────────────
const agruparPorDia = (linhas) => {
  const mapa = {};

  linhas.forEach((linha) => {
    const dia = linha.datad;
    if (!mapa[dia]) {
      mapa[dia] = {
        data:          dia,
        totalKcal:     0,
        totalProteina: 0,
        totalCarbo:    0,
        refeicoes:     [],
      };
    }

    mapa[dia].totalKcal     += linha.kcal_total || 0;
    mapa[dia].totalProteina += linha.prot_total || 0;
    mapa[dia].totalCarbo    += linha.carb_total || 0;

    mapa[dia].refeicoes.push({
      id:    linha.id,
      nome:  linha.nome_refeicao || "Refeição",
      hora:  linha.hora          || "",
      itens: linha.itens         || [],
    });
  });

  // Dias mais recentes primeiro
  return Object.values(mapa).sort((a, b) => {
    const parse = (s) => {
      const [d, m, y] = s.split("/");
      return new Date(`${y}-${m}-${d}`);
    };
    return parse(b.data) - parse(a.data);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
//  Cache local
// ─────────────────────────────────────────────────────────────────────────────
const CACHE_KEY = "calendarioDias_v2";

const lerCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const salvarCache = (dias) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(dias));
  } catch {
    console.warn("localStorage cheio");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENTE
// ─────────────────────────────────────────────────────────────────────────────
function Calendario({ onClose }) {
  const navigate = useNavigate();

  const [user,      setUser]      = useState(null);
  const [dias,      setDias]      = useState(lerCache);
  const [loading,   setLoading]   = useState(false);
  const [diaAberto, setDiaAberto] = useState(null);
  const [isMobile,  setIsMobile]  = useState(window.innerWidth < 768);

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });
  }, []);

  // ── Resize ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  // ── Carrega do Supabase ────────────────────────────────────────────────────
  const carregarDoSupabase = useCallback(async (userId) => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("refeicoes")
        .select("id, datad, hora, nome_refeicao, itens, kcal_total, prot_total, carb_total")
        .eq("user_id", userId)
        .order("timestamp", { ascending: true });

      if (error) throw error;
      if (data) {
        const agrupado = agruparPorDia(data);
        setDias(agrupado);
        salvarCache(agrupado);
      }
    } catch (e) {
      console.warn("Erro ao carregar calendário:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) carregarDoSupabase(user.id);
  }, [user?.id, carregarDoSupabase]);

  // Atualiza quando KcalDiaria dispara evento
  useEffect(() => {
    const handle = () => { if (user?.id) carregarDoSupabase(user.id); };
    window.addEventListener("kcalAtualizada", handle);
    return () => window.removeEventListener("kcalAtualizada", handle);
  }, [user?.id, carregarDoSupabase]);

  // ── Excluir refeição individual ────────────────────────────────────────────
  const excluirRefeicao = async (e, refeicaoId) => {
    e.stopPropagation();
    if (!window.confirm("Excluir essa refeição?")) return;

    const { error } = await supabase
      .from("refeicoes")
      .delete()
      .eq("id", refeicaoId)
      .eq("user_id", user.id);

    if (error) { console.warn(error.message); alert("Erro ao excluir."); return; }

    setDias((prev) => {
      const novo = prev
        .map((dia) => {
          const restantes = dia.refeicoes.filter((r) => r.id !== refeicaoId);
          return {
            ...dia,
            refeicoes:     restantes,
            totalKcal:     restantes.reduce((s, r) => s + r.itens.reduce((a, i) => a + (i.kcal        || 0), 0), 0),
            totalProteina: restantes.reduce((s, r) => s + r.itens.reduce((a, i) => a + (i.proteina    || 0), 0), 0),
            totalCarbo:    restantes.reduce((s, r) => s + r.itens.reduce((a, i) => a + (i.carboidrato || 0), 0), 0),
          };
        })
        .filter((dia) => dia.refeicoes.length > 0);
      salvarCache(novo);
      return novo;
    });
  };

  // ── Excluir dia inteiro ────────────────────────────────────────────────────
  const excluirDia = async (e, data) => {
    e.stopPropagation();
    if (!window.confirm(`Excluir todas as refeições de ${data}?`)) return;

    const ids = dias.find((d) => d.data === data)?.refeicoes.map((r) => r.id) || [];

    const { error } = await supabase
      .from("refeicoes")
      .delete()
      .in("id", ids)
      .eq("user_id", user.id);

    if (error) { console.warn(error.message); alert("Erro ao excluir dia."); return; }

    setDias((prev) => {
      const novo = prev.filter((d) => d.data !== data);
      salvarCache(novo);
      return novo;
    });

    if (diaAberto === data) setDiaAberto(null);
  };

  // ── Totais e cálculo de resultado ──────────────────────────────────────────
  const totalConsumido  = dias.reduce((acc, d) => acc + d.totalKcal, 0);
  const metaKcal        = Number(localStorage.getItem("metaKcal")) || 0;
  const metaTotal       = metaKcal * dias.length;
  const saldoKcal       = metaTotal - totalConsumido;
  const massaKg         = saldoKcal / 7700;
  const classeResultado = saldoKcal >= 0 ? "positivo" : "negativo";

  const disclaimerKcal = () =>
    window.confirm("*O resultado de massa é aproximado* (7700 kcal ≈ 1kg de gordura)");

  const toggleDia = (data) =>
    setDiaAberto((prev) => (prev === data ? null : data));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="paginaCalendario">

      {/* Voltar — só mobile */}
      <div className="areaVoltar">
        <button
          className="btnVoltar"
          style={{ display: isDesktop() ? "none" : "flex" }}
          onClick={() => (onClose ? onClose() : navigate("/home"))}
        >
          ← Voltar
        </button>
      </div>

      {/* Carregando */}
      {loading && (
        <p className="secaoLabel" style={{ textAlign: "center" }}>
          Carregando...
        </p>
      )}

      {/* Card de resultado */}
      {dias.length > 0 && (
        <div className="cardResultado" onClick={disclaimerKcal}>
          <p className="kcalResultado">
            {saldoKcal >= 0 ? "−" : "+"}{Math.abs(saldoKcal).toFixed(0)} kcal
          </p>
          <p className={`massaResultado ${classeResultado}`}>
            Resultado estimado: {massaKg >= 0 ? "−" : "+"}{Math.abs(massaKg).toFixed(2)} kg
          </p>
        </div>
      )}

      {/* Label contador de dias */}
      {dias.length > 0 && (
        <p className="secaoLabel">
          {dias.length} {dias.length === 1 ? "dia registrado" : "dias registrados"}
        </p>
      )}

      {/* ── Carrossel (desktop) / Stack (mobile) ── */}
      <div className="calendarioCarrossel">

        {!loading && dias.length === 0 && (
          <p className="calendarioContainerSemFlex">
            Nenhuma refeição registrada ainda.
          </p>
        )}

        {dias.map((dia) => (
          <div
            key={dia.data}
            className={`cardDia ${diaAberto === dia.data ? "aberto" : ""}`}
            onClick={() => {
              if (isMobile) setDiaAberto(dia.data);
              else toggleDia(dia.data);
            }}
          >
            {/* Header */}
            <div className="cardHeader">
              <span className="cardData">{dia.data}</span>
              <button
                className="btnExcluirDia"
                onClick={(e) => excluirDia(e, dia.data)}
              >
                ×
              </button>
            </div>

            <hr className="linhaSep" />

            {/* Macros — 3 badges */}
            <div className="cardMacros">
              <div className="macroBadge kcal">
                <span>{dia.totalKcal}</span>
                <small>kcal</small>
              </div>
              <div className="macroBadge prot">
                <span>{dia.totalProteina}g</span>
                <small>prot</small>
              </div>
              <div className="macroBadge carbo">
                <span>{dia.totalCarbo}g</span>
                <small>carbo</small>
              </div>
            </div>

            {/* Qtd refeições */}
            <p className="cardQtdRefeicoes">
              {dia.refeicoes.length} {dia.refeicoes.length === 1 ? "refeição" : "refeições"}
            </p>

            {/* Expansão desktop */}
            {!isMobile && diaAberto === dia.data && (
              <div className="listaAlimentos">
                {dia.refeicoes.map((ref) => (
                  <div key={ref.id} className="refeicaoDia">

                    <div className="refeicaoDiaHeader">
                      <p className="tituloRefeicao">{ref.nome}</p>
                      {ref.hora && <span className="horaRefeicao">{ref.hora}</span>}
                      <button
                        className="btnExcluirDia"
                        onClick={(e) => excluirRefeicao(e, ref.id)}
                      >
                        ×
                      </button>
                    </div>

                    {ref.itens.map((item, j) => (
                      <div key={j} className="itemAlimento">
                        <span className="itemNome">
                          {(item.nome || "").replaceAll("_", " ")}
                          <small>
                            ({item.quantidade}
                            {item.tipo === "grama" ? "g" : item.tipo === "ml" ? "ml" : "un"})
                          </small>
                        </span>
                        <span className="itemKcal">{item.kcal} k</span>
                        <span className="itemProt">{item.proteina}g</span>
                      </div>
                    ))}

                  </div>
                ))}
              </div>
            )}

          </div>
        ))}

      </div>

      {/* ── Modal mobile ── */}
      {isMobile && diaAberto && (
        <div className="modalOverlay" onClick={() => setDiaAberto(null)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>

            <button className="fecharModal" onClick={() => setDiaAberto(null)}>×</button>

            {dias
              .filter((d) => d.data === diaAberto)
              .map((dia) => (
                <div key={dia.data}>

                  <div className="modalHeader">
                    <h3 className="modalTitulo">{dia.data}</h3>
                    <div className="modalMacros">
                      <span className="mKcal">{dia.totalKcal} kcal</span>
                      <span className="mProt">{dia.totalProteina}g prot</span>
                      <span className="mCarbo">{dia.totalCarbo}g carbo</span>
                    </div>
                  </div>

                  {dia.refeicoes.map((ref) => (
                    <div key={ref.id} className="refeicaoModal">

                      <div className="refeicaoModalHeader">
                        <p className="refeicaoModalNome">{ref.nome}</p>
                        {ref.hora && <span className="refeicaoModalHora">{ref.hora}</span>}
                        <button
                          className="btnExcluirDia"
                          onClick={(e) => excluirRefeicao(e, ref.id)}
                        >
                          ×
                        </button>
                      </div>

                      {ref.itens.map((item, j) => (
                        <div key={j} className="itemAlimento">
                          <span className="itemNome">
                            {(item.nome || "").replaceAll("_", " ")}
                            <small>
                              ({item.quantidade}
                              {item.tipo === "grama" ? "g" : item.tipo === "ml" ? "ml" : "un"})
                            </small>
                          </span>
                          <span className="itemKcal">{item.kcal} k</span>
                          <span className="itemProt">{item.proteina}g</span>
                        </div>
                      ))}

                    </div>
                  ))}

                </div>
              ))}

          </div>
        </div>
      )}

    </div>
  );
}

export default Calendario;