import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import "./Agua.css";

const COPOS = [
  { ml: 50, label: "50ml" },
  { ml: 100, label: "100ml" },
  { ml: 150, label: "150ml" },
  { ml: 200, label: "200ml" },
];

const isDesktop = () => window.innerWidth >= 768;

const dataHoje = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const CACHE_KEY_CONSUMO = () => `aguaConsumida_${dataHoje()}`;
const CACHE_KEY_META = "metaAgua";
const CACHE_KEY_PESO = "peso";

const lerConsumoCache = () =>
  Number(localStorage.getItem(CACHE_KEY_CONSUMO())) || 0;

const salvarConsumoCache = ({ consumo, meta, peso }) => {
  localStorage.setItem(CACHE_KEY_CONSUMO(), String(consumo));
  localStorage.setItem("aguaConsumida", String(consumo));

  if (meta) localStorage.setItem(CACHE_KEY_META, String(meta));
  if (peso) localStorage.setItem(CACHE_KEY_PESO, String(peso));

  window.dispatchEvent(
    new CustomEvent("aguaAtualizada", {
      detail: { consumo, meta, peso },
    })
  );
};

function Agua({ onClose }) {
  const navigate = useNavigate();

  const getPesoInicial = () => {
    const pesoSalvo = Number(localStorage.getItem(CACHE_KEY_PESO)) || 0;
    if (pesoSalvo > 0) return pesoSalvo;

    const plano = JSON.parse(localStorage.getItem("meuPlano") || "{}");
    return Number(plano.peso) || 0;
  };

  const getMetaAguaInicial = () => {
    const metaSalva = Number(localStorage.getItem(CACHE_KEY_META)) || 0;
    if (metaSalva > 0) return metaSalva;

    const plano = JSON.parse(localStorage.getItem("meuPlano") || "{}");
    const pesoPlano = Number(plano.peso) || 0;

    return pesoPlano > 0 ? Math.round(pesoPlano * 35) : 0;
  };

  const [consumido, setConsumido] = useState(lerConsumoCache);
  const [metaAgua, setMetaAgua] = useState(getMetaAguaInicial);
  const [peso, setPeso] = useState(getPesoInicial);
  const [sincronizando, setSincronizando] = useState(false);
  const [user, setUser] = useState(null);

  const upsertTimeout = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const sincronizar = async () => {
      setSincronizando(true);

      try {
        const { data: planoData } = await supabase
          .from("registros")
          .select("peso")
          .eq("user_id", user.id)
          .maybeSingle();

        if (planoData?.peso) {
          const pesoPlano = Number(planoData.peso);
          const metaCalculada = Math.round(pesoPlano * 35);

          setPeso(pesoPlano);
          setMetaAgua(metaCalculada);

          localStorage.setItem(CACHE_KEY_PESO, String(pesoPlano));
          localStorage.setItem(CACHE_KEY_META, String(metaCalculada));
        }

        const { data: aguaData, error } = await supabase
          .from("agua_diaria")
          .select("consumo, meta, peso")
          .eq("user_id", user.id)
          .eq("datad", dataHoje())
          .maybeSingle();

        if (!error && aguaData) {
          const consumoRemoto = Number(aguaData.consumo || 0);
          const metaRemota = Number(aguaData.meta || metaAgua || 0);
          const pesoRemoto = Number(aguaData.peso || peso || 0);

          setConsumido(consumoRemoto);
          if (metaRemota) setMetaAgua(metaRemota);
          if (pesoRemoto) setPeso(pesoRemoto);

          salvarConsumoCache({
            consumo: consumoRemoto,
            meta: metaRemota,
            peso: pesoRemoto,
          });
        }
      } catch (e) {
        console.warn("Agua sync falhou:", e.message);
      } finally {
        setSincronizando(false);
      }
    };

    sincronizar();
  }, [user?.id]);

  const upsertSupabase = useCallback(
    (novoConsumo, metaAtual, pesoAtual) => {
      if (!user?.id) return;

      clearTimeout(upsertTimeout.current);

      upsertTimeout.current = setTimeout(async () => {
        const { error } = await supabase
          .from("agua_diaria")
          .upsert(
            {
              user_id: user.id,
              datad: dataHoje(),
              consumo: novoConsumo,
              meta: metaAtual,
              peso: pesoAtual,
            },
            { onConflict: "user_id,datad" }
          );

        if (error) {
          console.warn("Falha ao salvar água no Supabase:", error.message);
        }
      }, 600);
    },
    [user?.id]
  );

  const atualizarAgua = (novo) => {
    setConsumido(novo);

    salvarConsumoCache({
      consumo: novo,
      meta: metaAgua,
      peso,
    });

    upsertSupabase(novo, metaAgua, peso);
  };

  const adicionarAgua = (ml) => {
    setConsumido((prev) => {
      const limite = metaAgua > 0 ? metaAgua * 1.5 : 5000;
      const novo = Math.min(prev + ml, limite);

      salvarConsumoCache({
        consumo: novo,
        meta: metaAgua,
        peso,
      });

      upsertSupabase(novo, metaAgua, peso);

      return novo;
    });
  };

  const removerAgua = (ml) => {
    setConsumido((prev) => {
      const novo = Math.max(0, prev - ml);

      salvarConsumoCache({
        consumo: novo,
        meta: metaAgua,
        peso,
      });

      upsertSupabase(novo, metaAgua, peso);

      return novo;
    });
  };

  const zerarDia = () => {
    atualizarAgua(0);
  };

  const pct = metaAgua > 0 ? Math.min((consumido / metaAgua) * 100, 100) : 0;
  const atingiu = consumido >= metaAgua && metaAgua > 0;
  const corBarra = pct < 50 ? "#3b82f6" : pct < 90 ? "#22d3ee" : "#4ade80";

  const statusTexto = () => {
    if (metaAgua === 0) return sincronizando ? "Buscando sua meta..." : "Meta não encontrada";
    if (atingiu) return "🎉 Meta atingida! Ótimo trabalho!";

    const faltam = metaAgua - consumido;
    return `Faltam ${(faltam / 1000).toFixed(2)} L para a meta`;
  };

  return (
    <div className="aguaContainer">
      <button
        className="btnVoltar"
        style={{ display: isDesktop() ? "none" : "flex" }}
        onClick={() => (onClose ? onClose() : navigate("/home"))}
      >
        ← Voltar
      </button>

      <div className="aguaHeader">
        <h2 className="aguaTitulo">
          💧 Hidratação
          {sincronizando && <span className="aguaSync" title="Sincronizando..."> ⟳</span>}
        </h2>

        {peso > 0 && (
          <p className="aguaPeso">
            {peso} kg · meta {(metaAgua / 1000).toFixed(1)} L/dia
          </p>
        )}
      </div>

      <div className="aguaBarraWrapper">
        <div className="aguaBarra">
          <div
            className="aguaBarraProgresso"
            style={{
              height: `${pct}%`,
              background: `linear-gradient(to top, ${corBarra}cc, ${corBarra})`,
              boxShadow: `0 0 20px ${corBarra}55`,
            }}
          />
        </div>

        <div className="aguaConsumoInfo">
          <span className="aguaConsumoValor" style={{ color: corBarra }}>
            {(consumido / 1000).toFixed(2)}
          </span>
          <span className="aguaConsumoUnidade">L</span>
          <span className="aguaConsumoDivisor">/</span>
          <span className="aguaMetaValor">{(metaAgua / 1000).toFixed(2)} L</span>
          <span className="aguaPctTexto">{Math.round(pct)}%</span>
        </div>
      </div>

      <p className={`aguaStatus ${atingiu ? "atingiu" : ""}`}>
        {statusTexto()}
      </p>

      <div className="aguaCoposGrid">
        {COPOS.map((copo) => (
          <div key={copo.ml} className="aguaCopoWrapper">
            <button
              className="aguaCopo"
              onClick={() => adicionarAgua(copo.ml)}
              title={`+${copo.ml}ml`}
            >
              <span className="aguaCopoEmoji">🥤</span>
              <span className="aguaCopoLabel">+{copo.label}</span>
            </button>

            <button
              className="aguaCopoMinus"
              onClick={() => removerAgua(copo.ml)}
              title={`-${copo.ml}ml`}
            >
              −
            </button>
          </div>
        ))}
      </div>

      {consumido > 0 && (
        <button className="aguaBtnZerar" onClick={zerarDia}>
          Zerar o dia
        </button>
      )}

      <div className="aguaDisclaimer">
        <p className="aguaDisclaimerTitulo">⚠️ Sabia disso?</p>
        <p>
          Beber pouca água faz seu corpo <strong>reter líquido</strong> como mecanismo de defesa —
          o que pode aparecer como ganho de peso na balança. Na maioria das vezes
          não é gordura, é água. Manter-se hidratado ajuda a eliminar esse inchaço,
          melhora o transporte de nutrientes e otimiza a queima de gordura.
        </p>
        <p style={{ marginTop: "8px" }}>
          A fórmula usada é <strong>35ml por kg</strong> de peso corporal, uma referência
          amplamente adotada para pessoas ativas.
        </p>
      </div>
    </div>
  );
}

export default Agua;
