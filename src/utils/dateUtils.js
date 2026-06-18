export function calcularDiasDesde(data) {
  if (!data) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataTreino = new Date(data);
  dataTreino.setHours(0, 0, 0, 0);
  const diff = hoje.getTime() - dataTreino.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function formatarStatusTreino(dias) {
  if (dias === null || dias === undefined) return { texto: "Nunca treinou", classe: "nunca" };
  if (dias === 0) return { texto: "Treinou hoje", classe: "hoje" };
  if (dias === 1) return { texto: "Treinou h\u00e1 1 dia", classe: "recente" };
  if (dias <= 3) return { texto: `Treinou h\u00e1 ${dias} dias`, classe: "recente" };
  if (dias <= 7) return { texto: `Treinou h\u00e1 ${dias} dias`, classe: "medio" };
  return { texto: `Treinou h\u00e1 ${dias} dias`, classe: "atrasado" };
}

export function calcularVolume(musculos) {
  if (!musculos || musculos.length === 0) return 0;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const seteDiasAtras = new Date(hoje);
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

  let treinadosRecente = 0;
  musculos.forEach((m) => {
    if (m.lastWorkoutDate) {
      const data = new Date(m.lastWorkoutDate);
      data.setHours(0, 0, 0, 0);
      if (data >= seteDiasAtras) treinadosRecente++;
    }
  });

  return Math.round((treinadosRecente / musculos.length) * 100);
}
