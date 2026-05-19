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
const TooltipCustom = ({ active, payload, label, meta }) => {
  if (!active || !payload || !payload.length) return null;

  const kcal   = payload[0]?.value;
  const diff   = kcal - meta;
  const cor    = diff > 0 ? "#f87171" : "#4ade80";
  const sinal  = diff > 0 ? "+" : "";

  return (
    <div className="graficoTooltip">
      <p className="graficoTooltipData">{label}</p>
      <p className="graficoTooltipKcal">{kcal} kcal</p>
      <p className="graficoTooltipDiff" style={{ color: cor }}>
        {sinal}{diff} em relação à meta
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Componente principal
// ─────────────────────────────────────────────────────────────────────────────
function GraficoKcal({ user }) {

  const [dados,     setDados]     = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [meta,      setMeta]      = useState(0);

  // Lê a meta do localStorage (já salva pelo MeuPlano)
  useEffect(() => {
    const m = localStorage.getItem("metaKcal");
    if (m) setMeta(Number(m));
  }, []);

  // Busca os últimos 14 dias do Supabase
  useEffect(() => {
    if (!user) return;

    const buscarHistorico = async () => {
      setCarregando(true);

      const { data, error } = await supabase
        .from("registros")
        .select("data, total_kcal")
        .eq("user_id", user.id)
        .order("data", { ascending: true })
        .limit(14);

      if (error) {
        //console.error("Erro ao buscar histórico:", error.message);
        setCarregando(false);
        return;
      }

      // Converte dd/mm/yyyy → rótulo curto "dd/mm"
      const formatado = (data || []).map((d) => {
        const partes = d.data.split("/"); // ["dd", "mm", "yyyy"]
        return {
          label: `${partes[0]}/${partes[1]}`,
          kcal:  d.total_kcal,
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

  // Domínio do eixo Y: um pouco abaixo do mínimo e acima do máximo
  const valores  = dados.map((d) => d.kcal);
  const minValor = Math.min(...valores, meta);
  const maxValor = Math.max(...valores, meta);
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
          <span className="graficoLegendaTexto">kcal consumida</span>
          <span className="graficoLegendaPonto tracejado" />
          <span className="graficoLegendaTexto">sua meta ({meta} kcal)</span>
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
            content={<TooltipCustom meta={meta} />}
            cursor={{ stroke: "#1e2d47", strokeWidth: 1 }}
          />

          {/* Linha de meta tracejada */}
          <ReferenceLine
            y={meta}
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