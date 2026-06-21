import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { supabase } from "../../services/supabaseClient";
import "./GraficoKcal.css";
import loadingImg from "../../assets/loading.png";

const OPCOES_PERIODO = [7, 14, 21, 31, 60];

const formatarNumeroBR = (valor) =>
  Math.round(Number(valor || 0)).toLocaleString("pt-BR");

const dataHojeBR = () => {
  const data = new Date();
  const dd = String(data.getDate()).padStart(2, "0");
  const mm = String(data.getMonth() + 1).padStart(2, "0");
  const yyyy = data.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const dataBRParaTimestamp = (dataBR) => {
  if (!dataBR) return 0;
  const [dd, mm, yyyy] = dataBR.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd).getTime();
};

const createdAtParaDataBR = (createdAt) => {
  if (!createdAt) return "";
  const data = new Date(createdAt);
  const dd = String(data.getDate()).padStart(2, "0");
  const mm = String(data.getMonth() + 1).padStart(2, "0");
  const yyyy = data.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const TooltipCustom = ({ active, payload, label, meta, tipoGrafico }) => {
  if (!active || !payload || !payload.length) return null;

  const ponto = payload[0]?.payload || {};
  const graficoEhProteina = tipoGrafico === "proteina";
  const valor = graficoEhProteina ? Number(ponto.proteina || 0) : Number(ponto.kcal || 0);
  const kcalConsumida = Number(ponto.kcalConsumida || ponto.kcal || 0);
  const queimadas = Number(ponto.kcalQueimadas || 0);
  const diferenca = Math.abs(valor - meta);
  const acimaDaMeta = valor > meta;

  return (
    <div className="graficoTooltip">
      <p className="graficoTooltipData">{label}</p>
      <p className="graficoTooltipKcal">
        {graficoEhProteina
          ? `${formatarNumeroBR(valor)}g`
          : `${formatarNumeroBR(valor)} kcal consumidas`}
      </p>
      {!graficoEhProteina && queimadas > 0 && (
        <p className="graficoTooltipQueimadas">
          <span>🔥</span>
          {queimadas} kcal queimadas em exercícios
        </p>
      )}
      {!graficoEhProteina && queimadas > 0 && (
        <p className="graficoTooltipOriginal">
          {kcalConsumida} kcal antes dos exercícios
        </p>
      )}
      {!graficoEhProteina && (
        <p
          className="graficoTooltipDiff"
          style={{ color: acimaDaMeta ? "#7eaefc" : "#3c83f6" }}
        >
          {acimaDaMeta
            ? `Superávit ${diferenca} calorias`
            : `Déficit ${diferenca} calorias`}
        </p>
      )}
    </div>
  );
};

function GraficoKcal({ user }) {
  const [carregandoPeriodo, setCarregandoPeriodo] = useState(false);
  const [periodoDias, setPeriodoDias] = useState(31);
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [metaKcal, setMetaKcal] = useState(null);
  const [metaProteina, setMetaProteina] = useState(null);
  const [tipoGrafico, setTipoGrafico] = useState("kcal");
  const [mostrarZonas, setMostrarZonas] = useState(false);

  const metaGrafico = Number(tipoGrafico === "kcal" ? metaKcal || 0 : metaProteina || 0);
  const graficoEhProteina = tipoGrafico === "proteina";

  useEffect(() => {
    if (!user?.id) return;

    const buscarMeta = async () => {
      const { data, error } = await supabase
        .from("registros")
        .select("manutencao_kcal, metaproteina")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("Erro ao buscar metas:", error.message);
        return;
      }

      if (data?.manutencao_kcal) {
        setMetaKcal(Number(data.manutencao_kcal));
      }
      if (data?.metaproteina) {
        setMetaProteina(Number(data.metaproteina));
      }
    };

    buscarMeta();
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;

    const buscarHistorico = async () => {
      if (!carregandoPeriodo) {
        setCarregando(true);
      }

      const { data: refeicoesData, error: refeicoesError } = await supabase
        .from("refeicoes")
        .select("datad, kcal_total, prot_total")
        .eq("user_id", user.id)
        .order("datad", { ascending: true });

      if (refeicoesError) {
        console.warn("Erro ao buscar refeições:", refeicoesError.message);
        setCarregando(false);
        setCarregandoPeriodo(false);
        return;
      }

      const { data: exerciciosData, error: exerciciosError } = await supabase
        .from("gasto_calorico")
        .select("created_at, kcal_final")
        .eq("user_id", user.id);

      if (exerciciosError) {
        console.warn("Erro ao buscar kcal queimadas:", exerciciosError.message);
      }

      const porDia = {};
      const proteinaPorDia = {};

      (refeicoesData || []).forEach((r) => {
        if (!r.datad) return;

        if (!porDia[r.datad]) porDia[r.datad] = 0;
        if (!proteinaPorDia[r.datad]) proteinaPorDia[r.datad] = 0;

        porDia[r.datad] += Number(r.kcal_total || 0);
        proteinaPorDia[r.datad] += Number(r.prot_total || 0);
      });

      const queimadasPorDia = {};

      (exerciciosData || []).forEach((r) => {
        const dataBR = createdAtParaDataBR(r.created_at);
        if (!dataBR) return;

        if (!queimadasPorDia[dataBR]) queimadasPorDia[dataBR] = 0;
        queimadasPorDia[dataBR] += Number(r.kcal_final || 0);
      });

      const hojeTimestamp = dataBRParaTimestamp(dataHojeBR());

      const formatado = Object.entries(porDia)
        .sort(([dataA], [dataB]) => dataBRParaTimestamp(dataA) - dataBRParaTimestamp(dataB))
        .filter(([datad]) => dataBRParaTimestamp(datad) < hojeTimestamp)
        .slice(-periodoDias)
        .map(([datad, kcal]) => {
          const partes = datad.split("/");
          const kcalQueimadas = queimadasPorDia[datad] || 0;
          const kcalLiquida = Math.max(0, kcal - kcalQueimadas);
          return {
            dataCompleta: datad,
            label: `${partes[0]}/${partes[1]}`,
            kcal: kcalLiquida,
            kcalConsumida: kcal,
            kcalQueimadas,
            proteina: proteinaPorDia[datad] || 0,
          };
        });

      setDados(formatado);
      setCarregando(false);
      setCarregandoPeriodo(false);
    };

    buscarHistorico();
  }, [user, periodoDias]);

  if (carregando) {
    return (
      <div className="graficoWrapper">
        <p className="graficoVazio">Carregando histórico...</p>
      </div>
    );
  }

  if (dados.length === 0) {
    return (
      <div className="graficoWrapper">
        <p className="graficoVazio">
          Nenhum dia salvo ainda. Comece a registrar suas refeições!
        </p>
      </div>
    );
  }

  const valores = dados.map((d) => Number(graficoEhProteina ? d.proteina : d.kcal) || 0);
  const totalKcalPeriodo = dados.reduce((acc, d) => acc + Number(d.kcal || 0), 0);
  const totalProteinaPeriodo = dados.reduce((acc, d) => acc + Number(d.proteina || 0), 0);

  const metaKcalPeriodo = metaKcal * dados.length;
  const saldoKcalPeriodo = Math.round(totalKcalPeriodo - metaKcalPeriodo);
  const saldoKcalAbsoluto = Math.abs(saldoKcalPeriodo);

  const resultadoEhSuperavit = saldoKcalPeriodo > 0;
  const mediaProteinaPeriodo = dados.length > 0 ? totalProteinaPeriodo / dados.length : 0;

  const minValor = Math.min(...valores, metaGrafico);
  const maxValor = Math.max(...valores, metaGrafico);
  const padding = Math.round((maxValor - minValor) * 0.2) || 200;
  const dominio = [
    Math.max(0, minValor - padding),
    mostrarZonas ? Math.max(maxValor + padding, metaGrafico * 1.25) : maxValor + padding,
  ];

  return (
    <div className="graficoWrapper">
      <div className="graficoTopo">
        <div className="graficoTituloLinha">
          <p className="graficoTitulo">
            {graficoEhProteina ? "Histórico de Proteína" : "Histórico calórico"}
          </p>
          {graficoEhProteina ? (
            <span className="graficoResultadoTitulo proteina">
              Média de Proteína: {formatarNumeroBR(mediaProteinaPeriodo)}g/dia
            </span>
          ) : (
            <span
              className={`graficoResultadoTitulo kcal ${
                resultadoEhSuperavit ? "superavit" : "deficit"
              }`}
            >
              {resultadoEhSuperavit ? "+" : "-"}
              {formatarNumeroBR(saldoKcalAbsoluto)}Kcal{" "}
              {resultadoEhSuperavit ? "Superávit" : "Déficit"}
            </span>
          )}
        </div>
        <div className="graficoLegenda">
          <span className={`graficoLegendaPonto ${graficoEhProteina ? "verde" : "amarelo"}`} />
          <span className="graficoLegendaTexto">
            {graficoEhProteina ? "Proteína" : "Calorias"}
          </span>
          <span className="graficoLegendaPonto tracejado" />
          <span className="graficoLegendaTexto">
            {graficoEhProteina
              ? `Taxa proteína (${metaGrafico}g)`
              : `Taxa Manutenção(${metaGrafico} kcal)`}
          </span>
        </div>
      </div>

      <div className="graficoChartArea">
        {carregandoPeriodo && (
          <div className="graficoLoadingPeriodo">
            <img src={loadingImg} alt="Carregando" className="loadingConexaoImg" />
          </div>
        )}
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={dados}
            margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2640" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#334155", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={dominio}
              tick={{ fill: "#334155", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              content={<TooltipCustom meta={metaGrafico} tipoGrafico={tipoGrafico} />}
              cursor={{ stroke: "#1e2d47", strokeWidth: 1 }}
            />
            <ReferenceLine
              y={metaGrafico}
              stroke="#506b95"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={false}
            />
            {metaGrafico > 0 && mostrarZonas && (
              <>
                {graficoEhProteina ? (
                  <>
                    <ReferenceArea y1={dominio[0]} y2={metaGrafico * 0.80} fill="#ffffff" fillOpacity={0.30} stroke="none" />
                    <ReferenceArea y1={metaGrafico * 0.80} y2={metaGrafico * 0.90} fill="#fffb00" fillOpacity={0.70} stroke="none" />
                    <ReferenceArea y1={metaGrafico * 0.90} y2={metaGrafico} fill="#48ff00" fillOpacity={0.79} stroke="none" />
                    <ReferenceArea y1={metaGrafico} y2={metaGrafico * 1.10} fill="#bfff00" fillOpacity={0.70} stroke="none" />
                    <ReferenceArea y1={metaGrafico * 1.10} y2={dominio[1]} fill="#ffffff" fillOpacity={0.30} stroke="none" />
                  </>
                ) : (
                  <>
                    <ReferenceArea y1={dominio[0]} y2={metaGrafico * 0.75} fill="#ffffff" fillOpacity={0.30} stroke="none" />
                    <ReferenceArea y1={metaGrafico * 0.75} y2={metaGrafico * 0.85} fill="#fffb00" fillOpacity={0.70} stroke="none" />
                    <ReferenceArea y1={metaGrafico * 0.85} y2={metaGrafico * 0.92} fill="#48ff00" fillOpacity={0.79} stroke="none" />
                    <ReferenceArea y1={metaGrafico * 0.92} y2={metaGrafico} fill="#fffb00" fillOpacity={0.70} stroke="none" />
                    <ReferenceArea y1={metaGrafico} y2={metaGrafico * 1.20} fill="#ffffff" fillOpacity={0.30} stroke="none" />
                    <ReferenceArea y1={metaGrafico * 1.20} y2={dominio[1]} fill="#ffffff" fillOpacity={0.30} stroke="none" />
                  </>
                )}
              </>
            )}
            <Line
              type="monotone"
              dataKey={graficoEhProteina ? "proteina" : "kcal"}
              stroke={graficoEhProteina ? "#7eaefc" : "#3b82f6"}
              strokeWidth={2}
              dot={{
                r: 4,
                fill: graficoEhProteina ? "#7eaefc" : "#3b82f6",
                stroke: "#080e1a",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: graficoEhProteina ? "#a9c9fd" : "#7eaefc",
                stroke: "#080e1a",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="graficoPeriodo">
        <span className="graficoPeriodoLabel"></span>
        <div className="graficoPeriodoOpcoes">
          {OPCOES_PERIODO.map((dias) => (
            <button
              key={dias}
              type="button"
              className={`graficoPeriodoBotao ${periodoDias === dias ? "ativo" : ""}`}
              onClick={() => {
                if (periodoDias === dias) return;
                setCarregandoPeriodo(true);
                setPeriodoDias(dias);
              }}
            >
              {dias}d
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`graficoPeriodoBotao colorir ${mostrarZonas ? "ativo" : ""}`}
          onClick={() => setMostrarZonas((prev) => !prev)}
        >
          {mostrarZonas ? "✓ Zonas" : "Colorir"}
        </button>
      </div>

      <div className="graficoTipoSwitch">
        <button
          type="button"
          className={`graficoTipoBotao ${tipoGrafico === "kcal" ? "ativo" : ""}`}
          onClick={() => setTipoGrafico("kcal")}
        >
          Calorias
        </button>
        <button
          type="button"
          className={`graficoTipoBotao ${tipoGrafico === "proteina" ? "ativo proteina" : ""}`}
          onClick={() => setTipoGrafico("proteina")}
        >
          Proteínas
        </button>
        </div>
      </div>
  );
}

export default GraficoKcal;
