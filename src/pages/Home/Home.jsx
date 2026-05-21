import "./Home.css";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProgressCircle from "../../components/ProgressCircle/ProgressCircle";
import KcalDiaria from "../KcalDiaria/KcalDiaria";
import Calendario from "../Calendario/Calendario";
import MeuPlano from "../MeuPlano/MeuPlano";
import Metas from "../Metas/metas";
import Agua from "../agua/Agua";
import GraficoKcal from "../../components/GraficoKcal/GraficoKcal";
import { supabase } from "../../services/supabaseClient";
import SmartBanner from "../SmartBanner/SmartBanner";
import Distintivos from "../Distintivos/Distintivos";
import Exercicio from "../Exercicio/Exercicio";

// ─────────────────────────────────────────────────────────────────────────────
//  UTILITÁRIOS
// ─────────────────────────────────────────────────────────────────────────────
const dataHoje = () => {
  const d  = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

// Plano só é considerado completo quando tem altura E idade preenchidos.
// Sem esses campos o cálculo de IMC/TMB não tem base — cadeados ficam ativos.
const planoEstaCompleto = (plano) => {
  if (!plano) return false;
  const altura = plano.altura ?? plano.height ?? null;
  const idade  = plano.idade  ?? plano.age    ?? null;
  return Boolean(altura && idade);
};

const CARDS = [
  { id: "kcal"       },
  { id: "calendario" },
  { id: "plano"      },
  { id: "metas"      },
  { id: "agua"       },
  { id: "exercicio"  },
];

const getColor = (value, max) => {
  if (!max) return "#3b82f6";
  const pct = value / max;
  if (pct < 0.7) return "#4ade80";
  if (pct < 1.0) return "#facc15";
  return "#ef4444";
};

const getColorCarbo = (value, max) => {
  if (!max) return "#3b82f6";
  const pct = value / max;
  if (pct < 0.45) return "#ef4444";
  if (pct < 0.8)  return "#facc15";
  if (pct <= 1.1) return "#4ade80";
  return "#ef4444";
};

const getColorAgua = (value, max) => {
  if (!max) return "#3b82f6";
  const pct = value / max;
  if (pct < 0.4) return "#ef4444";
  if (pct < 0.7) return "#facc15";
  return "#22d3ee";
};

const formatarNomePessoa = (nome = "") => {
  const minusculas = ["da", "de", "do", "das", "dos", "e"];
  return nome
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((parte, index) => {
      if (index > 0 && minusculas.includes(parte)) return parte;
      return parte.charAt(0).toUpperCase() + parte.slice(1);
    })
    .join(" ");
};

const calcularCarboTreino = (peso) => {
  if (!peso) return 0;
  const alvo = Number(peso) * 5 - 150;
  return Math.max(80, Math.round(alvo / 10) * 10);
};

const avaliarCarboTreino = (carboAtual, peso) => {
  const alvo = calcularCarboTreino(peso);

  if (!peso || !alvo) {
    return {
      alvo: 0,
      classe: "neutro",
      titulo: "Carbo para treino",
      texto: "Cadastre seu peso no plano para calcular seu nível de energia para treino.",
    };
  }

  const pct = carboAtual / alvo;

  if (pct < 0.4)   return { alvo, classe: "baixo", titulo: "Carbo baixo para treino",   texto: `Você consumiu ${carboAtual}g de carbo. Para ${peso}kg, uma boa referência antes de treinar é perto de ${alvo}g no dia. Energia pode faltar.` };
  if (pct < 0.65)  return { alvo, classe: "baixo", titulo: "Estoque ainda baixo",        texto: `Você está com ${carboAtual}g de carbo. Não está zerado, mas ainda está baixo para um treino forte. Referência: ${alvo}g.` };
  if (pct < 0.85)  return { alvo, classe: "medio", titulo: "Carbo ok, mas não ideal",    texto: `Você tem ${carboAtual}g de carbo. Não está ruim, mas ainda não está no melhor ponto para treinar pesado. Alvo estimado: ${alvo}g.` };
  if (pct <= 1.2)  return { alvo, classe: "bom",   titulo: "Bom nível para treino",      texto: `Você está com ${carboAtual}g de carbo. Para ${peso}kg, isso está numa faixa boa para render no treino. Alvo estimado: ${alvo}g.` };
  return             { alvo, classe: "alto",  titulo: "Carbo alto",                  texto: `Você já passou bastante do alvo estimado de ${alvo}g. Dá energia, mas cuidado para não virar excesso calórico no dia.` };
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENTE
// ─────────────────────────────────────────────────────────────────────────────
function Home() {
  const navigate = useNavigate();

  const [user,    setUser]    = useState(null);
  const [fase,    setFase]    = useState("loading");
  const [visible, setVisible] = useState(false);
  const [date,    setDate]    = useState(new Date());

  const isDesktop = () => window.innerWidth >= 768;
  const [abaAtiva, setAbaAtiva] = useState(null);

  const [planoCriado,  setPlanoCriado]  = useState(false);
  const [metaKcal,     setMetaKcal]     = useState(2000);
  const [metaProteina, setMetaProteina] = useState(150);
  const [metaCarbo,    setMetaCarbo]    = useState(250);
  const [pesoUsuario,  setPesoUsuario]  = useState(0);

  const [atualKcal,  setAtualKcal]  = useState(0);
  const [atualProt,  setAtualProt]  = useState(0);
  const [atualCarbo, setAtualCarbo] = useState(0);

  const [kcalAnimada,     setKcalAnimada]     = useState(0);
  const [proteinaAnimada, setProteinaAnimada] = useState(0);
  const [carboAnimado,    setCarboAnimado]    = useState(0);

  const [atualAgua,   setAtualAgua]   = useState(0);
  const [metaAgua,    setMetaAgua]    = useState(0);
  const [aguaAnimada, setAguaAnimada] = useState(0);

  const [nomeUsuario, setNomeUsuario] = useState(() =>
    formatarNomePessoa(localStorage.getItem("nomeUsuario") || "")
  );

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const pegarUsuario = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) { console.log(error); return; }
      setUser(data.user);
      const nome = data.user?.user_metadata?.nome;
      if (nome) {
        const nomeFormatado = formatarNomePessoa(nome);
        setNomeUsuario(nomeFormatado);
        localStorage.setItem("nomeUsuario", nomeFormatado);
      }
    };
    pegarUsuario();
  }, []);

  const handleLogout = async () => {
    const confirmar = window.confirm("Deseja realmente sair?");
    if (!confirmar) return;
    localStorage.clear();
    await supabase.auth.signOut();
    navigate("/");
  };

  // ── Totais kcal/prot/carbo — busca Supabase se logado ────────────────────
  useEffect(() => {
    const atualizar = async () => {
      if (!user?.id) {
        const k = localStorage.getItem("KcalDoDia");
        const p = localStorage.getItem("ProteinaDoDia");
        const c = localStorage.getItem("CarboDoDia");
        if (k) setAtualKcal(Number(k));
        if (p) setAtualProt(Number(p));
        if (c) setAtualCarbo(Number(c));
        return;
      }

      const { data, error } = await supabase
        .from("refeicoes")
        .select("kcal_total, prot_total, carb_total")
        .eq("user_id", user.id)
        .eq("datad", dataHoje());

      if (error || !data) return;

      const totalKcal  = data.reduce((s, r) => s + Number(r.kcal_total || 0), 0);
      const totalProt  = data.reduce((s, r) => s + Number(r.prot_total  || 0), 0);
      const totalCarbo = data.reduce((s, r) => s + Number(r.carb_total  || 0), 0);

      setAtualKcal(totalKcal);
      setAtualProt(totalProt);
      setAtualCarbo(totalCarbo);

      localStorage.setItem("KcalDoDia",     String(totalKcal));
      localStorage.setItem("ProteinaDoDia", String(totalProt));
      localStorage.setItem("CarboDoDia",    String(totalCarbo));
    };

    atualizar();
    window.addEventListener("kcalAtualizada", atualizar);
    return () => window.removeEventListener("kcalAtualizada", atualizar);
  }, [user?.id]);

  // ── Animações ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let sK = kcalAnimada, sP = proteinaAnimada, sC = carboAnimado;
    const steps = 40;
    const dK = (atualKcal  - sK) / steps;
    const dP = (atualProt  - sP) / steps;
    const dC = (atualCarbo - sC) / steps;
    let count = 0;
    const iv = setInterval(() => {
      count++; sK += dK; sP += dP; sC += dC;
      setKcalAnimada(Math.round(sK));
      setProteinaAnimada(Math.round(sP));
      setCarboAnimado(Math.round(sC));
      if (count >= steps) {
        setKcalAnimada(atualKcal); setProteinaAnimada(atualProt); setCarboAnimado(atualCarbo);
        clearInterval(iv);
      }
    }, 2000 / steps);
    return () => clearInterval(iv);
  }, [atualKcal, atualProt, atualCarbo]);

  useEffect(() => {
    let s = aguaAnimada;
    const steps = 40;
    const d = (atualAgua - s) / steps;
    let count = 0;
    const iv = setInterval(() => {
      count++; s += d;
      setAguaAnimada(Math.round(s));
      if (count >= steps) { setAguaAnimada(atualAgua); clearInterval(iv); }
    }, 2000 / steps);
    return () => clearInterval(iv);
  }, [atualAgua]);

  // ── Lê localStorage no mount ───────────────────────────────────────────────
  useEffect(() => {
    const metaK  = localStorage.getItem("metaKcal");
    const metaP  = localStorage.getItem("metaProteina");
    const metaC  = localStorage.getItem("metaCarbo");
    const atualK = localStorage.getItem("KcalDoDia");
    const atualP = localStorage.getItem("ProteinaDoDia");
    const atualC = localStorage.getItem("CarboDoDia");
    const metaA  = localStorage.getItem("metaAgua");
    const peso   = localStorage.getItem("peso");
    const atualA = localStorage.getItem(`aguaConsumida_${dataHoje()}`) || localStorage.getItem("aguaConsumida");

    if (metaK)  setMetaKcal(Number(metaK));
    if (metaP)  setMetaProteina(Number(metaP));
    if (metaC)  setMetaCarbo(Number(metaC));
    if (atualK) setAtualKcal(Number(atualK));
    if (atualP) setAtualProt(Number(atualP));
    if (atualC) setAtualCarbo(Number(atualC));
    if (metaA)  setMetaAgua(Number(metaA));
    if (peso)   setPesoUsuario(Number(peso));
    if (atualA) setAtualAgua(Number(atualA));
  }, []);

  // ── Verifica plano no localStorage ────────────────────────────────────────
  // Só considera completo se tiver altura E idade
  useEffect(() => {
    const plano = JSON.parse(localStorage.getItem("meuPlano"));
    setPlanoCriado(planoEstaCompleto(plano));
    if (plano?.peso)              setPesoUsuario(Number(plano.peso));
    if (plano?.carbo || plano?.metaCarbo) setMetaCarbo(Number(plano.carbo || plano.metaCarbo));
  }, []);

  // ── Evento planoCriado (MeuPlano salva e dispara) ─────────────────────────
  useEffect(() => {
    const onPlanoCriado = () => {
      const plano = JSON.parse(localStorage.getItem("meuPlano"));
      if (!plano) return;
      setMetaKcal(plano.manutencao || plano.metaKcal || 2000);
      setMetaProteina(plano.proteina || plano.metaProteina || 150);
      setMetaCarbo(plano.carbo || plano.metaCarbo || 250);
      if (plano.peso) setPesoUsuario(Number(plano.peso));
      // Atualiza cadeado com a mesma regra
      setPlanoCriado(planoEstaCompleto(plano));
    };
    window.addEventListener("planoCriado", onPlanoCriado);
    return () => window.removeEventListener("planoCriado", onPlanoCriado);
  }, []);

  // ── Carrega plano do Supabase ──────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const carregarDados = async () => {
      const { data: registro, error } = await supabase
        .from("registros")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) { console.log(error); return; }
      if (!registro) return;

      const imc      = Number(registro.imc);
      const imcTexto =
        imc < 18.5 ? "Abaixo do peso" :
        imc < 25   ? "Peso saudável"  :
        imc < 30   ? "Sobrepeso"      : "Obesidade";

      const plano = {
        ...registro,
        metaKcal: registro.metakcal,
        proteina: registro.metaproteina,
        carbo:    registro.metacarbo || registro.carbo || 250,
        // garante que altura e idade chegam com o nome certo
        altura:   registro.altura   || registro.height || null,
        idade:    registro.idade    || registro.age    || null,
        imc:      imc.toFixed(1),
        imcTexto,
        data: registro.created_at
          ? new Date(registro.created_at).toLocaleDateString("pt-BR")
          : "—",
      };

      localStorage.setItem("meuPlano",     JSON.stringify(plano));
      localStorage.setItem("metaKcal",     String(plano.metaKcal));
      localStorage.setItem("metaProteina", String(plano.proteina));
      localStorage.setItem("metaCarbo",    String(plano.carbo));

      // Cadeado só abre se altura e idade estiverem presentes
      setPlanoCriado(planoEstaCompleto(plano));
      setMetaKcal(Number(plano.metaKcal));
      setMetaProteina(Number(plano.proteina));
      setMetaCarbo(Number(plano.carbo));

      if (registro.peso) {
        const peso            = Number(registro.peso);
        const metaAguaCalculada = Math.round(peso * 35);
        setPesoUsuario(peso);
        setMetaAgua(metaAguaCalculada);
        localStorage.setItem("peso",     String(peso));
        localStorage.setItem("metaAgua", String(metaAguaCalculada));
      }
    };
    carregarDados();
  }, [user?.id]);

  // ── Água ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const aplicarAguaLocal = (event) => {
      if (event?.detail) {
        const { consumo, meta } = event.detail;
        if (consumo !== undefined) setAtualAgua(Number(consumo));
        if (meta !== undefined && Number(meta) > 0) setMetaAgua(Number(meta));
        return;
      }
      const atualA = localStorage.getItem(`aguaConsumida_${dataHoje()}`) || localStorage.getItem("aguaConsumida");
      const metaA  = localStorage.getItem("metaAgua");
      if (atualA !== null) setAtualAgua(Number(atualA));
      if (metaA  !== null) setMetaAgua(Number(metaA));
    };

    const buscarAguaRemota = async () => {
      aplicarAguaLocal();
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("agua_diaria")
        .select("consumo, meta")
        .eq("user_id", user.id)
        .eq("datad", dataHoje())
        .maybeSingle();
      if (!error && data) {
        const consumo = Number(data.consumo || 0);
        const meta    = Number(data.meta    || 0);
        setAtualAgua(consumo);
        if (meta > 0) setMetaAgua(meta);
        localStorage.setItem(`aguaConsumida_${dataHoje()}`, String(consumo));
        localStorage.setItem("aguaConsumida", String(consumo));
        if (meta > 0) localStorage.setItem("metaAgua", String(meta));
      }
    };

    buscarAguaRemota();
    window.addEventListener("aguaAtualizada", aplicarAguaLocal);
    window.addEventListener("storage",        aplicarAguaLocal);
    return () => {
      window.removeEventListener("aguaAtualizada", aplicarAguaLocal);
      window.removeEventListener("storage",        aplicarAguaLocal);
    };
  }, [user?.id]);

  // ── Welcome / fase ─────────────────────────────────────────────────────────
  useEffect(() => {
    const jaMostrou = localStorage.getItem("jaMostrouWelcome");
    if (jaMostrou) { setFase("dashboard"); return; }
    const timer = setTimeout(() => {
      setFase("dashboard");
      localStorage.setItem("jaMostrouWelcome", "true");
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // ── Relógio ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // ── Navegação cards ────────────────────────────────────────────────────────
  const handleCardClick = (cardId) => {
    if (!planoCriado && cardId !== "plano") {
      alert("Complete seu plano primeiro (altura e idade são obrigatórios)");
      return;
    }
    if (isDesktop()) {
      setAbaAtiva((prev) => (prev === cardId ? null : cardId));
      return;
    }
    const rotas = {
      kcal:       "/home/kcaldiaria",
      calendario: "/home/calendario",
      plano:      "/home/plano",
      metas:      "/home/metas",
      agua:       "/home/agua",
      exercicio:  "/home/exercicio",
    };
    if (rotas[cardId]) navigate(rotas[cardId]);
  };

  const fecharAba = () => {
    setAbaAtiva(null);
    const atualA = localStorage.getItem(`aguaConsumida_${dataHoje()}`) || localStorage.getItem("aguaConsumida");
    const metaA  = localStorage.getItem("metaAgua");
    const atualC = localStorage.getItem("CarboDoDia");
    if (atualA !== null) setAtualAgua(Number(atualA));
    if (metaA  !== null) setMetaAgua(Number(metaA));
    if (atualC !== null) setAtualCarbo(Number(atualC));
  };

  const aguaLitros     = Math.round(aguaAnimada / 100) / 10;
  const metaAguaLitros = Math.round(metaAgua    / 100) / 10;
  const carboTreino    = avaliarCarboTreino(atualCarbo, pesoUsuario);

  // ─────────────────────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="homeContainer">
      {fase === "loading" ? (
        <div className="loadingScreen">
          <h1 className={`welcome ${visible ? "show" : "hide"}`}>
            Olá, {nomeUsuario || "usuário"}
          </h1>
          <div className={`dateTime ${visible ? "show" : "hide"}`}>
            <p>{date.toLocaleDateString()}</p>
            <p>{date.toLocaleTimeString()}</p>
          </div>
        </div>
      ) : (
        <div className="dashboard">
          <div className="desktopHeader">
            <span className="desktopNome">Olá, {nomeUsuario || "usuário"}</span>
            <button className="btnLogout" onClick={handleLogout}>Sair</button>
          </div>

          <div className="homeDistintivosArea">
            <Distintivos user={user} />
          </div>

          <hr className="linha" />

          <div className="cards">
            {CARDS.map((card) => (
              <div
                key={card.id}
                className={`card ${card.id} ${
                  !planoCriado && card.id !== "plano" ? "bloqueado" : ""
                } ${abaAtiva === card.id ? "cardAtivo" : ""}`}
                onClick={() => handleCardClick(card.id)}
              >
                <span></span>
              </div>
            ))}
          </div>

          {planoCriado && <SmartBanner />}

          <div className="mainRow">
            <div className={`colCirculos ${!planoCriado ? "bloqueadoCirculos" : ""}`}>
              {!planoCriado && <div className="overlayBloqueado">🔒</div>}
              <div className="boxCirculos">
                <div className="tituloCirculos">Consumo diário</div>
                <div className="circulosWrapper">
                  <div>
                    <ProgressCircle value={kcalAnimada}     max={metaKcal}      color={getColor(atualKcal, metaKcal)} />
                    <div className="circleLabel">Calorias</div>
                  </div>
                  <div>
                    <ProgressCircle value={proteinaAnimada} max={metaProteina}   color={getColor(atualProt, metaProteina)} />
                    <div className="circleLabel">Proteína</div>
                  </div>
                  <div>
                    <ProgressCircle value={aguaLitros}      max={metaAguaLitros || 2} color={getColorAgua(atualAgua, metaAgua)} />
                    <div className="circleLabel">Água (L)</div>
                  </div>
                  <div>
                    <ProgressCircle value={carboAnimado}    max={metaCarbo}      color={getColorCarbo(atualCarbo, metaCarbo)} />
                    <div className="circleLabel">Carbo</div>
                  </div>
                </div>
                <div className={`carboTreinoBox ${carboTreino.classe}`}>
                  <p className="carboTreinoTitulo">{carboTreino.titulo}</p>
                  <p className="carboTreinoTexto">{carboTreino.texto}</p>
                </div>
              </div>
            </div>

            <div className="colConteudo">
              {abaAtiva === null ? (
                <div className="placeholder">
                  <span className="placeholderIcon">👆</span>
                  <p>Clique em alguma função para começar</p>
                </div>
              ) : (
                <div className="componenteWrapper">
                  {abaAtiva === "kcal"       && <KcalDiaria  onClose={fecharAba} />}
                  {abaAtiva === "calendario" && <Calendario   onClose={fecharAba} />}
                  {abaAtiva === "plano"      && <MeuPlano     onClose={fecharAba} />}
                  {abaAtiva === "metas"      && <Metas        onClose={fecharAba} />}
                  {abaAtiva === "agua"       && <Agua         onClose={fecharAba} />}
                  {abaAtiva === "exercicio"  && <Exercicio    onClose={fecharAba} />}
                </div>
              )}
            </div>
          </div>

          {planoCriado && (
            <div className="graficoFullWidth">
              <GraficoKcal user={user} />
            </div>
          )}

          <hr className="linha desktopOnly" />
          <div className="rodapeDesktop">
            <p>{date.toLocaleDateString()}</p>
            <p>{date.toLocaleTimeString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;