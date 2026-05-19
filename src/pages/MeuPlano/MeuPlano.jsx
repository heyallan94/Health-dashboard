import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./meuplano.css";
import { supabase } from "../../services/supabaseClient";

const OBJETIVOS = {
  cutting: {
    label:         "Cutting",
    subtitulo:     "Perder gordura e preservar músculo",
    emoji:         "🔥",
    descricao:     "Déficit calórico controlado de ~400 kcal/dia. Alta ingestão de proteína para proteger a massa muscular enquanto você perde gordura.",
    fatorProteina: 2.0,
    ajusteKcal:    -400,
    cor:           "#f87171",
  },
  manutencao: {
    label:         "Manutenção",
    subtitulo:     "Manter o peso atual",
    emoji:         "⚖️",
    descricao:     "Consumo calórico igual ao seu gasto estimado. Ideal para recomposição corporal ou períodos de estabilização.",
    fatorProteina: 1.8,
    ajusteKcal:    0,
    cor:           "#facc15",
  },
  bulking: {
    label:         "Bulking",
    subtitulo:     "Ganhar massa muscular",
    emoji:         "💪",
    descricao:     "Superávit calórico moderado de ~300 kcal/dia. Proteína elevada para maximizar a síntese muscular.",
    fatorProteina: 1.7,
    ajusteKcal:    +300,
    cor:           "#4ade80",
  },
};

function getImcTexto(imc) {
  const n = Number(imc);
  return n < 18.5 ? "Abaixo do peso" :
         n < 25   ? "Peso saudável"  :
         n < 30   ? "Sobrepeso"      : "Obesidade";
}


function normalizarPlano(raw) {
  const imc      = Number(raw.imc);
  const imcTexto = raw.imcTexto || getImcTexto(imc);
  const metaKcal = raw.metaKcal  ?? raw.metakcal;
  const proteina = raw.proteina  ?? raw.metaproteina;
  const data     = raw.data      ?? (raw.created_at
    ? new Date(raw.created_at).toLocaleDateString("pt-BR")
    : "—");

  return {
    ...raw,
    imc:      imc.toFixed(1),
    imcTexto,
    metaKcal,
    proteina,
    data,
  };
}

const isDesktop = () => window.innerWidth >= 768;

function MeuPlano({ onClose }) {
  const [user,       setUser]       = useState(null);
  const [etapa,      setEtapa]      = useState(1);
  const [peso,       setPeso]       = useState("");
  const [altura,     setAltura]     = useState("");
  const [idade,      setIdade]      = useState("");
  const [sexo,       setSexo]       = useState("");
  const [objetivo,   setObjetivo]   = useState("");
  const [resultado,  setResultado]  = useState(null);
  const [registro,   setRegistro]   = useState(null);
  const [carregando, setCarregando] = useState(true);

  const navigate = useNavigate();

  const handleAvancar = () => {
    if (!peso || !altura || !idade || !sexo) {
      alert("Preencha todos os campos antes de continuar.");
      return;
    }
    if (Number(peso) <= 0 || Number(altura) <= 0 || Number(idade) <= 0) {
      alert("Os valores precisam ser maiores que zero.");
      return;
    }
    setEtapa(2);
  };

  const handleCalcular = (obj) => {
    setObjetivo(obj);
    const p = Number(peso);
    const a = Number(altura);
    const i = Number(idade);

    const tmb = sexo === "masculino"
      ? 10 * p + 6.25 * a - 5 * i + 5
      : 10 * p + 6.25 * a - 5 * i - 161;

    const config       = OBJETIVOS[obj];
    const manutencao   = Math.round(tmb * 1.4);
    const metaKcal     = manutencao + config.ajusteKcal;
    const metaProteina = Math.round(p * config.fatorProteina);
    const alturaM      = a / 100;
    const imc          = (p / (alturaM * alturaM)).toFixed(1);
    const imcTexto     = getImcTexto(imc);

    setResultado({ tmb: Math.round(tmb), manutencao, metaKcal, metaProteina, imc, imcTexto, objetivo: obj, config });
    setEtapa(3);
  };


  useEffect(() => {
    const carregarPlano = async () => {
      const raw = JSON.parse(localStorage.getItem("meuPlano"));
      if (raw) {
        if (raw.metaKcal && raw.proteina && raw.imcTexto) {
          setRegistro(raw);
          setCarregando(false);
          return;
        }
        localStorage.removeItem("meuPlano");
      }
      if (!user) {
        setCarregando(false);
        return;
      }

      const { data, error } = await supabase
        .from("registros")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data && !error) {
        // ✅ Normaliza o objeto do Supabase antes de salvar e usar
        const plano = normalizarPlano(data);
        setRegistro(plano);
        localStorage.setItem("meuPlano", JSON.stringify(plano));
      }

      setCarregando(false);
    };

    carregarPlano();
  }, [user]);

  const handleRegistrar = async () => {
    if (!resultado) return;

    const dataAtual     = new Date();
    const dataFormatada =
      dataAtual.toLocaleDateString("pt-BR") + " " +
      dataAtual.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const novoRegistro = {
      id:         Date.now(),
      data:       dataFormatada,
      peso,
      altura,
      idade,
      sexo,
      objetivo,
      imc:        resultado.imc,
      imcTexto:   resultado.imcTexto,
      tmb:        resultado.tmb,
      manutencao: resultado.manutencao,
      metaKcal:   resultado.metaKcal,
      proteina:   resultado.metaProteina,
    };

    if (user) {
      const { error } = await supabase
        .from("registros")
        .upsert(
          {
            user_id:      user.id,
            peso:         Number(peso),
            altura:       Number(altura),
            idade:        Number(idade),
            sexo,
            objetivo,
            metakcal:     Number(resultado.metaKcal),
            metaproteina: Number(resultado.metaProteina),
            imc:          Number(resultado.imc),
            tmb:          Number(resultado.tmb),
          },
          { onConflict: "user_id" }
        );

      if (error) {
        console.log(error);
        alert("Erro ao salvar no Supabase");
        return;
      }
    }

    localStorage.setItem("meuPlano",     JSON.stringify(novoRegistro));
    localStorage.setItem("metaKcal",     String(novoRegistro.metaKcal));
    localStorage.setItem("metaProteina", String(novoRegistro.proteina));

    setRegistro(novoRegistro);
    window.dispatchEvent(new Event("planoCriado"));
  };

  const handleReset = () => {
    localStorage.removeItem("meuPlano");
    localStorage.removeItem("metaKcal");
    localStorage.removeItem("metaProteina");
    setRegistro(null);
    setResultado(null);
    setEtapa(1);
    setPeso("");
    setAltura("");
    setIdade("");
    setSexo("");
    setObjetivo("");
  };

  // Pega usuário
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  if (carregando) return (
  <div className="planoContainer" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", minHeight: "300px" }}>
    <div style={{
      width: "36px", height: "36px",
      border: "3px solid #ffffff20",
      borderTop: "3px solid #fff",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite"
    }} />
    <p style={{ color: "#aaa", fontSize: "14px", margin: 0 }}>Carregando seu plano...</p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

  if (registro) {
    const cfg = OBJETIVOS[registro.objetivo];

    return (
      <div className="planoContainer">

         <button
        className="btnVoltar"
        style={{ display: isDesktop() ? "none" : "flex" }}
        onClick={() => (onClose ? onClose() : navigate("/home"))}
      >
        ← Voltar
      </button>

        <div className="planoCard registrado">

          <div className="planoCardTopo" style={{ borderColor: cfg?.cor }}>
            <span className="planoEmoji">{cfg?.emoji}</span>
            <div>
              <p className="planoCardTitulo">{cfg?.label}</p>
              <p className="planoCardSub">{cfg?.subtitulo}</p>
            </div>
          </div>

          <div className="planoCardData">{registro.data}</div>

          <div className="planoMetricas">
            <div className="planoMetricaItem">
              <span className="planoMetricaLabel">Peso</span>
              <span className="planoMetricaValor">{registro.peso} kg</span>
            </div>
            <div className="planoMetricaItem">
              <span className="planoMetricaLabel">Altura</span>
              <span className="planoMetricaValor">{registro.altura} cm</span>
            </div>
            <div className="planoMetricaItem">
              <span className="planoMetricaLabel">IMC</span>
              <span className="planoMetricaValor">{registro.imc} <small>({registro.imcTexto})</small></span>
            </div>
            <div className="planoMetricaItem">
              <span className="planoMetricaLabel">TMB</span>
              <span className="planoMetricaValor">{registro.tmb} kcal</span>
            </div>
          </div>

          <div className="planoMetas">
            <div className="planoMetaBox kcal">
              <span className="planoMetaValor">{registro.metaKcal}</span>
              <span className="planoMetaLabel">kcal / dia</span>
            </div>
            <div className="planoMetaBox proteina">
              <span className="planoMetaValor">{registro.proteina}g</span>
              <span className="planoMetaLabel">proteína / dia</span>
            </div>
          </div>

        </div>

        <button className="planoBtnSecundario" onClick={handleReset}>
          Refazer cálculo
        </button>

       

      </div>
    );
  }

  return (
    <div className="planoContainer">

      <button
        className="btnVoltar"
        style={{ display: isDesktop() ? "none" : "flex" }}
        onClick={() => (onClose ? onClose() : navigate("/home"))}
      >
        ← Voltar
      </button>

      <div className="planoEtapas">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`planoEtapaDot ${etapa >= n ? "ativa" : ""}`} />
        ))}
      </div>

      {etapa === 1 && (
        <div className="planoEtapaBox">

           <button
        className="btnVoltar"
        style={{ display: isDesktop() ? "none" : "flex" }}
        onClick={() => (onClose ? onClose() : navigate("/home"))}
      >
        ← Voltar
      </button>

          <h2 className="planoTitulo">Seus dados físicos</h2>
          <p className="planoSubtitulo">
            Usamos a fórmula Mifflin-St Jeor para estimar seu gasto calórico diário.
          </p>

          <div className="planoForm">

            <div className="planoInputGroup">
              <label>Peso</label>
              <div className="planoInputComUnidade">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 85"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value.replace(/[^\d.]/g, ""))}
                />
                <span className="planoUnidade">kg</span>
              </div>
            </div>

            <div className="planoInputGroup">
              <label>Altura</label>
              <div className="planoInputComUnidade">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 179"
                  value={altura}
                  onChange={(e) => setAltura(e.target.value.replace(/\D/g, ""))}
                />
                <span className="planoUnidade">cm</span>
              </div>
            </div>

            <div className="planoInputGroup">
              <label>Idade</label>
              <div className="planoInputComUnidade">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 31"
                  value={idade}
                  onChange={(e) => setIdade(e.target.value.replace(/\D/g, ""))}
                />
                <span className="planoUnidade">anos</span>
              </div>
            </div>

            <div className="planoInputGroup">
              <label>Sexo biológico</label>
              <div className="planoSexoOpcoes">
                <button
                  className={`planoSexoBtn ${sexo === "masculino" ? "ativo" : ""}`}
                  onClick={() => setSexo("masculino")}
                >
                  Masculino
                </button>
                <button
                  className={`planoSexoBtn ${sexo === "feminino" ? "ativo" : ""}`}
                  onClick={() => setSexo("feminino")}
                >
                  Feminino
                </button>
              </div>
            </div>

          </div>

          <button className="planoBtnPrimario" onClick={handleAvancar}>
            Continuar →
          </button>

        </div>
      )}

      {etapa === 2 && (
        <div className="planoEtapaBox">
          <button className="btnVoltar" onClick={() => setEtapa(1)}>
            ← Voltar
          </button>

          <h2 className="planoTitulo">Qual é o seu objetivo?</h2>
          <p className="planoSubtitulo">
            Escolha com base no que você quer agora. Você pode mudar depois.
          </p>

          <div className="planoObjetivos">
            {Object.entries(OBJETIVOS).map(([key, cfg]) => (
              <button
                key={key}
                className="planoObjetivoCard"
                style={{ "--cor-obj": cfg.cor }}
                onClick={() => handleCalcular(key)}
              >
                <span className="planoObjetivoEmoji">{cfg.emoji}</span>
                <div className="planoObjetivoTexto">
                  <strong>{cfg.label}</strong>
                  <span>{cfg.subtitulo}</span>
                  <p className="planoObjetivoDesc">{cfg.descricao}</p>
                </div>
              </button>
            ))}
          </div>

          

        </div>
      )}

      {etapa === 3 && resultado && (
        <div className="planoEtapaBox">
          <button className="btnVoltar" onClick={() => setEtapa(1)}>
            ← Voltar
          </button>

          <h2 className="planoTitulo">Seu plano está pronto</h2>
          <p className="planoSubtitulo">{resultado.config.descricao}</p>

          <div className="planoResultadoGrid">

            <div className="planoResultadoItem">
              <span className="planoResultadoLabel">IMC estimado</span>
              <span className="planoResultadoValor">{resultado.imc}</span>
              <span className="planoResultadoSub">{resultado.imcTexto}</span>
            </div>

            <div className="planoResultadoItem">
              <span className="planoResultadoLabel">Metabolismo basal</span>
              <span className="planoResultadoValor">{resultado.tmb}</span>
              <span className="planoResultadoSub">kcal em repouso</span>
            </div>

            <div className="planoResultadoItem">
              <span className="planoResultadoLabel">Manutenção</span>
              <span className="planoResultadoValor">{resultado.manutencao}</span>
              <span className="planoResultadoSub">kcal / dia</span>
            </div>

          </div>

          <div className="planoMetas">
            <div className="planoMetaBox kcal">
              <span className="planoMetaValor">{resultado.metaKcal}</span>
              <span className="planoMetaLabel">kcal / dia</span>
              <span className="planoMetaDetalhe">sua meta</span>
            </div>
            <div className="planoMetaBox proteina">
              <span className="planoMetaValor">{resultado.metaProteina}g</span>
              <span className="planoMetaLabel">proteína / dia</span>
              <span className="planoMetaDetalhe">sua meta</span>
            </div>
          </div>

          <p className="planoAviso">
            * Estimativa baseada em atividade moderada (fator 1.4).
            Ajuste conforme seu estilo de vida real.
          </p>

          {!registro && (
            <button className="planoBtnPrimario" onClick={handleRegistrar}>
              Salvar este plano
            </button>
          )}

          <button className="planoBtnSecundario" onClick={() => setEtapa(2)}>
            ← Mudar objetivo
          </button>

        </div>
      )}

    </div>
  );
}

export default MeuPlano;