
import "./metas.css";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";


const FRASES = {

  // ── CALORIAS ───────────────────────────────────────────────────────────────
  // Lógica especial: pouco É tão ruim quanto muito
  kcal: {
    // 0 a 15% — déficit perigoso
    f0: [
      { emoji: "🚨", titulo: "Calorias críticas", msg: "Você quase não comeu hoje. Déficit assim derruba seu metabolismo." },
      { emoji: "⛔", titulo: "Ingestão perigosa", msg: "Seu corpo está entrando em modo de sobrevivência. Coma." },
      { emoji: "📉", titulo: "Calorias no chão", msg: "Abaixo de 15% da meta. Isso é severo demais, não é cutting, é descuido." },
      { emoji: "🆘", titulo: "Alerta máximo", msg: "Com esse déficit você perde músculo, força e foco. Não compensa." },
      { emoji: "🧨", titulo: "Risco metabólico", msg: "Metabolismo em queda livre. Coma alguma coisa agora." },
    ],
    // 16 a 30% — muito baixo
    f16: [
      { emoji: "⚠️", titulo: "Calorias muito baixas", msg: "Você está bem abaixo do necessário. Seu corpo vai cobrar essa dívida." },
      { emoji: "🪫", titulo: "Energia no negativo", msg: "Menos de 30% da meta calórica. Adicione pelo menos mais uma refeição." },
      { emoji: "😵", titulo: "Déficit severo", msg: "Com esse nível calórico, concentração e disposição caem bastante." },
      { emoji: "🍳", titulo: "Falta combustível", msg: "Seu tanque está quase vazio. Uma refeição completa resolve isso." },
      { emoji: "📊", titulo: "Muito abaixo do ideal", msg: "Cortar calorias assim em excesso não acelera resultado — sabota." },
    ],
    // 31 a 50% — abaixo, mas tolerável
    f31: [
      { emoji: "📉", titulo: "Abaixo do ideal", msg: "Você está na metade do caminho calórico. Ainda dá tempo de equilibrar." },
      { emoji: "🍽️", titulo: "Atenção às calorias", msg: "Faltou energia hoje. Não precisa exagerar, mas coma mais." },
      { emoji: "🕐", titulo: "Dia incompleto", msg: "Ainda há tempo de corrigir. Uma refeição caprichada resolve." },
      { emoji: "💬", titulo: "Calorias baixas", msg: "Déficit agressivo sem necessidade. Seu corpo precisa de mais." },
      { emoji: "🧮", titulo: "Conta não fecha", msg: "Gasto calórico maior que a ingestão em excesso. Reequilibre." },
    ],
    // 51 a 70% — zona ideal
    f51: [
      { emoji: "✅", titulo: "Zona ideal", msg: "Você está na faixa perfeita. Calorias equilibradas sem excessos." },
      { emoji: "🎯", titulo: "Alvo calórico", msg: "Nem muito, nem pouco. Exatamente onde você precisa estar." },
      { emoji: "🟢", titulo: "Calorias no ponto", msg: "Ótimo equilíbrio calórico. Continue assim até o final do dia." },
      { emoji: "👌", titulo: "Excelente controle", msg: "Essa faixa é onde resultados acontecem. Mantenha." },
      { emoji: "🌟", titulo: "Gestão perfeita", msg: "Calorias bem distribuídas. Seu metabolismo está te agradecendo." },
      { emoji: "⚡", titulo: "Energia calibrada", msg: "Nem déficit agressivo, nem excesso. Isso é inteligência nutricional." },
    ],
    // 71 a 85% — atenção, quase estourando
    f71: [
      { emoji: "🟡", titulo: "Quase estourando", msg: "Tá chegando no limite. Maneira nas próximas refeições." },
      { emoji: "👀", titulo: "De olho nas calorias", msg: "Mais de 70% consumido. Cuidado com petiscos e extras." },
      { emoji: "⚠️", titulo: "Calorias altas", msg: "Ainda dentro, mas bem próximo do teto. Sem descuidos." },
      { emoji: "🍽️", titulo: "Fique atento", msg: "O dia está quase cheio caloricamente. Prefira proteína se ainda for comer." },
      { emoji: "📏", titulo: "Margem pequena", msg: "Pouca margem calórica sobrando. Avalie bem antes da próxima refeição." },
    ],
    // 86 a 100% — no limite
    f86: [
      { emoji: "🔴", titulo: "Calorias no limite", msg: "Você está quase batendo a meta. Se puder, pare por aqui." },
      { emoji: "🛑", titulo: "Teto calórico", msg: "Restam pouquíssimas calorias. Só coma se for necessidade real." },
      { emoji: "📍", titulo: "Limite calórico", msg: "Chegou na borda. Uma última refeição leve, no máximo." },
      { emoji: "🔒", titulo: "Meta quase cheia", msg: "Praticamente no máximo. Priorize água e evite extras." },
      { emoji: "🏁", titulo: "Linha de chegada", msg: "Você está bem próximo do teto calórico do dia. Atenção total." },
    ],
    // 101%+ — estourou
    f101: [
      { emoji: "💥", titulo: "Meta calórica estourada", msg: "Passou da meta. Amanhã começa do zero — água, proteína e foco." },
      { emoji: "🚫", titulo: "Excesso calórico", msg: "Hoje foi além do planejado. Acontece. O importante é o próximo dia." },
      { emoji: "📈", titulo: "Calorias acima do limite", msg: "Um dia acima não destrói o resultado, mas virar padrão vai." },
      { emoji: "🔥", titulo: "Saldo negativo", msg: "Estourou. Amanhã: mais água, mais proteína, menos caloria extra." },
      { emoji: "🌊", titulo: "Dia difícil", msg: "Todo mundo tem. O que importa é não transformar em hábito." },
      { emoji: "♻️", titulo: "Reset amanhã", msg: "Hoje passou. Amanhã é dia novo — recomece sem culpa, mas com foco." },
    ],
  },

  // ── PROTEÍNA ───────────────────────────────────────────────────────────────
  proteina: {
    // 0 a 20% — crítico
    f0: [
      { emoji: "🚨", titulo: "Proteína crítica", msg: "Quase zero de proteína. Você está perdendo músculo agora." },
      { emoji: "⛔", titulo: "Déficit proteico severo", msg: "Com esse nível, o corpo busca energia nos músculos. Coma proteína." },
      { emoji: "🆘", titulo: "Emergência proteica", msg: "Frango, ovo, atum — qualquer coisa. Mas coma proteína agora." },
      { emoji: "📉", titulo: "Proteína no chão", msg: "Menos de 20% da meta. Isso compromete recuperação e composição corporal." },
      { emoji: "🧬", titulo: "Catabolismo em risco", msg: "Sem proteína, seu treino não gera resultado. Corrija isso agora." },
    ],
    // 21 a 40%
    f21: [
      { emoji: "⚠️", titulo: "Proteína muito baixa", msg: "Você está bem abaixo do necessário. Adicione uma fonte proteica agora." },
      { emoji: "🥩", titulo: "Déficit proteico", msg: "Menos de 40% da meta. Ainda dá tempo de recuperar o dia." },
      { emoji: "🍗", titulo: "Falta proteína", msg: "Um peito de frango ou 3 ovos já fazem diferença. Não negligencie." },
      { emoji: "🪫", titulo: "Músculo sem combustível", msg: "Treino sem proteína é esforço pela metade. Corrija isso." },
      { emoji: "📊", titulo: "Proteína insuficiente", msg: "Você está abaixo de 40%. O corpo precisa de mais." },
    ],
    // 41 a 60%
    f41: [
      { emoji: "📉", titulo: "Proteína abaixo", msg: "Metade da meta ainda não foi atingida. Inclua proteína nas próximas refeições." },
      { emoji: "🥚", titulo: "Atenção à proteína", msg: "Está razoável, mas ainda longe. Uma boa refeição proteica muda o jogo." },
      { emoji: "🐟", titulo: "Falta chegar lá", msg: "Você passou da metade, mas ainda tem um bom caminho. Continue." },
      { emoji: "💬", titulo: "Proteína em progresso", msg: "Tá vindo, mas precisa acelerar para fechar a meta." },
      { emoji: "🥛", titulo: "Meio do caminho", msg: "50% da meta proteica. Ainda dá pra fechar bem o dia." },
    ],
    // 61 a 80%
    f61: [
      { emoji: "👍", titulo: "Proteína razoável", msg: "Você está no caminho certo. Mais uma refeição e fecha a meta." },
      { emoji: "📈", titulo: "Progresso proteico", msg: "Mais de 60% da meta. Continue e não pare antes de fechar." },
      { emoji: "🍳", titulo: "Quase lá", msg: "Boa ingestão. Mais um snack proteico e você fecha o dia bem." },
      { emoji: "🎯", titulo: "Se aproximando", msg: "Você está perto. Não deixe a proteína cair nos últimos lanchinhos." },
      { emoji: "💡", titulo: "Boa proteína", msg: "Está indo bem. Garanta mais uma fonte proteica antes de dormir." },
    ],
    // 81 a 90% — bom, dourado
    f81: [
      { emoji: "🥇", titulo: "Proteína excelente", msg: "Mais de 80% da meta. Seu músculo está sendo bem alimentado." },
      { emoji: "🏅", titulo: "Nível ouro", msg: "Quase na meta proteica. Mais um passo e fecha perfeito." },
      { emoji: "💛", titulo: "Proteína muito boa", msg: "Você está a menos de 20% de fechar. Termine o dia forte." },
      { emoji: "🔑", titulo: "Muito perto do topo", msg: "Esse nível de proteína já garante boa recuperação. Finalize bem." },
      { emoji: "⭐", titulo: "Quase na meta", msg: "Está excelente. Um iogurte, um ovo ou uma fatia de carne fecha o dia." },
    ],
    // 91 a 100%+ — impecável, dourado
    f91: [
      { emoji: "🏆", titulo: "Meta proteica batida", msg: "Proteína em dia. Síntese muscular garantida. Dia impecável." },
      { emoji: "💎", titulo: "Proteína perfeita", msg: "Você fez a parte mais importante da nutrição. Isso tem resultado." },
      { emoji: "🌟", titulo: "Nível máximo", msg: "Meta proteica atingida. Seu corpo vai usar bem cada grama disso." },
      { emoji: "🎖️", titulo: "Execução proteica perfeita", msg: "Poucas pessoas chegam aqui todo dia. Você chegou." },
      { emoji: "✨", titulo: "Proteína impecável", msg: "100% da meta. Recuperação garantida, músculo preservado." },
      { emoji: "🔋", titulo: "Tanque proteico cheio", msg: "Com essa ingestão, seu treino de amanhã já tem suporte." },
    ],
  },

  // ── CARBOIDRATO ────────────────────────────────────────────────────────────
  carbo: {
    // 0 a 80% — ok, sem aviso
    f0: [
      { emoji: "✅", titulo: "Carboidrato ok", msg: "Ingestão de carboidratos dentro do esperado." },
      { emoji: "🟢", titulo: "Carbo equilibrado", msg: "Sem excessos no carboidrato. Continue assim." },
      { emoji: "👌", titulo: "Carbo no controle", msg: "Boa gestão de carboidratos hoje." },
      { emoji: "🍚", titulo: "Carboidrato saudável", msg: "Você está usando carboidratos de forma inteligente." },
      { emoji: "📏", titulo: "Dentro da faixa", msg: "Nada a reclamar nos carboidratos. Siga em frente." },
    ],
    // 81 a 100% — atenção
    f81: [
      { emoji: "🟡", titulo: "Carbo subindo", msg: "Você está perto do teto de carboidratos. Atenção nas próximas refeições." },
      { emoji: "🍞", titulo: "Cuidado com o carbo", msg: "Pão, arroz, massa — tudo acumulou. Mantenha o controle no resto do dia." },
      { emoji: "⚠️", titulo: "Carboidrato alto", msg: "Fique de olho. Mais um passo e estoura." },
      { emoji: "🍌", titulo: "Carbo no limite", msg: "Próximo do máximo de carboidratos. Prefira proteínas agora." },
      { emoji: "📊", titulo: "Quase no teto", msg: "Carboidratos altos. Equilibre com proteína e verduras." },
    ],
    // 101%+ — estourou
    f101: [
      { emoji: "📈", titulo: "Carbo estourado", msg: "Você passou da meta de carboidratos. Amanhã reduza pão, arroz e massas." },
      { emoji: "🍬", titulo: "Excesso de carbo", msg: "Carboidrato em excesso vira estoque de gordura se não for queimado." },
      { emoji: "⚡", titulo: "Energia em excesso", msg: "Carbo alto demais. Compense com mais movimento ou menos carbo amanhã." },
      { emoji: "🔄", titulo: "Reequilibre amanhã", msg: "Hoje passou no carbo. Amanhã priorize proteína e vegetais." },
      { emoji: "🚨", titulo: "Carbo acima do limite", msg: "Passado o limite. Cuidado com açúcar escondido também." },
      { emoji: "🍚", titulo: "Muito carbo hoje", msg: "Arroz, pão, massa... tudo acumulou. Fique mais atento amanhã." },
    ],
  },

  // ── ÁGUA ───────────────────────────────────────────────────────────────────
  agua: {
    // 0 a 20% — crítico
    f0: [
      { emoji: "🚨", titulo: "Hidratação crítica", msg: "Você quase não bebeu água hoje. Seu corpo está pedindo socorro." },
      { emoji: "🏜️", titulo: "Desidratação severa", msg: "Menos de 20% da meta de água. Isso afeta tudo: foco, metabolismo, humor." },
      { emoji: "⛔", titulo: "Água urgente", msg: "Pare o que está fazendo e beba água agora. Isso é urgente." },
      { emoji: "🧠", titulo: "Cérebro desidratado", msg: "Falta de água reduz concentração e aumenta fadiga. Beba agora." },
      { emoji: "🌡️", titulo: "Risco de desidratação", msg: "Com esse nível, qualquer esforço físico já é perigoso." },
    ],
    // 21 a 40%
    f21: [
      { emoji: "💧", titulo: "Água muito baixa", msg: "Você está bem abaixo da meta. Beba um copo agora, depois outro." },
      { emoji: "⚠️", titulo: "Hidratação insuficiente", msg: "Menos de 40% da meta. Faça disso uma prioridade agora." },
      { emoji: "🌊", titulo: "Água insuficiente", msg: "Seu metabolismo trabalha melhor hidratado. Encha o copo." },
      { emoji: "😴", titulo: "Cansaço pode ser água", msg: "Antes de culpar o sono, beba 2 copos d'água e veja a diferença." },
      { emoji: "🪫", titulo: "Energia baixa?", msg: "Desidratação causa fadiga. Beba água antes de tudo." },
    ],
    // 41 a 60%
    f41: [
      { emoji: "📊", titulo: "Metade da água", msg: "Você está na metade. Ainda dá para fechar a meta com esforço." },
      { emoji: "🕐", titulo: "No meio do caminho", msg: "50% de hidratação. A segunda metade é mais fácil se você começar agora." },
      { emoji: "💬", titulo: "Água razoável", msg: "Tá vindo, mas precisa acelerar. Um copo por hora resolve." },
      { emoji: "🥤", titulo: "Continue bebendo", msg: "Boa base de hidratação. Mas não relaxe, ainda tem caminho." },
      { emoji: "⚗️", titulo: "Metabolismo pedindo mais", msg: "Com mais água, tudo funciona melhor. Continue hidratando." },
    ],
    // 61 a 80%
    f61: [
      { emoji: "👍", titulo: "Boa hidratação", msg: "Mais de 60% da meta de água. Continue e feche o dia bem hidratado." },
      { emoji: "💧", titulo: "Progresso hídrico", msg: "Você está no caminho certo. Mais uns copos e fecha a meta." },
      { emoji: "🌿", titulo: "Hidratação boa", msg: "Está indo bem. Não deixe de terminar a meta antes de dormir." },
      { emoji: "📈", titulo: "Água em progresso", msg: "Perto dos 80%. Mais dois copos e você está bem." },
      { emoji: "🎯", titulo: "Quase na meta", msg: "Boa hidratação. Finalize o dia bebendo mais um pouco." },
    ],
    // 81 a 90% — ótimo, dourado
    f81: [
      { emoji: "🥇", titulo: "Hidratação excelente", msg: "Mais de 80% da meta de água. Seu corpo está funcionando bem." },
      { emoji: "💛", titulo: "Quase completo", msg: "Hidratação muito boa. Mais um copo e fecha perfeito." },
      { emoji: "🌊", titulo: "Nível ouro de água", msg: "Você está cuidando do básico que muita gente ignora." },
      { emoji: "⭐", titulo: "Hidratação top", msg: "Pele, metabolismo, foco — tudo agradece essa hidratação." },
      { emoji: "🏅", titulo: "Quase na meta hídrica", msg: "Quase lá. Um copo antes de dormir e fecha o dia perfeito." },
    ],
    // 91%+ — impecável, dourado
    f91: [
      { emoji: "🏆", titulo: "Meta de água batida", msg: "Hidratação impecável. Seu corpo está no melhor estado possível." },
      { emoji: "💎", titulo: "Hidratação perfeita", msg: "Meta atingida. Você está cuidando do seu corpo de verdade." },
      { emoji: "🌟", titulo: "Nível máximo de água", msg: "100% de hidratação. Metabolismo, pele e foco agradecem." },
      { emoji: "✨", titulo: "Água impecável", msg: "Poucos chegam na meta hídrica todo dia. Você chegou." },
      { emoji: "🫧", titulo: "Completamente hidratado", msg: "Meta de água fechada. Isso faz mais diferença do que parece." },
      { emoji: "🔵", titulo: "Hidratação no topo", msg: "Impecável. Essa consistência com água tem impacto direto no resultado." },
    ],
  },
};

const fraseAleatoria = (lista) => lista[Math.floor(Math.random() * lista.length)];

const avaliarKcal = (valor, meta) => {
  if (!meta) return null;
  const pct = (valor / meta) * 100;

  if (pct <= 15)  return { ...fraseAleatoria(FRASES.kcal.f0),   tipo: "alerta"   };
  if (pct <= 30)  return { ...fraseAleatoria(FRASES.kcal.f16),  tipo: "alerta"   };
  if (pct <= 50)  return { ...fraseAleatoria(FRASES.kcal.f31),  tipo: "aviso"    };
  if (pct <= 70)  return { ...fraseAleatoria(FRASES.kcal.f51),  tipo: "ouro"     }; // zona ideal
  if (pct <= 85)  return { ...fraseAleatoria(FRASES.kcal.f71),  tipo: "aviso"    };
  if (pct <= 100) return { ...fraseAleatoria(FRASES.kcal.f86),  tipo: "alerta"   };
  return           { ...fraseAleatoria(FRASES.kcal.f101), tipo: "alerta"   };
};

// Retorna { frase, tipo } para PROTEÍNA
const avaliarProteina = (valor, meta) => {
  if (!meta) return null;
  const pct = (valor / meta) * 100;

  if (pct <= 20)  return { ...fraseAleatoria(FRASES.proteina.f0),   tipo: "alerta" };
  if (pct <= 40)  return { ...fraseAleatoria(FRASES.proteina.f21),  tipo: "alerta" };
  if (pct <= 60)  return { ...fraseAleatoria(FRASES.proteina.f41),  tipo: "aviso"  };
  if (pct <= 80)  return { ...fraseAleatoria(FRASES.proteina.f61),  tipo: "aviso"  };
  if (pct <= 90)  return { ...fraseAleatoria(FRASES.proteina.f81),  tipo: "ouro"   };
  return           { ...fraseAleatoria(FRASES.proteina.f91), tipo: "ouro"   };
};

// Retorna { frase, tipo } para CARBOIDRATO (só aparece se relevante)
const avaliarCarbo = (valor, meta) => {
  if (!meta) return null;
  const pct = (valor / meta) * 100;

  if (pct <= 80)  return { ...fraseAleatoria(FRASES.carbo.f0),   tipo: "ok"     };
  if (pct <= 100) return { ...fraseAleatoria(FRASES.carbo.f81),  tipo: "aviso"  };
  return           { ...fraseAleatoria(FRASES.carbo.f101), tipo: "alerta" };
};

// Retorna { frase, tipo } para ÁGUA
const avaliarAgua = (valor, meta) => {
  if (!meta) return null;
  const pct = (valor / meta) * 100;

  if (pct <= 20)  return { ...fraseAleatoria(FRASES.agua.f0),   tipo: "alerta" };
  if (pct <= 40)  return { ...fraseAleatoria(FRASES.agua.f21),  tipo: "alerta" };
  if (pct <= 60)  return { ...fraseAleatoria(FRASES.agua.f41),  tipo: "aviso"  };
  if (pct <= 80)  return { ...fraseAleatoria(FRASES.agua.f61),  tipo: "aviso"  };
  if (pct <= 90)  return { ...fraseAleatoria(FRASES.agua.f81),  tipo: "ouro"   };
  return           { ...fraseAleatoria(FRASES.agua.f91), tipo: "ouro"   };
};

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS DE COR / PROGRESSO
// ─────────────────────────────────────────────────────────────────────────────
const getPercent = (valor, meta) => {
  if (!meta) return 0;
  return Math.min((valor / meta) * 100, 100);
};

// Cor da barra de progresso
// invertido = verde quando alto (proteína, água)
// kcal tem lógica própria: ideal é 51–70%
const getCorBarra = (valor, meta, tipo) => {
  const pct = meta ? (valor / meta) * 100 : 0;

  if (tipo === "kcal") {
    if (pct <= 30)  return "vermelho";
    if (pct <= 50)  return "amarelo";
    if (pct <= 70)  return "verde";
    if (pct <= 85)  return "amarelo";
    return "vermelho";
  }

  if (tipo === "proteina" || tipo === "agua") {
    if (pct <= 40)  return "vermelho";
    if (pct <= 75)  return "amarelo";
    return "verde";
  }

  // carbo
  if (pct <= 80)  return "verde";
  if (pct <= 100) return "amarelo";
  return "vermelho";
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
function Metas( {onClose} ) {
  const navigate = useNavigate();
  const isDesktop = () => window.innerWidth >= 768;
  const [dados, setDados] = useState({
    kcal: 0, proteina: 0, carbo: 0, agua: 0,
    metaKcal: 0, metaProteina: 0, metaCarbo: 250, metaAgua: 0,
  });

  const [cards, setCards] = useState([]);

  // ── carrega dados ──────────────────────────────────────────────────────────
  useEffect(() => {
    const plano    = JSON.parse(localStorage.getItem("meuPlano")) || {};
    const kcal     = Number(localStorage.getItem("KcalDoDia"))     || 0;
    const proteina = Number(localStorage.getItem("ProteinaDoDia")) || 0;
    const carbo    = Number(localStorage.getItem("CarboDoDia"))    || 0;
    const agua     = Number(localStorage.getItem("aguaConsumida")) || 0;
    const metaAgua = Number(localStorage.getItem("metaAgua"))      || 2000;

    setDados({
      kcal, proteina, carbo, agua,
      metaKcal:     plano.metaKcal    || plano.calorias    || 1800,
      metaProteina: plano.proteina    || plano.metaProteina || 150,
      metaCarbo:    plano.carbo       || 250,
      metaAgua,
    });
  }, []);

  // ── gera cards de feedback ─────────────────────────────────────────────────
  useEffect(() => {
    if (!dados.metaKcal) return;
    const lista = [];

    const kcalCard     = avaliarKcal(dados.kcal, dados.metaKcal);
    const protCard     = avaliarProteina(dados.proteina, dados.metaProteina);
    const carboCard    = avaliarCarbo(dados.carbo, dados.metaCarbo);
    const aguaCard     = avaliarAgua(dados.agua, dados.metaAgua);

    if (kcalCard)  lista.push(kcalCard);
    if (protCard)  lista.push(protCard);
    // só mostra carbo se estiver acima de 80%
    if (carboCard && carboCard.tipo !== "ok") lista.push(carboCard);
    if (aguaCard)  lista.push(aguaCard);

    // card de dia impecável: todos ouro ou ok
    const temProblema = lista.some(c => c.tipo === "alerta" || c.tipo === "aviso");
    if (!temProblema) {
      lista.push({
        emoji: "🏆",
        titulo: "Dia impecável",
        msg: "Tudo dentro dos limites. Isso é disciplina real.",
        tipo: "destaque",
      });
    }

    setCards(lista);
  }, [dados]);

  return (
    <div className="metasContainer">

      <button
        className="btnVoltar"
        style={{ display: isDesktop() ? "none" : "flex" }}
        onClick={() => (onClose ? onClose() : navigate("/home"))}
      >
        ← Voltar
      </button>

      <h2 className="metasTitulo">Seu dia</h2>

      {/* ── barras de progresso ── */}
      <div className="metasBarras">
        <Barra
          titulo="Calorias"
          valor={dados.kcal}
          meta={dados.metaKcal}
          unidade="kcal"
          cor={getCorBarra(dados.kcal, dados.metaKcal, "kcal")}
          percent={getPercent(dados.kcal, dados.metaKcal)}
        />
        <Barra
          titulo="Proteína"
          valor={dados.proteina}
          meta={dados.metaProteina}
          unidade="g"
          cor={getCorBarra(dados.proteina, dados.metaProteina, "proteina")}
          percent={getPercent(dados.proteina, dados.metaProteina)}
        />
        <Barra
          titulo="Carboidrato"
          valor={dados.carbo}
          meta={dados.metaCarbo}
          unidade="g"
          cor={getCorBarra(dados.carbo, dados.metaCarbo, "carbo")}
          percent={getPercent(dados.carbo, dados.metaCarbo)}
        />
        <Barra
          titulo="Água"
          valor={(dados.agua / 1000).toFixed(1)}
          meta={(dados.metaAgua / 1000).toFixed(1)}
          unidade="L"
          cor={getCorBarra(dados.agua, dados.metaAgua, "agua")}
          percent={getPercent(dados.agua, dados.metaAgua)}
        />
      </div>

      {/* ── cards de feedback ── */}
      <div className="metasFeedbackTitulo">Diagnóstico do dia</div>

      <div className="metasCards">
        {cards.map((card, i) => (
          <div key={i} className={`feedbackCard tipo-${card.tipo}`}>
            <span className="feedbackEmoji">{card.emoji}</span>
            <div className="feedbackTexto">
              <p className="feedbackTitulo">{card.titulo}</p>
              <p className="feedbackMsg">{card.msg}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  BARRA
// ─────────────────────────────────────────────────────────────────────────────
function Barra({ titulo, valor, meta, percent, cor, unidade }) {
  return (
    <div className="barraItem">
      <div className="barraTopo">
        <span className="barraTitulo">{titulo}</span>
        <span className="barraValores">
          <span className={`barraAtual cor-${cor}`}>{valor}{unidade}</span>
          <span className="barraSep"> / </span>
          <span className="barraMeta">{meta}{unidade}</span>
        </span>
      </div>
      <div className="barraFundo">
        <div
          className={`barraProgresso cor-${cor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="barraPercent">{Math.round(percent)}%</div>
    </div>
  );
}

export default Metas;