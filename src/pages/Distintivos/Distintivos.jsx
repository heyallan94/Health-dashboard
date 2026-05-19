import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../services/supabaseClient";
import "./distintivos.css";

const sequenciaAtual = (historico) => {
  const datas = new Set(historico.map((h) => h.data));
  let seq = 0;
  const hoje = new Date();

  while (true) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - seq);

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const key = `${dd}/${mm}/${d.getFullYear()}`;

    if (!datas.has(key)) break;

    seq++;
  }

  return seq;
};


const DISTINTIVOS = [
  {
    id: "seq7", emoji: "🔥", label: "Chama Viva",
    descricao: "7 dias seguidos de registro",
    dica: "Registre seu histórico por 7 dias consecutivos",
    check: (hist) => {
      const seq = sequenciaAtual(hist);
      return { conquistado: seq >= 7, progresso: Math.min(seq / 7, 1), detalhe: seq >= 7 ? "7 dias seguidos!" : `${seq}/7 dias` };
    },
  },
  {
    id: "mes", emoji: "📅", label: "Mês Completo",
    descricao: "30 dias de histórico salvo",
    dica: "Acumule 30 dias de registro no calendário",
    check: (hist) => {
      const total = hist.length;
      return { conquistado: total >= 30, progresso: Math.min(total / 30, 1), detalhe: total >= 30 ? "30 dias!" : `${total}/30 dias` };
    },
  },
  {
    id: "proteina", emoji: "🥩", label: "Rei da Proteína",
    descricao: "Meta proteica batida 5 dias",
    dica: "Bata a meta de proteína em 5 dias diferentes",
    check: (hist) => {
      const meta = Number(localStorage.getItem("metaProteina")) || 150;
      const dias = hist.filter((h) => Number(h.protd) >= meta).length;
      return { conquistado: dias >= 5, progresso: Math.min(dias / 5, 1), detalhe: dias >= 5 ? "5 dias de proteína!" : `${dias}/5 dias` };
    },
  },
  {
    id: "perfeito", emoji: "🏆", label: "Dia Perfeito",
    descricao: "Um dia com tudo no verde",
    dica: "Bata todas as metas em um único dia",
    check: (hist) => {
      const metaKcal = Number(localStorage.getItem("metaKcal"))    || 1800;
      const metaProt = Number(localStorage.getItem("metaProteina")) || 150;
      const metaAgua = Number(localStorage.getItem("metaAgua"))     || 2000;
      const ok = hist.some((h) =>
        Number(h.kcald) >= metaKcal * 0.5 && Number(h.kcald) <= metaKcal * 1.05 &&
        Number(h.protd) >= metaProt &&
        Number(h.aguad) >= metaAgua * 0.9
      );
      return { conquistado: ok, progresso: ok ? 1 : 0, detalhe: ok ? "Dia perfeito registrado!" : "Ainda não" };
    },
  },
  {
    id: "seq14", emoji: "⚡", label: "Consistente",
    descricao: "14 dias seguidos de registro",
    dica: "Registre seu histórico por 14 dias sem falhar",
    check: (hist) => {
      const seq = sequenciaAtual(hist);
      return { conquistado: seq >= 14, progresso: Math.min(seq / 14, 1), detalhe: seq >= 14 ? "14 dias seguidos!" : `${seq}/14 dias` };
    },
  },
  {
    id: "agua", emoji: "💧", label: "Hidratado",
    descricao: "Meta de água em 3 dias",
    dica: "Bata a meta de água em 3 dias diferentes",
    check: (hist) => {
      const meta = Number(localStorage.getItem("metaAgua")) || 2000;
      const dias = hist.filter((h) => Number(h.aguad) >= meta * 0.9).length;
      return { conquistado: dias >= 3, progresso: Math.min(dias / 3, 1), detalhe: dias >= 3 ? "3 dias hidratado!" : `${dias}/3 dias` };
    },
  },
];

function TooltipPortal({ anchorRef, children }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      setPos({
        position: "fixed",
        top: rect.bottom + 10,
        left: 16,
        right: 16,
        width: "auto",
      });
    } else {
      setPos({
        position: "fixed",
        top: rect.bottom + 10,
        left: rect.left,
        width: 220,
      });
    }
  }, [anchorRef]);

  if (!pos) return null;

  return createPortal(
    <div className="distintivoTooltipPortal" style={{ ...pos, zIndex: 999999 }}>
      {children}
    </div>,
    document.body
  );
}

export default function Distintivos({ user }) {
  const [resultados, setResultados] = useState(() =>
    DISTINTIVOS.map((d) => ({ ...d, resultado: { conquistado: false, progresso: 0, detalhe: "..." } }))
  );
  const [aberto, setAberto] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    const carregar = async () => {
      const { data, error } = await supabase
        .from("historico_dias")
        .select("data, kcald, protd, carbd, aguad")
        .eq("user_id", user.id)
        .order("data", { ascending: false });
      if (error) { console.error(error); return; }
      const hist = data || [];
      setResultados(DISTINTIVOS.map((d) => ({ ...d, resultado: d.check(hist) })));
    };
    carregar();
  }, [user?.id]);

  useEffect(() => {
    const fechar = () => setAberto(null);
    document.addEventListener("click", fechar);
    return () => document.removeEventListener("click", fechar);
  }, []);

  return (
    <div className="distintivosRow">
      {resultados.map((d) => (
        <Medalha
          key={d.id}
          d={d}
          aberto={aberto === d.id}
          onToggle={(e) => {
            e.stopPropagation();
            setAberto((prev) => (prev === d.id ? null : d.id));
          }}
        />
      ))}
    </div>
  );
}

function Medalha({ d, aberto, onToggle }) {
  const ref = useRef(null);
  const { conquistado, progresso, detalhe } = d.resultado;

  return (
    <div
      ref={ref}
      className={`distintivo ${conquistado ? "conquistado" : "bloqueado"}`}
      onClick={onToggle}
    >
      <div className="distintivoAnel">
        <svg viewBox="0 0 36 36" className="distintivoSvg">
          <circle cx="18" cy="18" r="15" fill="none"
            stroke={conquistado ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)"}
            strokeWidth="2.5"
          />
          <circle cx="18" cy="18" r="15" fill="none"
            stroke={conquistado ? "currentColor" : "rgba(255,255,255,0.18)"}
            strokeWidth="2.5"
            strokeDasharray={`${progresso * 94.2} 94.2`}
            strokeLinecap="round"
            transform="rotate(-90 18 18)"
            className="distintivoArco"
          />
        </svg>
        <span className="distintivoEmoji">{d.emoji}</span>
      </div>

      {aberto && (
        <TooltipPortal anchorRef={ref}>
          <p className="ttLabel">{d.label}</p>
          <p className="ttDetalhe">{detalhe}</p>
          <p className="ttDica">{conquistado ? d.descricao : d.dica}</p>
        </TooltipPortal>
      )}
    </div>
  );
}