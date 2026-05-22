import { supabase } from "../../services/supabaseClient";
import React, { useEffect, useState, useCallback, useRef } from "react";
import "./Calendario.css";
import { useNavigate } from "react-router-dom";

const isDesktop = () => window.innerWidth >= 768;

const dataHoje = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const isoParaDia = (iso) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const agruparPorDia = (linhas) => {
  const mapa = {};

  linhas.forEach((linha) => {
    const dia = linha.datad;

    if (!mapa[dia]) {
      mapa[dia] = {
        data: dia,
        totalKcal: 0,
        totalProteina: 0,
        totalCarbo: 0,
        refeicoes: [],
      };
    }

    mapa[dia].totalKcal += linha.kcal_total || 0;
    mapa[dia].totalProteina += linha.prot_total || 0;
    mapa[dia].totalCarbo += linha.carb_total || 0;

    mapa[dia].refeicoes.push({
      id: linha.id,
      nome: linha.nome_refeicao || "Refeição",
      hora: linha.hora || "",
      itens: linha.itens || [],
    });
  });

  return Object.values(mapa).sort((a, b) => {
    const parse = (s) => {
      const [d, m, y] = s.split("/");
      return new Date(`${y}-${m}-${d}`);
    };

    return parse(b.data) - parse(a.data);
  });
};

const agruparGastosPorDia = (registros) => {
  const mapa = {};

  registros.forEach((r) => {
    if (!r.created_at) return;

    const dia = isoParaDia(r.created_at);
    const kcal = Number(r.kcal_final || 0);
    const atividade = r.tipo_exercicio || "exercício";

    if (!mapa[dia]) {
      mapa[dia] = {
        totalKcal: 0,
        atividades: [],
      };
    }

    mapa[dia].totalKcal += kcal;

    mapa[dia].atividades.push({
      id: r.id,
      atividade,
      kcal,
    });
  });

  return mapa;
};

const CACHE_KEY = "calendarioDias_v2";
const CACHE_MANUTENCAO = "manutencaoKcal";

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

const lerManutencaoCache = () => {
  const direto = Number(localStorage.getItem(CACHE_MANUTENCAO)) || 0;
  if (direto > 0) return direto;

  try {
    const plano = JSON.parse(localStorage.getItem("meuPlano") || "{}");
    return Number(plano.manutencao || plano.manutencao_kcal) || 0;
  } catch {
    return 0;
  }
};

const EMOJI_ATIVIDADE = {
  corrida: "🏃",
  caminhada: "🚶",
  bicicleta: "🚴",
  natacao: "🏊",
  musculacao: "🏋️",
  escada: "🪜",
  danca: "💃",
  futebol: "⚽",
  pular_corda: "🪢",
};

const emojiAtividade = (id) => EMOJI_ATIVIDADE[id] ?? "🏃";

function Calendario({ onClose }) {
  const navigate = useNavigate();
  const carrosselRef = useRef(null);

  const [user, setUser] = useState(null);
  const [dias, setDias] = useState(lerCache);
  const [gastosPorDia, setGastosPorDia] = useState({});
  const [loading, setLoading] = useState(false);
  const [diaAberto, setDiaAberto] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [manutencaoKcal, setManutencaoKcal] = useState(lerManutencaoCache);

  const hoje = dataHoje();

  const scrollCarrossel = (dir) => {
    if (!carrosselRef.current) return;
    carrosselRef.current.scrollBy({
      left: dir * 320,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });
  }, []);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handle);

    return () => window.removeEventListener("resize", handle);
  }, []);

  const carregarManutencao = useCallback(async (userId) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("registros")
      .select("manutencao_kcal")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("Erro ao carregar manutenção:", error.message);
      return;
    }

    const valor = Number(data?.manutencao_kcal || 0);

    if (valor > 0) {
      setManutencaoKcal(valor);
      localStorage.setItem(CACHE_MANUTENCAO, String(valor));

      try {
        const plano = JSON.parse(localStorage.getItem("meuPlano") || "{}");

        localStorage.setItem(
          "meuPlano",
          JSON.stringify({
            ...plano,
            manutencao: valor,
            manutencao_kcal: valor,
          })
        );
      } catch {
        // ignora
      }
    }
  }, []);

  const carregarDoSupabase = useCallback(async (userId) => {
    if (!userId) return;

    setLoading(true);

    try {
      const [refRes, gastoRes] = await Promise.all([
        supabase
          .from("refeicoes")
          .select("id, datad, hora, nome_refeicao, itens, kcal_total, prot_total, carb_total")
          .eq("user_id", userId)
          .order("timestamp", { ascending: true }),

        supabase
          .from("gasto_calorico")
          .select("id, created_at, tipo_exercicio, kcal_final")
          .eq("user_id", userId)
          .order("created_at", { ascending: true }),
      ]);

      if (refRes.error) throw refRes.error;
      if (gastoRes.error) {
        console.warn("Erro ao carregar gastos:", gastoRes.error.message);
      }

      if (refRes.data) {
        const agrupado = agruparPorDia(refRes.data);
        setDias(agrupado);
        salvarCache(agrupado);
      }

      if (gastoRes.data) {
        setGastosPorDia(agruparGastosPorDia(gastoRes.data));
      }
    } catch (e) {
      console.warn("Erro ao carregar calendário:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    carregarManutencao(user.id);
    carregarDoSupabase(user.id);
  }, [user?.id, carregarManutencao, carregarDoSupabase]);

  useEffect(() => {
    const handle = () => {
      if (user?.id) carregarDoSupabase(user.id);
    };

    window.addEventListener("kcalAtualizada", handle);

    return () => window.removeEventListener("kcalAtualizada", handle);
  }, [user?.id, carregarDoSupabase]);

  useEffect(() => {
    const handlePlano = () => {
      const valor = lerManutencaoCache();

      if (valor > 0) setManutencaoKcal(valor);
      if (user?.id) carregarManutencao(user.id);
    };

    window.addEventListener("planoCriado", handlePlano);

    return () => window.removeEventListener("planoCriado", handlePlano);
  }, [user?.id, carregarManutencao]);

  const excluirRefeicao = async (e, refeicaoId) => {
    e.stopPropagation();

    if (!window.confirm("Excluir essa refeição?")) return;

    const { error } = await supabase
      .from("refeicoes")
      .delete()
      .eq("id", refeicaoId)
      .eq("user_id", user.id);

    if (error) {
      console.warn(error.message);
      alert("Erro ao excluir.");
      return;
    }

    setDias((prev) => {
      const novo = prev
        .map((dia) => {
          const restantes = dia.refeicoes.filter((r) => r.id !== refeicaoId);

          return {
            ...dia,
            refeicoes: restantes,
            totalKcal: restantes.reduce(
              (s, r) => s + r.itens.reduce((a, i) => a + (i.kcal || 0), 0),
              0
            ),
            totalProteina: restantes.reduce(
              (s, r) => s + r.itens.reduce((a, i) => a + (i.proteina || 0), 0),
              0
            ),
            totalCarbo: restantes.reduce(
              (s, r) => s + r.itens.reduce((a, i) => a + (i.carboidrato || 0), 0),
              0
            ),
          };
        })
        .filter((dia) => dia.refeicoes.length > 0);

      salvarCache(novo);
      return novo;
    });
  };

  const excluirDia = async (e, dataDia) => {
    e.stopPropagation();

    if (!window.confirm(`Excluir todas as refeições de ${dataDia}?`)) return;

    const ids = dias.find((d) => d.data === dataDia)?.refeicoes.map((r) => r.id) || [];

    const { error } = await supabase
      .from("refeicoes")
      .delete()
      .in("id", ids)
      .eq("user_id", user.id);

    if (error) {
      console.warn(error.message);
      alert("Erro ao excluir dia.");
      return;
    }

    setDias((prev) => {
      const novo = prev.filter((d) => d.data !== dataDia);
      salvarCache(novo);
      return novo;
    });

    if (diaAberto === dataDia) setDiaAberto(null);
  };

  const diasConsolidados = dias.filter((d) => d.data !== hoje);
  const totalConsumido = diasConsolidados.reduce((acc, d) => acc + d.totalKcal, 0);
  const totalQueimado = diasConsolidados.reduce(
    (acc, d) => acc + (gastosPorDia[d.data]?.totalKcal || 0),
    0
  );

  const metaTotal = manutencaoKcal * diasConsolidados.length;
  const saldoKcal = metaTotal - totalConsumido + totalQueimado;
  const massaKg = saldoKcal / 7700;
  const classeResultado = saldoKcal >= 0 ? "positivo" : "negativo";

  const disclaimerKcal = () =>
    window.confirm("*O resultado de massa é aproximado* (7700 kcal ≈ 1kg de gordura)");

  const toggleDia = (dataDia) =>
    setDiaAberto((prev) => (prev === dataDia ? null : dataDia));

  const renderDetalhesDia = (dia) => {
    const gasto = gastosPorDia[dia.data];

    return (
      <>
        {gasto && gasto.atividades.length > 0 && (
          <div className="detalheExercicios">
            <p className="detalheSecaoLabel">Exercícios</p>

            {gasto.atividades.map((at, i) => (
              <div key={at.id ?? i} className="detalheExercicioItem">
                <span className="detalheExercicioEmoji">
                  {emojiAtividade(at.atividade)}
                </span>

                <span className="detalheExercicioNome">
                  {at.atividade.replaceAll("_", " ")}
                </span>

                <span className="detalheExercicioKcal">
                  −{at.kcal} kcal
                </span>
              </div>
            ))}
          </div>
        )}

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
      </>
    );
  };

  return (
    <div className="paginaCalendario">
      <div className="areaVoltar">
        <button
          className="btnVoltar"
          style={{ display: isDesktop() ? "none" : "flex" }}
          onClick={() => (onClose ? onClose() : navigate("/home"))}
        >
          ← Voltar
        </button>
      </div>

      {loading && (
        <p className="secaoLabel" style={{ textAlign: "center" }}>
          Carregando...
        </p>
      )}

      {diasConsolidados.length > 0 && manutencaoKcal > 0 && (
        <div className="cardResultado" onClick={disclaimerKcal}>
          <p className="kcalResultado">
            {saldoKcal >= 0 ? "−" : "+"}
            {Math.abs(saldoKcal).toFixed(0)} kcal
          </p>

          {totalQueimado > 0 && (
            <p className="caloriasExercicio">
              🔥 Exercícios ajudaram em +{totalQueimado} kcal
            </p>
          )}

          <p className="disclaimerExercicio">
            Sua taxa de manutenção considera dias ativos, como rotina normal e passos.
            Ela não considera exercícios extras. Quando você se exercita, o resultado
            de calorias queimadas aumenta.
          </p>

          <p className={`massaResultado ${classeResultado}`}>
            RESULTADO : {" "}
            {massaKg >= 0 ? "−" : "+"}
            {Math.abs(massaKg).toFixed(2)} kg
          </p>

          <div className="manutencaoInfo">
            <p className="manutencaoValor">
              Manutenção: {manutencaoKcal.toFixed(0)} kcal/dia
            </p>

            <p className="manutencaoTexto">
              Seu corpo gasta aproximadamente{" "}
              <strong>{manutencaoKcal.toFixed(0)} kcal</strong> em um dia ativo.
            </p>

            <p className="manutencaoAviso">
              O dia atual será consolidado no calendário após meia-noite.
            </p>
          </div>
        </div>
      )}

      {diasConsolidados.length > 0 && manutencaoKcal <= 0 && (
        <p className="secaoLabel" style={{ textAlign: "center" }}>
          Manutenção kcal não encontrada no plano.
        </p>
      )}

      {dias.length > 0 && (
        <p className="secaoLabel">
          {diasConsolidados.length}{" "}
          {diasConsolidados.length === 1 ? "dia consolidado" : "dias consolidados"}
          {dias.some((d) => d.data === hoje) && " · hoje em andamento"}
        </p>
      )}

      <div className={`calendarioCarrosselShell ${dias.length === 1 ? "calendarioCarrosselShell--single" : ""}`}>
        {!isMobile && dias.length > 1 && (
          <button
            className="calArrow calArrow--left"
            onClick={() => scrollCarrossel(-1)}
            type="button"
          >
            ‹
          </button>
        )}

        <div className="calendarioCarrossel" ref={carrosselRef}>
          {!loading && dias.length === 0 && (
            <p className="calendarioContainerSemFlex">
              Nenhuma refeição registrada ainda.
            </p>
          )}

          {dias.map((dia) => {
            const gasto = gastosPorDia[dia.data];
            const kcalQueimada = gasto?.totalKcal || 0;
            const numAtividades = gasto?.atividades.length || 0;
            const ehHoje = dia.data === hoje;

            return (
              <div
                key={dia.data}
                className={`cardDia ${diaAberto === dia.data ? "aberto" : ""} ${
                  ehHoje ? "cardDia--hoje" : ""
                }`}
                onClick={() => {
                  if (isMobile) setDiaAberto(dia.data);
                  else toggleDia(dia.data);
                }}
              >
                <div className="cardHeader">
                  <span className="cardData">
                    {dia.data}
                    {ehHoje && <span className="cardHojeBadge">hoje</span>}
                  </span>

                  <button
                    className="btnExcluirDia"
                    onClick={(e) => excluirDia(e, dia.data)}
                  >
                    ×
                  </button>
                </div>

                <hr className="linhaSep" />

                <div className="fireBadge">
                  <span className="fireBadgeIcon">🔥</span>
                  <span className="fireBadgeKcal">{kcalQueimada}</span>
                  <span className="fireBadgeUnit">kcal</span>
                </div>

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

                <p className="cardQtdRefeicoes">
                  {dia.refeicoes.length}{" "}
                  {dia.refeicoes.length === 1 ? "refeição" : "refeições"}
                  {numAtividades > 0 &&
                    ` · ${numAtividades} ${
                      numAtividades === 1 ? "atividade" : "atividades"
                    }`}
                </p>

                {!isMobile && diaAberto === dia.data && (
                  <div className="listaAlimentos">
                    {renderDetalhesDia(dia)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!isMobile && dias.length > 1 && (
          <button
            className="calArrow calArrow--right"
            onClick={() => scrollCarrossel(1)}
            type="button"
          >
            ›
          </button>
        )}
      </div>

      {isMobile && diaAberto && (
        <div className="modalOverlay" onClick={() => setDiaAberto(null)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <button className="fecharModal" onClick={() => setDiaAberto(null)}>
              ×
            </button>

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

                    {gastosPorDia[dia.data]?.totalKcal > 0 && (
                      <p className="modalFireBadge">
                        🔥 {gastosPorDia[dia.data].totalKcal} kcal queimadas
                      </p>
                    )}
                  </div>

                  {renderDetalhesDia(dia)}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendario;
