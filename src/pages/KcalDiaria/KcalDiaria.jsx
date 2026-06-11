
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";
import "./KcalDiaria.css";
import { BASE_PADRAO } from "../../data/baseNutricional";


const formatarNome = (key) =>
  key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

const dataInputHoje = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const inputParaDataBR = (valor) => {
  if (!valor) return dataHoje();
  const [yyyy, mm, dd] = valor.split("-");
  return `${dd}/${mm}/${yyyy}`;
};

const criarTimestamp = (dataInput, hora) => {
  if (!dataInput) return new Date().toISOString();
  return new Date(`${dataInput}T${hora || horaAgora()}:00`).toISOString();
};


const dataHoje = () => {
  const d  = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const horaAgora = () => {
  const d  = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const calcularTotais = (refeicoes) =>
  refeicoes.reduce(
    (acc, ref) =>
      (ref.itens || []).reduce(
        (a, item) => ({
          kcal:        a.kcal        + (item.kcal        || 0),
          proteina:    a.proteina    + (item.proteina    || 0),
          carboidrato: a.carboidrato + (item.carboidrato || 0),
        }),
        acc
      ),
    { kcal: 0, proteina: 0, carboidrato: 0 }
  );

// ─────────────────────────────────────────────────────────────────────────────
//  CACHE LOCAL  (chave = "refeicoes_HOJE")
// ─────────────────────────────────────────────────────────────────────────────
const CACHE_KEY = () => `refeicoes_${dataHoje()}`;

const lerCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const salvarCache = (refeicoes) => {
  try {
    localStorage.setItem(CACHE_KEY(), JSON.stringify(refeicoes));
    // Notifica Home dos totais atualizados
    const { kcal, proteina } = calcularTotais(refeicoes);
    localStorage.setItem("KcalDoDia",     String(kcal));
    localStorage.setItem("ProteinaDoDia", String(proteina));
    window.dispatchEvent(new Event("kcalAtualizada"));
  } catch {
    console.warn("localStorage cheio ou indisponível");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENTE
// ─────────────────────────────────────────────────────────────────────────────
function KcalDiaria({ onClose }) {
const tocandoSugestoesRef = useRef(false);
const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false);
const [nomePersonalizado, setNomePersonalizado] = useState("");
const [kcalPersonalizada, setKcalPersonalizada] = useState("");
const [proteinaPersonalizada, setProteinaPersonalizada] = useState("");

  

  const [dataRefeicaoTemp, setDataRefeicaoTemp] = useState(dataInputHoje);
  const navigate   = useNavigate();
  const isDesktop  = () => window.innerWidth >= 768;

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });
  }, []);


  const [tabela] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("alimentos")) || BASE_PADRAO;
    } catch {
      return BASE_PADRAO;
    }
  });

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [notificacao, setNotificacao] = useState("");
  const mostrarNotificacao = useCallback((texto) => {
    setNotificacao(texto);
    setTimeout(() => setNotificacao(""), 3000);
  }, []);

  // ── Refeições — inicializa direto do cache (zero delay) ───────────────────
  const [refeicoes,  setRefeicoes]  = useState(lerCache);
  const [sincronizando, setSincronizando] = useState(false);

  // ── Refeição em montagem ──────────────────────────────────────────────────
  const [itensTemp,        setItensTemp]        = useState([]);
  const [nomeRefeicaoTemp, setNomeRefeicaoTemp] = useState("");
  const [editandoId,       setEditandoId]       = useState(null);

  const excluirItemTemp = (indexParaExcluir) => {
  setItensTemp((prev) => prev.filter((_, index) => index !== indexParaExcluir));
};

  // ── Animações ─────────────────────────────────────────────────────────────
  const [removendoId,  setRemovendoId]  = useState(null);
  const [animandoTemp, setAnimandoTemp] = useState(false);

  // ── Autocomplete ──────────────────────────────────────────────────────────
  const [busca,            setBusca]            = useState("");
  const [alimento,         setAlimento]         = useState("");
  const [quantidade,       setQuantidade]       = useState("");
  const [tocandoSugestoes, setTocandoSugestoes] = useState(false);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  //  SINCRONIZAÇÃO: carrega do Supabase APENAS se o cache estiver vazio
  //  Roda uma vez quando o user é identificado
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const sincronizar = async () => {
      const cacheAtual = lerCache();

      // Se já tem cache local, não faz request — UI já está populada
      if (cacheAtual.length > 0) return;

      setSincronizando(true);
      try {
        const { data, error } = await supabase
          .from("refeicoes")
          .select("*")
          .eq("user_id", user.id)
          .eq("datad",   dataHoje())
          .order("timestamp", { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          // Normaliza formato vindo do Supabase
          const normalizadas = data.map((r) => ({
            id:        r.id,
            nome:      r.nome_refeicao || r.nome || "Refeição",
            datad:     r.datad,
            hora:      r.hora,
            timestamp: r.timestamp,
            itens:     r.itens || [],
          }));
          setRefeicoes(normalizadas);
          salvarCache(normalizadas);
        }
      } catch (e) {
        console.warn("Sync Supabase falhou (offline?):", e.message);
      } finally {
        setSincronizando(false);
      }
    };

    sincronizar();
  }, [user?.id]);

  // ─────────────────────────────────────────────────────────────────────────
  //  TOTAIS + ANIMAÇÃO DOS CONTADORES
  // ─────────────────────────────────────────────────────────────────────────
  const totais = useMemo(() => calcularTotais(refeicoes), [refeicoes]);
  const [buscaMobileAberta, setBuscaMobileAberta] = useState(false);
  const animRef = useRef({ kcal: totais.kcal, proteina: totais.proteina, carbo: totais.carboidrato });
  const [kcalAnimada,     setKcalAnimada]     = useState(totais.kcal);
  const [proteinaAnimada, setProteinaAnimada] = useState(totais.proteina);
  const [carboAnimada,    setCarboAnimada]    = useState(totais.carboidrato);

  useEffect(() => {
    const inicio = { ...animRef.current };
    const alvo   = { kcal: totais.kcal, proteina: totais.proteina, carbo: totais.carboidrato };
    const STEPS  = 40;
    let count    = 0;

    const intervalo = setInterval(() => {
      count++;
      const p = count / STEPS;
      setKcalAnimada(    Math.round((inicio.kcal     || 0) + ((alvo.kcal     || 0) - (inicio.kcal     || 0)) * p));
      setProteinaAnimada(Math.round((inicio.proteina || 0) + ((alvo.proteina || 0) - (inicio.proteina || 0)) * p));
      setCarboAnimada(   Math.round((inicio.carbo    || 0) + ((alvo.carbo    || 0) - (inicio.carbo    || 0)) * p));

      if (count >= STEPS) {
        animRef.current = alvo;
        setKcalAnimada(alvo.kcal);
        setProteinaAnimada(alvo.proteina);
        setCarboAnimada(alvo.carbo);
        clearInterval(intervalo);
      }
    }, 900 / STEPS);

    return () => clearInterval(intervalo);
  }, [totais.kcal, totais.proteina, totais.carboidrato]);

  // ─────────────────────────────────────────────────────────────────────────
  //  AUTOCOMPLETE
  // ─────────────────────────────────────────────────────────────────────────
  const alimentosFiltrados = useMemo(
    () =>
      Object.keys(tabela).filter((key) =>
        key.replaceAll("_", " ").toLowerCase().includes(busca.toLowerCase())
      ),
    [tabela, busca]
  );

  const generateId = () => {
    // crypto.randomUUID só funciona em HTTPS/localhost
    // fallback manual para HTTP (desenvolvimento via IP)
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  };

  const placeholderQtd = () => {
  const tipo = tabela[alimento]?.tipo;

  if (!tipo) return "Quantidade";

  if (tipo === "grama") return "Gramas";
  if (tipo === "ml") return "ML";

  return tipo.charAt(0).toUpperCase() + tipo.slice(1);
};

  // ─────────────────────────────────────────────────────────────────────────
  //  ADICIONAR ITEM À REFEIÇÃO EM MONTAGEM
  // ─────────────────────────────────────────────────────────────────────────
  const handleAdd = () => {
    if (!alimento || !quantidade) return;
    const q    = Number(quantidade);
    const base = tabela[alimento];
    if (!base || isNaN(q) || q <= 0) return;

    const fator = base.tipo === "grama" || base.tipo === "ml" ? q / 100 : q;

    setItensTemp((prev) => [
      ...prev,
      {
        nome:        alimento,
        quantidade:  q,
        tipo:        base.tipo,
        kcal:        Math.round(base.kcal        * fator),
        proteina:    Math.round(base.proteina    * fator),
        carboidrato: Math.round((base.carboidrato || 0) * fator),
      },
    ]);
    setQuantidade("");
    setBusca("");
    setAlimento("");
  };

  const adicionarAlimentoPersonalizado = () => {
  const nome = nomePersonalizado.trim();
  const kcal = Number(kcalPersonalizada);
  const proteina = Number(proteinaPersonalizada);

  if (!nome || isNaN(kcal) || kcal < 0 || isNaN(proteina) || proteina < 0) {
    return;
  }

  setItensTemp((prev) => [
    ...prev,
    {
      nome,
      quantidade: 1,
      tipo: "personalizado",
      kcal: Math.round(kcal),
      proteina: Math.round(proteina),
      carboidrato: 0,
    },
  ]);

  setNomePersonalizado("");
  setKcalPersonalizada("");
  setProteinaPersonalizada("");
  setMostrarPersonalizado(false);
};

  const userName = localStorage.getItem("nomeUsuario") || "";
  // ─────────────────────────────────────────────────────────────────────────
  //  CONFIRMAR REFEIÇÃO — salva LOCAL + SUPABASE imediatamente
  // ─────────────────────────────────────────────────────────────────────────
  const adicionarRefeicao = async () => {
  if (itensTemp.length === 0) return;

  const datadSelecionada = inputParaDataBR(dataRefeicaoTemp);
  const horaSelecionada = horaAgora();
  const refeicaoEhDeHoje = datadSelecionada === dataHoje();

  const novaRefeicao = {
    id: generateId(),
    nome: nomeRefeicaoTemp.trim() || `Refeição ${refeicaoEhDeHoje ? refeicoes.length + 1 : ""}`.trim(),
    datad: datadSelecionada,
    hora: horaSelecionada,
    timestamp: criarTimestamp(dataRefeicaoTemp, horaSelecionada),
    itens: itensTemp,
  };

  setAnimandoTemp(true);

  setTimeout(() => {
    if (refeicaoEhDeHoje) {
      setRefeicoes((prev) => {
        const novas = [...prev, novaRefeicao];
        salvarCache(novas);
        return novas;
      });
    }

    setItensTemp([]);
    setNomeRefeicaoTemp("");
    setDataRefeicaoTemp(dataInputHoje());
    setAnimandoTemp(false);

    if (!refeicaoEhDeHoje) {
      mostrarNotificacao(`Refeição salva em ${datadSelecionada}`);
      window.dispatchEvent(new Event("kcalAtualizada"));
    }
  }, 250);

  if (user?.id) {
    const totaisRef = calcularTotais([novaRefeicao]);

    supabase
      .from("refeicoes")
      .insert({
        id: novaRefeicao.id,
        user_id: user.id,
        nome_user: userName,
        datad: novaRefeicao.datad,
        hora: novaRefeicao.hora,
        timestamp: novaRefeicao.timestamp,
        nome_refeicao: novaRefeicao.nome,
        itens: novaRefeicao.itens,
        kcal_total: totaisRef.kcal,
        prot_total: totaisRef.proteina,
        carb_total: totaisRef.carboidrato,
      })
      .then(({ error }) => {
        if (error) {
          console.warn("Falha ao salvar refeição no Supabase:", error.message);
          mostrarNotificacao("Erro ao salvar refeição.");
          return;
        }

        window.dispatchEvent(new Event("kcalAtualizada"));
      });
  }
  };


  const atualizarRefeicaoSupabase = async (refeicaoAtualizada) => {
  if (!user?.id) return;

  const totaisRef = calcularTotais([refeicaoAtualizada]);

  const { error } = await supabase
    .from("refeicoes")
    .upsert(
      {
        id: refeicaoAtualizada.id,
        user_id: user.id,
        nome_user: userName,
        datad: refeicaoAtualizada.datad,
        hora: refeicaoAtualizada.hora,
        timestamp: refeicaoAtualizada.timestamp,
        nome_refeicao: refeicaoAtualizada.nome,
        itens: refeicaoAtualizada.itens,
        kcal_total: totaisRef.kcal,
        prot_total: totaisRef.proteina,
        carb_total: totaisRef.carboidrato,
      },
      { onConflict: "id" }
    );

  if (error) {
    console.warn("Falha ao atualizar refeição no Supabase:", error.message);
    mostrarNotificacao("Erro ao atualizar refeição.");
    return;
  }

  window.dispatchEvent(new Event("kcalAtualizada"));
  };



const excluirItemRefeicao = (refeicaoId, itemIndex) => {
  const refeicaoAtual = refeicoes.find((ref) => ref.id === refeicaoId);
  if (!refeicaoAtual) return;

  const itensAtualizados = (refeicaoAtual.itens || []).filter(
    (_, index) => index !== itemIndex
  );

  const refeicaoAtualizada = {
    ...refeicaoAtual,
    itens: itensAtualizados,
  };

  const refeicoesAtualizadas = refeicoes.map((ref) =>
    ref.id === refeicaoId ? refeicaoAtualizada : ref
  );

  setRefeicoes(refeicoesAtualizadas);
  salvarCache(refeicoesAtualizadas);
  atualizarRefeicaoSupabase(refeicaoAtualizada);
};


  const excluirRefeicao = (id) => {
    setRemovendoId(id);
    setTimeout(() => {
      setRefeicoes((prev) => {
        const novas = prev.filter((r) => r.id !== id);
        salvarCache(novas);
        return novas;
      });
      setRemovendoId(null);
    }, 300);

    // Remove do Supabase pelo id
    if (user?.id) {
      supabase
        .from("refeicoes")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .then(({ error }) => {
          if (error) console.warn("Falha ao excluir refeição no Supabase:", error.message);
        });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="kcalContainer">

      {/* Toast */}
      {notificacao && <div className="toastNotificacao">{notificacao}</div>}

      {/* Voltar (só mobile) */}
      <button
        className="btnVoltar"
        style={{ display: isDesktop() ? "none" : "flex" }}
        onClick={() => (onClose ? onClose() : navigate("/home"))}
      >
        ← Voltar
      </button>

      {/* Totais animados */}
      <div className="kcalHeader">
        <p className="contador">{kcalAnimada} K</p>
        <p className="contador">{proteinaAnimada} P</p>
        <p className="contador">{carboAnimada} C</p>
        {sincronizando && (
          <span className="syncIndicator" title="Sincronizando...">⟳</span>
        )}
      </div>

      <div className="finalizarDia">
        <p className="autoSaveInfo">
          Cada refeição é salva automaticamente assim que adicionada.
        </p>
      </div>

      <div className="inputArea">
        <div className="autocompleteWrapper">
        <input
          type="text"
          placeholder="Buscar alimento..."
          value={busca}
          autoComplete="off"
          readOnly={window.innerWidth < 768}
          onClick={() => {
            if (window.innerWidth < 768) {
              setBuscaMobileAberta(true);
              setMostrarSugestoes(false);
            }
          }}
          onChange={(e) => {
            setBusca(e.target.value.replace(/[^a-zA-ZÀ-ú\s]/g, ""));
            setAlimento("");
          }}
          onFocus={() => {
            if (window.innerWidth >= 768) setMostrarSugestoes(true);
          }}
          onBlur={() => {
            setTimeout(() => {
              if (!tocandoSugestoesRef.current) {
                setMostrarSugestoes(false);
              }
            }, 300);
          }}
        />

  {window.innerWidth >= 768 &&
    mostrarSugestoes &&
    busca.length > 0 &&
    alimentosFiltrados.length > 0 && (
      <ul className="sugestoesList">
        {alimentosFiltrados.slice(0, 8).map((key) => (
          <li
            key={key}
            onPointerDown={(e) => {
              e.preventDefault();
              setAlimento(key);
              setBusca(formatarNome(key));
              setMostrarSugestoes(false);
            }}
          >
            {formatarNome(key)}
          </li>
        ))}
      </ul>
    )}
</div>        
      </div>

      <div className="inputAreaQuantidadeAdicionar"> 

        <input
          className="tiposComida"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder={placeholderQtd()}
          value={quantidade}
         // onBlur={() => {setTimeout(() => {if (!tocandoSugestoes) setMostrarSugestoes(false);}, 250);}}
          onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, ""))}
        />

        <button className="btnAdicionar" onClick={handleAdd}>
            Adicionar
        </button>

      </div>
      


      {mostrarPersonalizado && (
        <div className="personalizarAlimentoArea">
          <input
            type="text"
            placeholder="Nome do alimento"
            value={nomePersonalizado}
            onChange={(e) => setNomePersonalizado(e.target.value)}
          />

          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Kcal"
            value={kcalPersonalizada}
            onChange={(e) => setKcalPersonalizada(e.target.value.replace(/\D/g, ""))}
          />

          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Proteínas"
            value={proteinaPersonalizada}
            onChange={(e) => setProteinaPersonalizada(e.target.value.replace(/\D/g, ""))}
          />

          <button
            type="button"
            className="btnAdicionarPersonalizado"
            onClick={adicionarAlimentoPersonalizado}
          >
            Adicionar personalizado
          </button>
        </div>
      )}

      

      <button
          type="button"
          className="btnPersonalizarAlimento"
          onClick={() => setMostrarPersonalizado((prev) => !prev)}>
          Personalizar alimento
      </button>

      {/* Refeição em montagem */}
      <div className={`refeicaoAtual ${animandoTemp ? "fadeOut" : ""}`}>

        <div className="tituloDataRefeicao">
  {editandoId === "temp" ? (
    <input
      className="tituloEditavel"
      type="text"
      autoFocus
      placeholder="Nome da refeição..."
      value={nomeRefeicaoTemp}
      onChange={(e) => setNomeRefeicaoTemp(e.target.value)}
      onBlur={() => setEditandoId(null)}
      onKeyDown={(e) => { if (e.key === "Enter") setEditandoId(null); }}
    />
  ) : (
    <p className="tituloClicavel" onClick={() => setEditandoId("temp")}>
      {nomeRefeicaoTemp.trim() || "Refeição atual"}{" "}
      <span className="iconeLapis">✎</span>
    </p>
  )}

  <input
    className="inputDataRefeicao"
    type="date"
    value={dataRefeicaoTemp}
    onChange={(e) => setDataRefeicaoTemp(e.target.value)}
  />
</div>


        {itensTemp.map((item, index) => (
          <div key={index} className="item">
            <span>
              {formatarNome(item.nome)} ({item.quantidade}
              {item.tipo === "grama" ? "g" : item.tipo === "ml" ? "ml" : "un"})
            </span>

          <div className="itemMacros">
            <span className="refeicaoAtualKcal">{item.kcal} Kcal</span>
            <span className="refeicaoAtualProteina">{item.proteina} G</span>
            <span className="refeicaoAtualCarbo">{item.carboidrato} C</span>
          
            <button
              type="button"
              className="btnExcluirItem"
              onClick={() => excluirItemTemp(index)}
            >
              Excluir Item
            </button>
            </div>
          </div>
        ))}

        {itensTemp.length > 0 && (
          <div className="botoesRefeicao">
            <button onClick={() => setItensTemp([])}>EXCLUIR</button>
            <button onClick={adicionarRefeicao}>FINALIZAR</button>
          </div>
        )}
      </div>

      {/* Refeições finalizadas */}
      <div className="lista">
        {refeicoes.map((ref) => {
          const totaisRef   = calcularTotais([ref]);
          const estaEditando = editandoId === ref.id;

          return (
            <div
              key={ref.id}
              className={`refeicaoMobile ${removendoId === ref.id ? "fadeOut" : ""}`}
            >
              <div className="topoRefeicao">

                {estaEditando ? (
                  <input
                    className="tituloRefeicao editando"
                    type="text"
                    autoFocus
                    value={ref.nome}
                    onChange={(e) => {
                      const novoNome = e.target.value;
                      setRefeicoes((prev) =>
                        prev.map((r) => r.id === ref.id ? { ...r, nome: novoNome } : r)
                      );
                    }}
                    onBlur={()   => setEditandoId(null)}
                    onKeyDown={(e) => { if (e.key === "Enter") setEditandoId(null); }}
                  />
                ) : (
                  <p className="tituloLinha" onClick={() => setEditandoId(ref.id)}>
                    {ref.nome}
                    <span className="iconeLapis"> ✎</span>
                  </p>
                )}

                <div className="resumoLinha">
                  <span>{totaisRef.kcal}k</span>
                  <span>{totaisRef.proteina}p</span>
                  <span>{totaisRef.carboidrato}c</span>
                </div>
              </div>

              {/* Hora da refeição */}
              {ref.hora && (
                <div className="refeicaoHora">{ref.hora}</div>
              )}

              <div className="itensRefeicao">
                {(ref.itens || []).map((item, i) => (
                  <div key={i} className="linhaItem">
                    <span>
                      {formatarNome(item.nome)} ({item.quantidade}
                      {item.tipo === "grama" ? "g" : item.tipo === "ml" ? "ml" : "un"})
                    </span>

                    <button
                      type="button"
                      className="btnExcluirItem"
                      onClick={() => excluirItemRefeicao(ref.id, i)}
                    >
                      Excluir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

        {buscaMobileAberta && (
            <div className="buscaAlimentoOverlay">
              <div className="buscaAlimentoSheet">
                <div className="buscaAlimentoTopo">
                  <input
                    type="text"
                    placeholder="Buscar alimento..."
                    value={busca}
                    autoFocus
                    autoComplete="off"
                    onChange={(e) => {
                      setBusca(e.target.value.replace(/[^a-zA-ZÀ-ú\s]/g, ""));
                      setAlimento("");
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setBuscaMobileAberta(false)}
                  >
                    Fechar
                  </button>
                </div>

                <div className="buscaAlimentoLista">
                  {busca.length > 0 &&
                    alimentosFiltrados.slice(0, 60).map((key) => (
                      <button
                        key={key}
                        type="button"
                        className="buscaAlimentoItem"
                        onClick={() => {
                          setAlimento(key);
                          setBusca(formatarNome(key));
                          setBuscaMobileAberta(false);
                          setMostrarSugestoes(false);
                        }}
                      >
                        {formatarNome(key)}
                      </button>
                    ))}

                  {busca.length > 0 && alimentosFiltrados.length === 0 && (
                    <p className="buscaAlimentoVazio">Nenhum alimento encontrado</p>
                  )}
                </div>
              </div>
            </div>
          )}


    </div>
  );
}

export default KcalDiaria;

//1006