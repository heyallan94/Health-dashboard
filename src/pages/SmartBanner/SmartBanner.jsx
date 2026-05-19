import "./SmartBanner.css"
import React, { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  BANCO DE MENSAGENS
// ─────────────────────────────────────────────────────────────────────────────
const MSGS = {

  // ── CALORIAS ────────────────────────────────────────────────────────────────
  kcal_critico: { cor: "vermelho", emoji: "🚨", msgs: [
    "Calorias críticas. Menos de 15% da meta — isso derruba o metabolismo.",
    "Você quase não comeu hoje. Déficit assim não é cutting, é descuido.",
    "Seu corpo está pedindo socorro calórico. Coma alguma coisa agora.",
    "Com esse déficit você perde músculo, força e foco. Não compensa.",
    "Menos de 15% da meta calórica. Isso é severo demais.",
    "Metabolismo em queda livre com esse nível de ingestão.",
    "Risco metabólico real. Seu corpo vai cobrar essa conta.",
    "Abaixo de 15% das calorias. O treino de amanhã vai sofrer.",
    "Energia no chão. Comer é parte do protocolo, não é fraqueza.",
    "Com esse nível calórico, até raciocinar fica difícil.",
  ]},

  kcal_baixo: { cor: "vermelho", emoji: "⚠️", msgs: [
    "Calorias muito baixas. Seu corpo vai buscar energia nos músculos.",
    "Menos de 30% da meta calórica. Adicione pelo menos mais uma refeição.",
    "Déficit severo. Com esse nível, disposição e concentração caem.",
    "Cortar calorias demais não acelera resultado — sabota.",
    "Falta combustível. Seu tanque está quase vazio.",
    "Comer pouco em excesso faz o metabolismo travar. Cuidado.",
    "Proteína vai ser usada como energia se não houver calorias suficientes.",
    "Menos de 30% consumido. Uma refeição completa muda o jogo.",
    "Seu corpo está em modo de sobrevivência com esse déficit.",
    "Déficit calórico excessivo: você perde gordura E músculo. Péssimo trade.",
  ]},

  kcal_abaixo: { cor: "azul", emoji: "📉", msgs: [
    "Calorias abaixo do ideal. Ainda dá tempo de equilibrar hoje.",
    "Você está na metade do caminho calórico. Uma refeição resolve.",
    "Faltou energia hoje. Não precisa exagerar, mas coma mais.",
    "Déficit existe, mas é controlável. Corrija nas próximas refeições.",
    "Dia incompleto caloricamento. Uma refeição caprichada resolve.",
    "Abaixo da meta, mas sem pânico. Feche o dia com mais qualidade.",
    "Conta calórica não fechou ainda. Ainda há margem para corrigir.",
    "Um snack proteico já ajuda a fechar esse gap calórico.",
    "Energia abaixo do esperado. Considere uma refeição extra.",
    "50% da meta consumida. Feche o dia com inteligência.",
  ]},

  kcal_ideal: { cor: "dourado", emoji: "🎯", msgs: [
    "Calorias na zona perfeita. É aqui que os resultados acontecem.",
    "Nem muito, nem pouco. Exatamente onde você precisa estar.",
    "Equilíbrio calórico impecável. Seu metabolismo agradece.",
    "Zona dourada de calorias. Continue assim até o final do dia.",
    "Isso é inteligência nutricional. Calorias calibradas no ponto.",
    "Ótimo controle calórico. Essa faixa é onde o corpo funciona melhor.",
    "Perfeito. Energia suficiente sem excessos.",
    "Zona ideal atingida. Mantenha o ritmo e não complique.",
    "Calorias no sweet spot. Treino, recuperação e composição agradecem.",
    "Gestão calórica exemplar. Difícil de manter, fácil de admirar.",
  ]},

  kcal_alto: { cor: "azul", emoji: "👀", msgs: [
    "Calorias altas, mas ainda dentro. Cuidado com os extras.",
    "Mais de 70% consumido. Evite petiscos e snacks daqui pra frente.",
    "Margem calórica pequena. Avalie bem antes da próxima refeição.",
    "Perto do teto. Prefira proteína se ainda for comer.",
    "Tá chegando no limite calórico. Sem descuidos.",
    "Pouca margem sobrando. O próximo passo importa.",
    "Fique de olho. Um descuido e estoura.",
    "Se for comer mais, que seja proteína. Sem carboidrato agora.",
    "Dia quase cheio caloricamento. Água e consciência daqui pra frente.",
    "Quase no máximo. Avalie com cuidado a próxima refeição.",
  ]},

  kcal_limite: { cor: "vermelho", emoji: "🔴", msgs: [
    "Calorias no limite. Se puder, pare por aqui.",
    "Chegou na borda calórica. Uma última refeição leve, no máximo.",
    "Praticamente no teto. Priorize água e evite extras.",
    "Meta calórica quase cheia. Só coma se for necessidade real.",
    "Você está a um passo de estourar. Consciência total agora.",
    "Borda do limite. Daqui pra frente só proteína ou nada.",
    "Chegou no teto. Tudo que comer a mais vai como reserva.",
    "Meta quase fechada — mas do lado errado. Segure.",
    "Um descuido agora e o dia fecha no negativo. Cuidado.",
    "Quase no máximo calórico. Não teste a margem.",
  ]},

  kcal_estourou: { cor: "vermelho", emoji: "💥", msgs: [
    "Meta calórica estourada. Amanhã recomeça do zero — sem culpa.",
    "Passou da meta. Acontece. O importante é o próximo dia.",
    "Um dia acima não destrói o resultado, mas virar padrão vai.",
    "Estourou. Amanhã: mais água, mais proteína, menos extra.",
    "Todo mundo tem dias assim. O que importa é não repetir.",
    "Hoje foi além. Amanhã volta com foco e sem drama.",
    "Reset amanhã. Sem culpa, mas com intenção.",
    "Calorias acima. Não compense com jejum — só corrija o padrão.",
    "Dia difícil caloricamento. A consistência da semana é o que conta.",
    "Passou. O plano não quebrou — apenas teve um dia fora. Siga.",
  ]},

  // ── PROTEÍNA ──────────────────────────────────────────────────────────────
  prot_critico: { cor: "vermelho", emoji: "🚨", msgs: [
    "Proteína crítica. Quase zero — você está perdendo músculo agora.",
    "Com esse nível proteico, o corpo busca energia nos músculos.",
    "Frango, ovo, atum. Qualquer coisa. Coma proteína agora.",
    "Menos de 20% da meta proteica. Catabolismo em risco real.",
    "Seu treino não vai gerar resultado sem proteína suficiente.",
    "Músculo sem proteína é dinheiro jogado no treino.",
    "Déficit proteico severo. Isso compromete recuperação e composição.",
    "Emergência proteica. Prioridade máxima na próxima refeição.",
    "Sem proteína o corpo canibaliza o músculo para sobreviver.",
    "Zero proteína = zero resultado. Corrija isso urgente.",
  ]},

  prot_baixo: { cor: "vermelho", emoji: "🥩", msgs: [
    "Proteína muito baixa. Adicione uma fonte proteica agora.",
    "Menos de 40% da meta. Ainda dá tempo de recuperar o dia.",
    "Um peito de frango ou 3 ovos já fazem diferença. Não negligencie.",
    "Treino sem proteína é esforço pela metade.",
    "Você está abaixo de 40%. O corpo precisa de mais.",
    "Músculo sem combustível. Corrija isso antes de dormir.",
    "Déficit proteico significativo. Não deixe o dia fechar assim.",
    "Proteína insuficiente. Whey, frango, ovo — escolha um e coma.",
    "Abaixo de 40% da meta proteica. Isso tem consequência.",
    "Seu músculo está esperando por proteína. Não deixe ele esperando.",
  ]},

  prot_abaixo: { cor: "azul", emoji: "📊", msgs: [
    "Metade da meta proteica ainda não foi atingida.",
    "Proteína em progresso. Uma boa refeição muda o jogo.",
    "Tá vindo, mas precisa acelerar para fechar a meta.",
    "50% da meta proteica. Ainda dá pra fechar bem o dia.",
    "Está razoável, mas ainda longe. Continue com foco.",
    "Mais uma refeição proteica e você muda o panorama do dia.",
    "Progresso proteico ok, mas precisa ir mais longe.",
    "Proteína abaixo do ideal. Uma refeição resolve isso.",
    "Falta chegar lá na proteína. Não desanime, ainda dá.",
    "Você está no caminho, mas o destino ainda está longe. Siga.",
  ]},

  prot_bom: { cor: "verde", emoji: "👍", msgs: [
    "Proteína no caminho certo. Mais uma refeição e fecha a meta.",
    "Mais de 60% da meta proteica. Continue e não pare antes de fechar.",
    "Boa ingestão de proteína. Um snack proteico fecha o dia.",
    "Você está perto. Não deixe a proteína cair nos últimos lanchinhos.",
    "Está indo bem na proteína. Garanta mais uma fonte antes de dormir.",
    "Progresso proteico sólido. Finalize o dia com intenção.",
    "Proteína razoável. Um iogurte, um ovo, um shake — e fecha.",
    "60-80% da meta. Boa base, mas não relaxe agora.",
    "Tá quase lá. Um último esforço proteico e o dia fecha perfeito.",
    "Progresso real na proteína. Continue nesse ritmo.",
  ]},

  prot_otimo: { cor: "dourado", emoji: "🏅", msgs: [
    "Proteína excelente. Mais de 80% da meta. Músculo bem alimentado.",
    "Quase na meta proteica. Um passo e fecha perfeito.",
    "Esse nível de proteína já garante boa recuperação.",
    "Você está a menos de 20% de fechar a meta proteica.",
    "Um iogurte, um ovo ou uma fatia de carne fecha o dia.",
    "Proteína muito boa. Síntese muscular está acontecendo.",
    "Nível ouro de proteína. Seu treino vai ter retorno.",
    "Perto do topo proteico. Finalize com capricho.",
    "80-90% da meta. Isso é muito bom. Não deixe cair agora.",
    "Quase perfeito na proteína. Um snack e fecha o dia no topo.",
  ]},

  prot_perfeito: { cor: "dourado", emoji: "🏆", msgs: [
    "Meta proteica batida. Síntese muscular garantida. Dia impecável.",
    "Proteína perfeita. Você fez a parte mais importante da nutrição.",
    "Meta proteica atingida. Seu corpo vai usar bem cada grama disso.",
    "Poucas pessoas chegam aqui todo dia. Você chegou.",
    "100% da meta proteica. Recuperação garantida, músculo preservado.",
    "Com essa ingestão, seu treino de amanhã já tem suporte.",
    "Proteína impecável. Consistência assim tem resultado real.",
    "Meta fechada na proteína. Isso é o que separa amador de comprometido.",
    "Nível máximo proteico. Você está fazendo certo.",
    "Proteína no topo. Seu músculo está sorrindo agora.",
  ]},

  // ── CARBOIDRATO ───────────────────────────────────────────────────────────
  carbo_ok: { cor: "verde", emoji: "✅", msgs: [
    "Carboidrato dentro do esperado. Sem excessos.",
    "Carbo equilibrado hoje. Continue assim.",
    "Boa gestão de carboidratos. Nada a reclamar.",
    "Você está usando carboidratos de forma inteligente.",
    "Nada a reclamar nos carbos. Siga em frente.",
    "Carboidrato saudável hoje. Energia sem exagero.",
    "Carbo no controle. Bom trabalho.",
    "Dentro da faixa ideal de carboidratos.",
    "Sem excesso de carbo. Ótima escolha alimentar.",
    "Carbo administrado com inteligência hoje.",
  ]},

  carbo_alto: { cor: "azul", emoji: "🍚", msgs: [
    "Carboidrato subindo. Perto do teto — atenção nas próximas refeições.",
    "Pão, arroz, massa — tudo acumulou. Controle no resto do dia.",
    "Fique de olho no carbo. Mais um passo e estoura.",
    "Próximo do máximo de carboidratos. Prefira proteínas agora.",
    "Carboidratos altos. Equilibre com proteína e verduras.",
    "Quase no teto de carbo. Evite massas e pão daqui pra frente.",
    "Carbo acima do ideal. Um ajuste agora evita estourar.",
    "Perto do limite de carboidratos. Atenção.",
    "Carbo alto mas ainda controlável. Não force mais.",
    "Margem pequena no carbo. Seja seletivo nas próximas escolhas.",
  ]},

  carbo_estourou: { cor: "vermelho", emoji: "📈", msgs: [
    "Carboidrato estourado. Amanhã reduza pão, arroz e massas.",
    "Carbo em excesso vira estoque de gordura se não for queimado.",
    "Energia em excesso nos carboidratos. Compense com movimento.",
    "Passou no carbo. Amanhã priorize proteína e vegetais.",
    "Muito carbo hoje. Fique mais atento amanhã.",
    "Excesso de carboidrato. Cuidado com açúcar escondido também.",
    "Passou do limite nos carbos. Reequilibre amanhã.",
    "Carbo alto demais. Isso pesa no saldo calórico total.",
    "Carboidrato acima do limite. O próximo dia começa do zero.",
    "Excesso de carbo registrado. Amanhã compense com menos.",
  ]},

  // ── ÁGUA ──────────────────────────────────────────────────────────────────
  agua_critico: { cor: "vermelho", emoji: "🏜️", msgs: [
    "Hidratação crítica. Menos de 20% da meta — emergência.",
    "Você quase não bebeu água. Seu corpo está pedindo socorro.",
    "Pare o que está fazendo e beba água agora. Isso é urgente.",
    "Falta de água reduz concentração e aumenta fadiga. Beba agora.",
    "Com esse nível, qualquer esforço físico já é perigoso.",
    "Desidratação severa. Isso afeta tudo: foco, metabolismo, humor.",
    "Menos de 20% da meta de água. Prioridade máxima agora.",
    "Seu cérebro está desidratado. Beba 2 copos agora.",
    "Água urgente. Não espere sentir sede — já passou disso.",
    "Hidratação zero. Isso é o mais fácil de corrigir — faça isso agora.",
  ]},

  agua_baixo: { cor: "vermelho", emoji: "💧", msgs: [
    "Água muito baixa. Beba um copo agora, depois outro.",
    "Menos de 40% da meta hídrica. Faça disso uma prioridade.",
    "Seu metabolismo trabalha melhor hidratado. Encha o copo.",
    "Antes de culpar o cansaço, beba 2 copos e veja a diferença.",
    "Desidratação causa fadiga. Beba água antes de tudo.",
    "Hidratação insuficiente. Seu corpo está trabalhando no difícil.",
    "Menos de 40% de água. Comece agora e não pare.",
    "Falta de água é o erro mais fácil de corrigir. Corrija agora.",
    "Você está abaixo de 40% da meta de água. Isso importa.",
    "Hidratação baixa. Um copo agora, um daqui a pouco, outro depois.",
  ]},

  agua_abaixo: { cor: "azul", emoji: "🥤", msgs: [
    "Metade da meta de água. Ainda dá para fechar com esforço.",
    "50% de hidratação. A segunda metade começa agora.",
    "Água razoável, mas precisa acelerar. Um copo por hora resolve.",
    "Boa base de hidratação. Mas não relaxe, ainda tem caminho.",
    "Com mais água, tudo funciona melhor. Continue hidratando.",
    "Na metade do caminho hídrico. Não desacelere agora.",
    "Você está na metade. A segunda metade é a mais importante.",
    "Tá vindo bem na água. Mas não pare aqui.",
    "50% consumido. Feche o dia bem hidratado.",
    "Está no meio do percurso hídrico. Mantenha o ritmo.",
  ]},

  agua_bom: { cor: "verde", emoji: "🌊", msgs: [
    "Mais de 60% da meta de água. Continue e feche o dia hidratado.",
    "Você está no caminho certo com a água. Mais uns copos e fecha.",
    "Hidratação boa. Não deixe de terminar a meta antes de dormir.",
    "Perto dos 80% de água. Mais dois copos e você está bem.",
    "Boa hidratação. Finalize o dia bebendo mais um pouco.",
    "Progresso hídrico sólido. Continue assim.",
    "60-80% de água consumida. Está bem encaminhado.",
    "Boa ingestão de água. Pele, foco e metabolismo agradecem.",
    "Está indo bem na hidratação. Não deixe cair no final do dia.",
    "Mais de 60% de água. Esse ritmo fecha a meta.",
  ]},

  agua_otimo: { cor: "dourado", emoji: "💛", msgs: [
    "Hidratação excelente. Mais de 80% da meta. Seu corpo funciona bem.",
    "Quase completo na água. Mais um copo e fecha perfeito.",
    "Você está cuidando do básico que muita gente ignora.",
    "Pele, metabolismo, foco — tudo agradece essa hidratação.",
    "Quase na meta hídrica. Um copo antes de dormir e fecha o dia.",
    "Nível ouro de hidratação. Muito perto do topo.",
    "80-90% de água. Isso é disciplina hídrica real.",
    "Quase lá na água. Finalize com um copo e bate a meta.",
    "Hidratação muito boa. Seu corpo está funcionando no máximo.",
    "Perto da meta hídrica. Não deixe cair agora.",
  ]},

  agua_perfeito: { cor: "dourado", emoji: "🏆", msgs: [
    "Meta de água batida. Seu corpo está no melhor estado possível.",
    "Hidratação impecável. Você está cuidando do seu corpo de verdade.",
    "100% de hidratação. Metabolismo, pele e foco agradecem.",
    "Poucos chegam na meta hídrica todo dia. Você chegou.",
    "Meta de água fechada. Isso faz mais diferença do que parece.",
    "Completamente hidratado. Essa consistência tem impacto direto.",
    "Hidratação no topo. Impecável.",
    "100% de água consumida. Seu corpo está no seu melhor.",
    "Meta hídrica fechada com precisão. Excelente dia.",
    "Hidratação perfeita. Treino, recuperação e foco no máximo.",
  ]},

  // ── DIA COMPLETO ─────────────────────────────────────────────────────────
  dia_perfeito: { cor: "dourado", emoji: "🌟", msgs: [
    "Dia impecável. Calorias, proteína e água todos no ponto.",
    "Consistência assim tem resultado real. Dia perfeito.",
    "Você fez tudo certo hoje. Isso é o que separa resultado de promessa.",
    "Proteína, calorias e água — tudo alinhado. Dia lendário.",
    "Execução nutricional perfeita. Seu futuro eu agradece.",
    "Um dia assim por semana já faz diferença. Você fez hoje.",
    "Disciplina real é isso: fazer tudo certo quando ninguém está vendo.",
    "Dia nutricional no topo. Continue amanhã.",
    "Tudo verde. Calorias, proteína, água — impecável.",
    "Você não só treinou, como alimentou o resultado. Parabéns.",
  ]},
};

// ─────────────────────────────────────────────────────────────────────────────
//  LÓGICA DE AVALIAÇÃO
// ─────────────────────────────────────────────────────────────────────────────
function avaliar(kcal, metaKcal, prot, metaProt, agua, metaAgua) {
  const msgs = [];

  // Calorias
  if (metaKcal > 0) {
    const pct = (kcal / metaKcal) * 100;
    const cat =
      pct <= 15  ? "kcal_critico" :
      pct <= 30  ? "kcal_baixo"  :
      pct <= 50  ? "kcal_abaixo" :
      pct <= 70  ? "kcal_ideal"  :
      pct <= 85  ? "kcal_alto"   :
      pct <= 100 ? "kcal_limite" : "kcal_estourou";
    msgs.push(cat);
  }

  // Proteína
  if (metaProt > 0) {
    const pct = (prot / metaProt) * 100;
    const cat =
      pct <= 20 ? "prot_critico" :
      pct <= 40 ? "prot_baixo"   :
      pct <= 60 ? "prot_abaixo"  :
      pct <= 80 ? "prot_bom"     :
      pct <= 90 ? "prot_otimo"   : "prot_perfeito";
    msgs.push(cat);
  }

  // Água
  if (metaAgua > 0) {
    const pct = (agua / metaAgua) * 100;
    const cat =
      pct <= 20 ? "agua_critico" :
      pct <= 40 ? "agua_baixo"   :
      pct <= 60 ? "agua_abaixo"  :
      pct <= 80 ? "agua_bom"     :
      pct <= 90 ? "agua_otimo"   : "agua_perfeito";
    msgs.push(cat);
  }

  // Dia perfeito?
  const perfeito = msgs.every(c =>
    ["kcal_ideal", "prot_perfeito", "prot_otimo", "agua_perfeito", "agua_otimo"].includes(c)
  );
  if (perfeito) msgs.push("dia_perfeito");

  return msgs;
}

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ─────────────────────────────────────────────────────────────────────────────
//  COR → variáveis CSS
// ─────────────────────────────────────────────────────────────────────────────
const COR_MAP = {
  vermelho: { bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.35)",  text: "#f87171", glow: "rgba(239,68,68,0.15)"  },
  azul:     { bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.35)", text: "#60a5fa", glow: "rgba(59,130,246,0.15)" },
  verde:    { bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.35)", text: "#4ade80", glow: "rgba(74,222,128,0.15)" },
  dourado:  { bg: "rgba(250,204,21,0.10)", border: "rgba(250,204,21,0.35)", text: "#facc15", glow: "rgba(250,204,21,0.20)" },
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENTE
// ─────────────────────────────────────────────────────────────────────────────
export default function SmartBanner() {
  const [categorias, setCategorias] = useState([]);
  const [idx,        setIdx]        = useState(0);
  const [atual,      setAtual]      = useState(null);
  const [animando,   setAnimando]   = useState(false);

  // ── carrega dados do localStorage ────────────────────────────────────────
  useEffect(() => {
    const plano    = JSON.parse(localStorage.getItem("meuPlano")) || {};
    const kcal     = Number(localStorage.getItem("KcalDoDia"))     || 0;
    const prot     = Number(localStorage.getItem("ProteinaDoDia")) || 0;
    const agua     = Number(localStorage.getItem("aguaConsumida")) || 0;
    const metaKcal = plano.metaKcal  || plano.calorias    || 1800;
    const metaProt = plano.proteina  || plano.metaProteina || 150;
    const metaAgua = Number(localStorage.getItem("metaAgua")) || 2000;

    const cats = avaliar(kcal, metaKcal, prot, metaProt, agua, metaAgua);
    setCategorias(cats);
    setIdx(0);
  }, []);

  // ── sorteia mensagem quando idx ou categorias mudam ──────────────────────
  useEffect(() => {
    if (categorias.length === 0) return;
    const cat  = categorias[idx % categorias.length];
    const info = MSGS[cat];
    if (!info) return;
    setAtual({ ...info, texto: rand(info.msgs), cat });
  }, [idx, categorias]);

  // ── avança para próxima mensagem com animação ─────────────────────────────
  const avancar = useCallback(() => {
    if (animando) return;
    setAnimando(true);
    setTimeout(() => {
      setIdx(i => i + 1);
      setAnimando(false);
    }, 220);
  }, [animando]);

  // ── auto-avança a cada 8s ─────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(avancar, 8000);
    return () => clearInterval(t);
  }, [avancar]);

  if (!atual) return null;

  const cores = COR_MAP[atual.cor] || COR_MAP.azul;
  const total = categorias.length;
  const pos   = (idx % total) + 1;

  return (
    <div
      className={`smartBanner sb-${atual.cor} ${animando ? "sb-sair" : "sb-entrar"}`}
      style={{
        "--sb-bg":     cores.bg,
        "--sb-border": cores.border,
        "--sb-text":   cores.text,
        "--sb-glow":   cores.glow,
      }}
      onClick={avancar}
      title="Clique para ver a próxima dica"
    >
      <span className="sbEmoji">{atual.emoji}</span>

      <span className="sbTexto">{atual.texto}</span>

      <div className="sbDir">
        <span className="sbContador">{pos}/{total}</span>
        <span className="sbSeta">›</span>
      </div>
    </div>
  );
}