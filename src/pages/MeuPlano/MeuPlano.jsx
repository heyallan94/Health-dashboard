import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./meuplano.css";
import { supabase } from "../../services/supabaseClient";

// ─────────────────────────────────────────────────────────────────────────────
//  OBJETIVOS
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
//  PARECER CORPORAL — frases por cenário
// ─────────────────────────────────────────────────────────────────────────────
const PARECERES = {
  atletico: {
    cor:   "azul",
    label: "Atlético",
    frases: [
      "Composição corporal excelente. IMC elevado, mas gordura baixa — isso indica massa muscular desenvolvida.",
      "Seu percentual de gordura está dentro da faixa atlética. O IMC sozinho não conta essa história.",
      "Corpo denso em músculo, não em gordura. Continue com o protocolo atual.",
      "Perfil atlético confirmado. Alta massa magra com gordura controlada.",
      "Você está na faixa que poucos atingem. Músculo alto, gordura baixa. Mantenha.",
    ],
  },
  saudavel: {
    cor:   "verde",
    label: "Saudável",
    frases: [
      "Sua composição corporal está dentro de uma faixa saudável. Continue assim.",
      "Peso e gordura equilibrados. Não há necessidade de mudanças drásticas.",
      "Boa relação entre massa magra e gordura. Mantenha a consistência.",
      "Você está em uma faixa que favorece saúde e performance.",
      "Composição corporal dentro do esperado para uma boa qualidade de vida.",
    ],
  },
  abaixo: {
    cor:   "azul",
    label: "Abaixo do peso",
    frases: [
      "Seu peso está abaixo do esperado para sua estatura. Aumentar a ingestão calórica de forma gradual pode ajudar.",
      "IMC baixo pode indicar falta de massa muscular ou reservas insuficientes. Considere aumentar a ingestão.",
      "Pesos abaixo do ideal podem impactar energia e imunidade. Atenção à alimentação.",
      "Há espaço para ganhar massa de forma saudável. Proteína e calorias são aliadas aqui.",
      "Estar abaixo do peso não é necessariamente leve — pode significar pouca massa muscular.",
    ],
  },
  atencao: {
    cor:   "amarelo",
    label: "Atenção",
    frases: [
      "Há sinais de excesso de gordura corporal. Pequenas mudanças consistentes costumam gerar melhora real.",
      "Sua composição indica margem para redução de gordura sem pressa e sem extremos.",
      "O corpo está pedindo atenção. Não é urgência, mas é sinal.",
      "Com ajustes moderados na alimentação e movimento, a tendência muda relativamente rápido.",
      "Excesso leve de gordura detectado. Não é alarmante, mas merece consistência.",
    ],
  },
  alerta: {
    cor:   "laranja",
    label: "Alerta",
    frases: [
      "Os indicadores sugerem excesso significativo de gordura corporal. Vale priorizar mudanças graduais.",
      "Nesse patamar, o risco metabólico começa a subir. Mudanças de hábito têm impacto real.",
      "Gordura elevada tende a afetar energia, sono e disposição. O ponto de partida é alimentação.",
      "É um momento de atenção séria, não de pânico. Consistência pequena já move o ponteiro.",
      "Redução gradual de gordura aqui traz benefícios concretos de saúde em semanas.",
    ],
  },
  obesidade: {
    cor:   "vermelho",
    label: "Obesidade",
    frases: [
      "Os indicadores apontam para obesidade. Mudanças de estilo de vida têm impacto real e duradouro.",
      "Esse nível de gordura corporal aumenta riscos metabólicos. Acompanhamento profissional é recomendado.",
      "Não existe solução rápida aqui, mas existem soluções. Consistência supera intensidade.",
      "O caminho começa com um pequeno déficit e proteína suficiente. Simples, mas funciona.",
      "Essa situação é reversível com persistência. Mas exige suporte — nutricional e, idealmente, médico.",
    ],
  },
};

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ─────────────────────────────────────────────────────────────────────────────
//  LÓGICA DE PARECER
// ─────────────────────────────────────────────────────────────────────────────
function calcularParecer(imc, gordura, sexo) {
  const n = Number(imc);

  // Se tem percentual de gordura, usa ele para afinar
  if (gordura !== "" && gordura !== null && gordura !== undefined) {
    const g = Number(gordura);
    const limiteAtletico  = sexo === "masculino" ? 15 : 22;
    const limiteSaudavel  = sexo === "masculino" ? 20 : 28;
    const limiteAtencao   = sexo === "masculino" ? 25 : 33;
    const limiteAlerta    = sexo === "masculino" ? 30 : 38;

    if (g < limiteAtletico)  return PARECERES.atletico;
    if (g < limiteSaudavel)  return PARECERES.saudavel;
    if (g < limiteAtencao)   return PARECERES.atencao;
    if (g < limiteAlerta)    return PARECERES.alerta;
    return PARECERES.obesidade;
  }

  // Sem gordura: usa IMC
  if (n < 18.5) return PARECERES.abaixo;
  if (n < 25)   return PARECERES.saudavel;
  if (n < 30)   return PARECERES.atencao;
  if (n < 35)   return PARECERES.alerta;
  return PARECERES.obesidade;
}

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────
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
  const data     = raw.data ?? (raw.created_at
    ? new Date(raw.created_at).toLocaleDateString("pt-BR")
    : "—");

  return { ...raw, imc: imc.toFixed(1), imcTexto, metaKcal, proteina, data };
}

const isDesktop = () => window.innerWidth >= 768;

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENTE
// ─────────────────────────────────────────────────────────────────────────────
function MeuPlano({ onClose }) {
  const [user,       setUser]       = useState(null);
  const [etapa,      setEtapa]      = useState(1);
  const [peso,       setPeso]       = useState("");
  const [altura,     setAltura]     = useState("");
  const [idade,      setIdade]      = useState("");
  const [sexo,       setSexo]       = useState("");
  const [gordura,    setGordura]    = useState(""); // opcional
  const [objetivo,   setObjetivo]   = useState("");
  const [resultado,  setResultado]  = useState(null);
  const [registro,   setRegistro]   = useState(null);
  const [carregando, setCarregando] = useState(true);

  const navigate = useNavigate();

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  // ── Carrega plano ─────────────────────────────────────────────────────────
  useEffect(() => {
    const carregarPlano = async () => {
      // 1. Tenta localStorage
      const raw = JSON.parse(localStorage.getItem("meuPlano"));
      if (raw?.metaKcal && raw?.proteina && raw?.imcTexto) {
        setRegistro(raw);
        setCarregando(false);
        return;
      }
      if (raw) localStorage.removeItem("meuPlano");

      // 2. Sem user, para aqui — mostra formulário
      if (!user) {
        setCarregando(false);
        return;
      }

      // 3. Busca no Supabase
      const { data, error } = await supabase
        .from("registros")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data && !error) {
        const plano = normalizarPlano(data);
        setRegistro(plano);
        localStorage.setItem("meuPlano", JSON.stringify(plano));
      }

      setCarregando(false);
    };

    carregarPlano();
  }, [user]);

  // ── Avança etapa 1 → 2 ───────────────────────────────────────────────────
  const handleAvancar = () => {
    if (!peso || !altura || !idade || !sexo) {
      alert("Preencha todos os campos obrigatórios antes de continuar.");
      return;
    }
    if (Number(peso) <= 0 || Number(altura) <= 0 || Number(idade) <= 0) {
      alert("Os valores precisam ser maiores que zero.");
      return;
    }
    if (gordura !== "" && (Number(gordura) < 1 || Number(gordura) > 70)) {
      alert("Percentual de gordura deve estar entre 1% e 70%.");
      return;
    }
    setEtapa(2);
  };

  // ── Calcula resultado ────────────────────────────────────────────────────
  const handleCalcular = (obj) => {
    setObjetivo(obj);

    const p = Number(peso);
    const a = Number(altura);
    const i = Number(idade);
    const g = gordura !== "" ? Number(gordura) : null;

    let tmb;
    let metodoCalculo;

    if (g !== null) {
      // Katch-McArdle: usa massa magra
      const massaMagra = p * (1 - g / 100);
      tmb = Math.round(370 + 21.6 * massaMagra);
      metodoCalculo = "katch-mcArdle";
    } else {
      // Mifflin-St Jeor
      tmb = sexo === "masculino"
        ? 10 * p + 6.25 * a - 5 * i + 5
        : 10 * p + 6.25 * a - 5 * i - 161;
      tmb = Math.round(tmb);
      metodoCalculo = "mifflin-stJeor";
    }

    const config       = OBJETIVOS[obj];
    const manutencao   = Math.round(tmb * 1.4);
    const metaKcal     = manutencao + config.ajusteKcal;
    const metaProteina = Math.round(p * config.fatorProteina);

    const alturaM  = a / 100;
    const imc      = (p / (alturaM * alturaM)).toFixed(1);
    const imcTexto = getImcTexto(imc);

    const parecer        = calcularParecer(imc, g, sexo);
    const parecerFrase   = rand(parecer.frases);
    const parecerCor     = parecer.cor;
    const parecerLabel   = parecer.label;

    setResultado({
      tmb,
      manutencao,
      metaKcal,
      metaProteina,
      imc,
      imcTexto,
      gordura:       g,
      objetivo:      obj,
      config,
      metodoCalculo,
      parecerFrase,
      parecerCor,
      parecerLabel,
    });

    setEtapa(3);
  };

  // ── Salva plano ───────────────────────────────────────────────────────────
  const handleRegistrar = async () => {
    if (!resultado) return;

    const dataAtual     = new Date();
    const dataFormatada =
      dataAtual.toLocaleDateString("pt-BR") + " " +
      dataAtual.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const novoRegistro = {
      id:              Date.now(),
      data:            dataFormatada,
      peso,
      altura,
      idade,
      sexo,
      objetivo,
      imc:             resultado.imc,
      imcTexto:        resultado.imcTexto,
      tmb:             resultado.tmb,
      manutencao:      resultado.manutencao,
      metaKcal:        resultado.metaKcal,
      proteina:        resultado.metaProteina,
      gordura:         resultado.gordura,
      metodoCalculo:   resultado.metodoCalculo,
      parecerFrase:    resultado.parecerFrase,
      parecerCor:      resultado.parecerCor,
      parecerLabel:    resultado.parecerLabel,
    };

    if (user) {
      const { error } = await supabase
        .from("registros")
        .upsert(
          {
            user_id:            user.id,
            peso:               Number(peso),
            altura:             Number(altura),
            idade:              Number(idade),
            sexo,
            objetivo,
            metakcal:           Number(resultado.metaKcal),
            metaproteina:       Number(resultado.metaProteina),
            imc:                Number(resultado.imc),
            tmb:                Number(resultado.tmb),
            manutencao_kcal:    Number(resultado.manutencao),
            percentual_gordura: resultado.gordura,
            metodo_calculo:     resultado.metodoCalculo,
            parecer_corporal:   resultado.parecerFrase,
            parecer_cor:        resultado.parecerCor,
            parecer_label:      resultado.parecerLabel,
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

  // ── Reset ─────────────────────────────────────────────────────────────────
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
    setGordura("");
    setObjetivo("");
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  LOADING
  // ─────────────────────────────────────────────────────────────────────────
  if (carregando) return (
    <div className="planoContainer planoCarregando">
      <div className="planoSpinner" />
      <p className="planoCarregandoTexto">Carregando seu plano...</p>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  //  PLANO SALVO — exibe resultados
  // ─────────────────────────────────────────────────────────────────────────
  if (registro) {
    const cfg         = OBJETIVOS[registro.objetivo];
    const parecerCor  = registro.parecerCor  || "verde";
    const parecerLabel= registro.parecerLabel || "";
    const parecerFrase= registro.parecerFrase || "";

    return (
      <div className="planoContainer">

        <button
          className="btnVoltar"
          style={{ display: isDesktop() ? "none" : "flex" }}
          onClick={() => (onClose ? onClose() : navigate("/home"))}
        >
          ← Voltar
        </button>

        {/* Card principal do objetivo */}
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
              <span className="planoMetricaValor">
                {registro.imc} <small>({registro.imcTexto})</small>
              </span>
            </div>
            <div className="planoMetricaItem">
              <span className="planoMetricaLabel">TMB</span>
              <span className="planoMetricaValor">{registro.tmb} kcal</span>
            </div>
            {registro.gordura !== null && registro.gordura !== undefined && registro.gordura !== "" && (
              <div className="planoMetricaItem">
                <span className="planoMetricaLabel">% Gordura</span>
                <span className="planoMetricaValor">{registro.gordura}%</span>
              </div>
            )}
          </div>

          {/* Manutenção */}
          <div className="planoManutencaoBox">
            <p className="planoManutencaoTexto">
              Consumindo aproximadamente <strong>{registro.manutencao} kcal/dia</strong> você
              tende a manter seu peso atual.
            </p>
            <p className="planoManutencaoSub">
              Abaixo disso → tendência de perda de peso · Acima → tendência de ganho
            </p>
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

        {/* Card de parecer corporal */}
        {parecerFrase && (
          <div className={`planoParecer parecer-${parecerCor}`}>
            <div className="planoParecerTopo">
              <span className="planoParecerLabel">{parecerLabel}</span>
            </div>
            <p className="planoParecerFrase">{parecerFrase}</p>
          </div>
        )}

        <button className="planoBtnSecundario" onClick={handleReset}>
          Refazer cálculo
        </button>

      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  WIZARD — sem plano salvo
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="planoContainer">

      <button
        className="btnVoltar"
        style={{ display: isDesktop() ? "none" : "flex" }}
        onClick={() => (onClose ? onClose() : navigate("/home"))}
      >
        ← Voltar
      </button>

      {/* Indicador de etapa */}
      <div className="planoEtapas">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`planoEtapaDot ${etapa >= n ? "ativa" : ""}`} />
        ))}
      </div>

      {/* ── ETAPA 1: dados físicos ── */}
      {etapa === 1 && (
        <div className="planoEtapaBox">

          <h2 className="planoTitulo">Seus dados físicos</h2>
          <p className="planoSubtitulo">
            Usamos Mifflin-St Jeor por padrão. Se informar % de gordura, usamos Katch-McArdle para maior precisão.
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

            {/* % gordura — opcional */}
            <div className="planoInputGroup">
              <label>
                % Gordura corporal{" "}
                <span className="planoOpcional">(opcional — aumenta precisão)</span>
              </label>
              <div className="planoInputComUnidade">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 16"
                  value={gordura}
                  onChange={(e) => setGordura(e.target.value.replace(/[^\d.]/g, ""))}
                />
                <span className="planoUnidade">%</span>
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

      {/* ── ETAPA 2: objetivo ── */}
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

      {/* ── ETAPA 3: resultado ── */}
      {etapa === 3 && resultado && (
        <div className="planoEtapaBox">

          <button className="btnVoltar" onClick={() => setEtapa(2)}>
            ← Voltar
          </button>

          <h2 className="planoTitulo">Seu plano está pronto</h2>
          <p className="planoSubtitulo">{resultado.config.descricao}</p>

          {/* Grid de métricas */}
          <div className="planoResultadoGrid">

            <div className="planoResultadoItem">
              <span className="planoResultadoLabel">IMC estimado</span>
              <span className="planoResultadoValor">{resultado.imc}</span>
              <span className="planoResultadoSub">{resultado.imcTexto}</span>
            </div>

            <div className="planoResultadoItem">
              <span className="planoResultadoLabel">Metabolismo basal</span>
              <span className="planoResultadoValor">{resultado.tmb}</span>
              <span className="planoResultadoSub">
                kcal · {resultado.metodoCalculo === "katch-mcArdle" ? "Katch-McArdle" : "Mifflin-St Jeor"}
              </span>
            </div>

            <div className="planoResultadoItem">
              <span className="planoResultadoLabel">Manutenção</span>
              <span className="planoResultadoValor">{resultado.manutencao}</span>
              <span className="planoResultadoSub">kcal / dia</span>
            </div>

          </div>

          {/* Taxa de manutenção — explicação */}
          <div className="planoManutencaoBox">
            <p className="planoManutencaoTexto">
              Consumindo aproximadamente <strong>{resultado.manutencao} kcal/dia</strong> você
              tende a manter seu peso atual.
            </p>
            <p className="planoManutencaoSub">
              Abaixo disso → tendência de perda de peso · Acima → tendência de ganho
            </p>
          </div>

          {/* Metas */}
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

          {/* Parecer corporal */}
          <div className={`planoParecer parecer-${resultado.parecerCor}`}>
            <div className="planoParecerTopo">
              <span className="planoParecerLabel">{resultado.parecerLabel}</span>
            </div>
            <p className="planoParecerFrase">{resultado.parecerFrase}</p>
          </div>

          <p className="planoAviso">
            * Estimativa baseada em atividade moderada (fator 1.4). Ajuste conforme seu estilo de vida real.
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