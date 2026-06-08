// ─────────────────────────────────────────────────────────────────────────────
//  GraficoKcal.jsx
//
//  Responsabilidade: exibir o histórico calórico dos últimos 14 dias com
//  uma linha tracejada fixa indicando a meta diária do usuário.
//
//  Dados: buscados do Supabase (tabela historico_dias), ordenados por data.
//  Biblioteca: Recharts (já disponível, sem instalação extra).
// ─────────────────────────────────────────────────────────────────────────────

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
} from "recharts";
import { supabase } from "../../services/supabaseClient";
import "./GraficoKcal.css";
import { SupabaseClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
//  Tooltip customizado
// ─────────────────────────────────────────────────────────────────────────────


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
  const TooltipCustom = ({ active, payload, label, meta }) => {
    if (!active || !payload || !payload.length) return null;

    const ponto = payload[0]?.payload || {};
    const kcalLiquida = Number(ponto.kcal || 0);
    const kcalConsumida = Number(ponto.kcalConsumida || kcalLiquida);
    const queimadas = Number(ponto.kcalQueimadas || 0);
    const diferenca = Math.abs(kcalLiquida - meta);
    const acimaDaMeta = kcalLiquida > meta;

    return (
      <div className="graficoTooltip">
        <p className="graficoTooltipData">{label}</p>
        <p className="graficoTooltipKcal">{kcalLiquida} kcal consumidas</p>

        {queimadas > 0 && (
          <p className="graficoTooltipQueimadas">
            <span>🔥</span>
            {queimadas} kcal queimadas em exercícios
          </p>
        )}

        {queimadas > 0 && (
          <p className="graficoTooltipOriginal">
            {kcalConsumida} kcal antes dos exercícios
          </p>
        )}

        <p
          className="graficoTooltipDiff"
          style={{ color: acimaDaMeta ? "#f87171" : "#4ade80" }}
        >
          {acimaDaMeta
            ? `Superávit ${diferenca} calorias`
            : `Déficit ${diferenca} calorias`}
        </p>
      </div>
    );
  };

// ─────────────────────────────────────────────────────────────────────────────
//  Componente principal
// ─────────────────────────────────────────────────────────────────────────────
function GraficoKcal({ user }) {
  const [kcalQueimadas, setKcalQueimadas] = useState(0);
  const [totalQueimadas, settotalQueimadas] = useState(0);
  const [dados,     setDados]     = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [meta, setMeta] = useState(null);
  const metaGrafico = Number(meta || 0);

  useEffect(() => {
    if (!user?.id) return;

    const buscarMeta = async () => {
      const { data, error } = await supabase
        .from("registros")
        .select("manutencao_kcal")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("Erro ao buscar meta calórica:", error.message);
        return;
      }

      if (data?.manutencao_kcal) {
        setMeta(Number(data.manutencao_kcal));
      }
    };

    buscarMeta();
  }, [user]);

  // Busca os últimos 14 dias do Supabase
 useEffect(() => {
  if (!user?.id) return;

  const buscarHistorico = async () => {
    setCarregando(true);

    const { data: refeicoesData, error: refeicoesError } = await supabase
      .from("refeicoes")
      .select("datad, kcal_total")
      .eq("user_id", user.id)
      .order("datad", { ascending: true });

    if (refeicoesError) {
      console.warn("Erro ao buscar refeições:", refeicoesError.message);
      setCarregando(false);
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

    (refeicoesData || []).forEach((r) => {
      if (!r.datad) return;

      if (!porDia[r.datad]) porDia[r.datad] = 0;

      porDia[r.datad] += Number(r.kcal_total || 0);
    });

    const queimadasPorDia = {};

    (exerciciosData || []).forEach((r) => {
      const dataBR = createdAtParaDataBR(r.created_at);

      if (!dataBR) return;

      if (!queimadasPorDia[dataBR]) queimadasPorDia[dataBR] = 0;

      queimadasPorDia[dataBR] += Number(r.kcal_final || 0);
    });

    const formatado = Object.entries(porDia)
      .sort(([dataA], [dataB]) => dataBRParaTimestamp(dataA) - dataBRParaTimestamp(dataB))
      .slice(-31)
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
        };
      });

    setDados(formatado);
    setCarregando(false);
  };

  buscarHistorico();
}, [user]);

  // ── Render guard ──────────────────────────────────────────────────────────
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

  const temKcalQueimadas = dados.some((d) => Number(d.kcalQueimadas || 0) > 0);

  // Domínio do eixo Y: um pouco abaixo do mínimo e acima do máximo
  const valores  = dados.map((d) => d.kcal);
  const minValor = Math.min(...valores, metaGrafico);
  const maxValor = Math.max(...valores, metaGrafico);
  const padding  = Math.round((maxValor - minValor) * 0.2) || 200;
  const dominio  = [
    Math.max(0, minValor - padding),
    maxValor + padding,
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="graficoWrapper">

      <div className="graficoTopo">
        <p className="graficoTitulo">Histórico calórico</p>
        <div className="graficoLegenda">
          <span className="graficoLegendaPonto amarelo" />
          <span className="graficoLegendaTexto">Kcal consumida</span>
          <span className="graficoLegendaPonto tracejado" />
          <span className="graficoLegendaTexto">Taxa Manutenção kcal ({metaGrafico} kcal)</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart
          data={dados}
          margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
        >
          {/* Grade de fundo sutil */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1a2640"
            vertical={false}
          />

          {/* Eixo X — datas */}
          <XAxis
            dataKey="label"
            tick={{ fill: "#334155", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />

          {/* Eixo Y — kcal */}
          <YAxis
            domain={dominio}
            tick={{ fill: "#334155", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
          />

          {/* Tooltip */}
          <Tooltip
            content={<TooltipCustom meta={metaGrafico}/>}
            cursor={{ stroke: "#1e2d47", strokeWidth: 1 }}
          />

          {/* Linha de meta tracejada */}
          <ReferenceLine
            y={metaGrafico}
            stroke="#facc15"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={false}
          />

          {/* Linha de kcal real */}
          <Line
            type="monotone"
            dataKey="kcal"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{
              r: 4,
              fill: "#3b82f6",
              stroke: "#080e1a",
              strokeWidth: 2,
            }}
            activeDot={{
              r: 6,
              fill: "#60a5fa",
              stroke: "#080e1a",
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>

    </div>
  );
}

export default GraficoKcal;