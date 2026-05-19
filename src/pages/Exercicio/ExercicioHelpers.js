// ─────────────────────────────────────────────────────────────────────────────
//  exercicioHelpers.js
//  Constantes, cálculos MET e frases motivacionais para o componente Exercicio
// ─────────────────────────────────────────────────────────────────────────────

// MET values (Metabolic Equivalent of Task) — valores padrão por exercício
// Fórmula: kcal = MET × peso_kg × duração_h
const MET = {
  corrida:      9.8,
  caminhada:    3.5,
  bicicleta:    7.5,
  natacao:      7.0,
  musculacao:   5.0,
  escada:       8.0,
  danca:        5.5,
  futebol:      7.0,
  pular_corda:  11.0,
};

// Velocidade média assumida para calcular duração a partir de distância (km/h)
const VELOCIDADE_MEDIA = {
  corrida:    10,
  caminhada:  5,
  bicicleta:  20,
};

// Passos → km
const PASSOS_POR_KM = 1300;

export const EXERCICIOS = [
  { id: "corrida",     label: "Corrida",      emoji: "🏃", inputType: "km",     inputLabel: "Quantos km você correu?",         hint: "2 km já geram um gasto relevante." },
  { id: "caminhada",   label: "Caminhada",    emoji: "🚶", inputType: "passos", inputLabel: "Quantos passos você deu?",        hint: "10.000 passos ≈ 7 km." },
  { id: "bicicleta",   label: "Bicicleta",    emoji: "🚴", inputType: "km",     inputLabel: "Quantos km você pedalou?",        hint: "Ciclismo tem ótimo custo-benefício calórico." },
  { id: "natacao",     label: "Natação",      emoji: "🏊", inputType: "min",    inputLabel: "Quantos minutos você nadou?",     hint: "30 min de natação queimam bem mais que corrida." },
  { id: "musculacao",  label: "Musculação",   emoji: "🏋️", inputType: "min",    inputLabel: "Quantos minutos você treinou?",   hint: "Inclui aquecimento e descanso entre séries." },
  { id: "escada",      label: "Escada",       emoji: "🪜", inputType: "andares", inputLabel: "Quantos andares você subiu?",    hint: "Cada andar ≈ 10 degraus." },
  { id: "danca",       label: "Dança",        emoji: "💃", inputType: "min",    inputLabel: "Quantos minutos você dançou?",    hint: "Dança intensa queima tanto quanto a natação." },
  { id: "futebol",     label: "Futebol",      emoji: "⚽", inputType: "min",    inputLabel: "Quantos minutos você jogou?",     hint: "Futebol é um dos melhores cardios intermitentes." },
  { id: "pular_corda", label: "Pular Corda",  emoji: "🪢", inputType: "min",    inputLabel: "Quantos minutos você pulou?",     hint: "10 min de corda = 8 min de corrida intensa." },
];

// ─────────────────────────────────────────────────────────────────────────────
//  CÁLCULO DE KCAL QUEIMADAS
//  Parâmetros: exercicio (id), valor (número), perfil { peso, altura, sexo, idade }
//  Retorna: { kcal, duracaoMin, met }
// ─────────────────────────────────────────────────────────────────────────────
export const calcularKcal = (exercicioId, valor, perfil) => {
  if (!valor || valor <= 0 || !perfil?.peso) return { kcal: 0, duracaoMin: 0 };

  const { peso } = perfil;
  const met = MET[exercicioId] ?? 5.0;
  const ex  = EXERCICIOS.find((e) => e.id === exercicioId);

  let duracaoMin = 0;

  switch (ex?.inputType) {
    case "km": {
      const vel = VELOCIDADE_MEDIA[exercicioId] ?? 10;
      duracaoMin = (valor / vel) * 60;
      break;
    }
    case "passos": {
      const km = valor / PASSOS_POR_KM;
      const vel = VELOCIDADE_MEDIA.caminhada;
      duracaoMin = (km / vel) * 60;
      break;
    }
    case "min":
      duracaoMin = valor;
      break;
    case "andares":
      duracaoMin = valor * 1.2; // ~1.2 min por andar
      break;
    default:
      duracaoMin = valor;
  }

  const duracaoH = duracaoMin / 60;
  const kcal     = Math.round(met * peso * duracaoH);

  return { kcal, duracaoMin: Math.round(duracaoMin), met };
};

// ─────────────────────────────────────────────────────────────────────────────
//  MENSAGEM MOTIVACIONAL baseada no gasto
// ─────────────────────────────────────────────────────────────────────────────
export const getMensagem = (kcal) => {
  if (kcal <= 0)   return { texto: "Informe a atividade para calcular.", nivel: "neutro" };
  if (kcal < 100)  return { texto: "Bom começo. Movimentar o corpo todos os dias faz diferença.", nivel: "ok" };
  if (kcal < 200)  return { texto: "Consistência vence intensidade. Continue assim.", nivel: "ok" };
  if (kcal < 350)  return { texto: "Ótimo gasto calórico! Esse nível já contribui com déficit real.", nivel: "bom" };
  if (kcal < 500)  return { texto: "Excelente treino. Seu metabolismo vai te agradecer.", nivel: "bom" };
  return            { texto: "Treino intenso! Reponha bem os nutrientes.", nivel: "alto" };
};

// ─────────────────────────────────────────────────────────────────────────────
//  FRASES EDUCATIVAS fixas exibidas no componente
// ─────────────────────────────────────────────────────────────────────────────
export const FRASES_EDUCATIVAS = [
  "Mesmo caminhadas leves ajudam no déficit calórico.",
  "Consistência vence intensidade. Treine com frequência.",
  "Seu corpo responde melhor à frequência do que a exageros pontuais.",
  "Cardio em jejum tem benefícios, mas o total diário é o que mais importa.",
  "O gasto calórico real depende do seu peso, ritmo e intensidade.",
  "Déficit calórico = gastar mais do que come. O cardio ajuda nisso.",
];

// ─────────────────────────────────────────────────────────────────────────────
//  GAMIFICAÇÃO — consistência (não quantidade)
//  Recebe array de registros com campo created_at
// ─────────────────────────────────────────────────────────────────────────────
export const calcularConsistencia = (registros) => {
  if (!registros?.length) return { diasConsecutivos: 0, treinouHoje: false, semanaAtiva: false };

  const hoje     = new Date();
  const hojeStr  = hoje.toISOString().split("T")[0];
  const diasUnicos = [...new Set(
    registros.map((r) => new Date(r.created_at).toISOString().split("T")[0])
  )].sort((a, b) => b.localeCompare(a));

  const treinouHoje = diasUnicos[0] === hojeStr;

  let diasConsecutivos = treinouHoje ? 1 : 0;
  for (let i = 1; i < diasUnicos.length; i++) {
    const anterior = new Date(diasUnicos[i - 1]);
    const atual    = new Date(diasUnicos[i]);
    const diff     = (anterior - atual) / (1000 * 60 * 60 * 24);
    if (diff === 1) diasConsecutivos++;
    else break;
  }

  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay());
  const semanaAtiva = diasUnicos.some((d) => new Date(d) >= inicioSemana);

  return { diasConsecutivos, treinouHoje, semanaAtiva };
};

export const formatarData = (isoString) => {
  const d = new Date(isoString);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};