import './SmartPa.css';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

const AFIRMATIVAS = [
  'sim', 'podemos', 'claro', 'pode', 'vamos', 'ok', 'tá', 'ta', 'certo',
  'ta bom', 'tá bom', 'entendido', 'combinado', 'com certeza', 'claro que sim',
  'com prazer', 'aceito', 'concordo', 'perfeito', 'ótimo', 'otimo', 'top',
  'beleza', 'fechado', 'bora', 'pode ser', 'tudo bem', 'tudo certo', 'positivo',
  'afirmativo', 'exato', 'exatamente', 'isso', 'isso mesmo', 'correto', 'vai',
  'quero', 'adorei', 'boa', 'show', 'maravilha', 'bacana', 'legal'
];

const isAfirmativa = (text) => {
  const lower = text.toLowerCase().trim();
  return AFIRMATIVAS.some((word) => lower.includes(word));
};

// seqIdx normais:
//  4  → linha1-4 exibidas, aguarda afirmativa
//  5  → linha5 exibida, aguarda "Paola"
//  7  → linha6+7 exibidas, aguarda input → linha7N
//  8  → linha7N exibida, aguarda input → linha8..10
//  12 → linha8+9+10 exibidas, aguarda afirmativa → linha11
//  13 → linha11 exibida, aguarda input → linha11N
//  14 → linha11N exibida, aguarda input → linha12..16 (etapa3)
//  16 → linha12-16 exibidas, aguarda input → linha16N
//  17 → linha16N exibida, aguarda input → linha17..29 (etapa4)
//  29 → linha17-29 exibidas, aguarda afirmativa → linha30
//  30 → linha30 exibida, mostra linha31 ou linha32 conforme tentativas
// seqIdx especiais (etapa no supabase):
//  990 → completou 1ª vez (linha33Final foi exibida)
//  991 → completou 2ª vez (linha34FinalDeTudo foi exibida)
//  992 → bloqueada (tentou 3ª vez)

export default function SmartPa({ onClose }) {
  const navigate = useNavigate();
  const [etapa1, setEtapa1] = useState({});
  const [etapa2, setEtapa2] = useState({});
  const [etapa3, setEtapa3] = useState({});
  const [etapa4, setEtapa4] = useState({});
  const [messages, setMessages] = useState([]);
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [seqIdx, setSeqIdx] = useState(0);
  // quantas vezes completou o fluxo inteiro (0, 1 ou 2+)
  const completionsRef = useRef(0);
  const typingTimerRef = useRef(null);
  const savedHistoryRef = useRef([]);
  const savedTotalRef = useRef([]);

  const pickRandom = (arr) => (arr && arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null);

  const saveHistory = useCallback(async (historico, total, etapa, id) => {
    if (!id) return;
    try {
      await supabase
        .from('chat')
        .update({ historico, historicototal: total, etapa })
        .eq('id', id);
      savedHistoryRef.current = historico;
      savedTotalRef.current = total;
    } catch (e) {
      console.error('[SmartPa] Erro ao salvar:', e);
    }
  }, []);

  const typeText = useCallback((text, onDone) => {
    if (!text || typeof text !== 'string') {
      if (onDone) onDone();
      return;
    }
    setIsTyping(true);
    setTypingText('');
    let i = 0;
    typingTimerRef.current = setInterval(() => {
      if (i < text.length) {
        setTypingText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typingTimerRef.current);
        setIsTyping(false);
        setMessages((prev) => [...prev, { type: 'ai', text }]);
        setTypingText('');
        if (onDone) onDone();
      }
    }, 30);
  }, []);

  const typeSequence = useCallback((lines, onDone) => {
    if (!lines || lines.length === 0) { if (onDone) onDone(); return; }
    const [first, ...rest] = lines;
    if (!first) { typeSequence(rest, onDone); return; }
    typeText(first, () => typeSequence(rest, onDone));
  }, [typeText]);

  const getLine = useCallback((key, source) => {
    return pickRandom((source || {})[key]);
  }, []);

  const saveAiMsg = useCallback((msg, nextSeq, id) => {
    const aiHistory = [...savedHistoryRef.current, { type: 'ai', text: msg }];
    const aiTotal = [...savedTotalRef.current, { type: 'ai', text: msg }];
    setSeqIdx(nextSeq);
    saveHistory(aiHistory, aiTotal, nextSeq, id);
  }, [saveHistory]);

  const saveAiMsgs = useCallback((msgs, nextSeq, id) => {
    const entries = msgs.map((t) => ({ type: 'ai', text: t }));
    const aiHistory = [...savedHistoryRef.current, ...entries];
    const aiTotal = [...savedTotalRef.current, ...entries];
    setSeqIdx(nextSeq);
    saveHistory(aiHistory, aiTotal, nextSeq, id);
  }, [saveHistory]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMsg = inputValue.trim();
    setInputValue('');

    setMessages((prev) => [...prev, { type: 'user', text: userMsg }]);
    const userHistory = [...savedHistoryRef.current, { type: 'user', text: userMsg }];
    const userTotal = [...savedTotalRef.current, { type: 'user', text: userMsg }];
    await saveHistory(userHistory, userTotal, seqIdx, chatId);

    // ── 4: aguarda afirmativa → linha5 ──
    if (seqIdx === 4) {
      if (!isAfirmativa(userMsg)) {
        const msg = getLine('linha4', etapa1) || 'Podemos continuar?';
        typeText(msg, () => saveAiMsg(msg, 4, chatId));
        return;
      }
      const msg = getLine('linha5', etapa1) || 'Qual o seu nome?';
      typeText(msg, () => saveAiMsg(msg, 5, chatId));
      return;
    }

    // ── 5: aguarda "Paola" → linha6+7 ──
    if (seqIdx === 5) {
      if (!/paola/i.test(userMsg)) {
        const msg = getLine('linha5N', etapa1) || 'Nome incorreto. Tente novamente.';
        typeText(msg, () => saveAiMsg(msg, 5, chatId));
        return;
      }
      const l6 = getLine('linha6', etapa2);
      const l7 = getLine('linha7', etapa2);
      const seq = [l6, l7].filter(Boolean);
      typeSequence(seq, () => saveAiMsgs(seq, 7, chatId));
      return;
    }

    // ── 7: aguarda input → linha7N ──
    if (seqIdx === 7) {
      const msg = getLine('linha7N', etapa2);
      if (msg) typeText(msg, () => saveAiMsg(msg, 8, chatId));
      return;
    }

    // ── 8: aguarda input → linha8+9+10 ──
    if (seqIdx === 8) {
      const l8 = getLine('linha8', etapa2);
      const l9 = getLine('linha9', etapa2);
      const l10 = getLine('linha10', etapa2);
      const seq = [l8, l9, l10].filter(Boolean);
      typeSequence(seq, () => saveAiMsgs(seq, 12, chatId));
      return;
    }

    // ── 12: aguarda afirmativa → linha11 ──
    if (seqIdx === 12) {
      if (!isAfirmativa(userMsg)) {
        const msg = getLine('linha10', etapa2);
        if (msg) typeText(msg, () => saveAiMsg(msg, 12, chatId));
        return;
      }
      const msg = getLine('linha11', etapa2);
      if (msg) typeText(msg, () => saveAiMsg(msg, 13, chatId));
      return;
    }

    // ── 13: linha11 exibida, aguarda input → linha11N ──
    if (seqIdx === 13) {
      const msg = getLine('linha11N', etapa2);
      if (msg) typeText(msg, () => saveAiMsg(msg, 14, chatId));
      return;
    }

    // ── 14: linha11N exibida, aguarda input → linha12..16 (etapa3) ──
    if (seqIdx === 14) {
      const seq = ['linha12', 'linha13', 'linha14', 'linha15', 'linha16']
        .map((k) => getLine(k, etapa3)).filter(Boolean);
      typeSequence(seq, () => saveAiMsgs(seq, 16, chatId));
      return;
    }

    // ── 16: linha16 exibida, aguarda input → linha16N ──
    if (seqIdx === 16) {
      const msg = getLine('linha16N', etapa3);
      if (msg) typeText(msg, () => saveAiMsg(msg, 17, chatId));
      return;
    }

    // ── 17: linha16N exibida, aguarda input → linha17..29 (etapa4) ──
    if (seqIdx === 17) {
      const seq = [
        'linha17','linha18','linha19','linha20','linha21','linha22','linha23',
        'linha24','linha25','linha26','linha27','linha28','linha29',
      ].map((k) => getLine(k, etapa4)).filter(Boolean);
      typeSequence(seq, () => saveAiMsgs(seq, 29, chatId));
      return;
    }

    // ── 29: linha29 exibida, aguarda afirmativa → linha30 ──
    if (seqIdx === 29) {
      if (!isAfirmativa(userMsg)) {
        const msg = getLine('linha29', etapa4);
        if (msg) typeText(msg, () => saveAiMsg(msg, 29, chatId));
        return;
      }

      const completions = completionsRef.current;

      // 3ª tentativa em diante: bloqueia
      if (completions >= 2) {
        const msgBloqueio = 'Você já realizou este teste duas vezes e obteve seus resultados. Não há novas descobertas em uma terceira tentativa — confie no que já foi revelado sobre você. 💛';
        typeText(msgBloqueio, () => saveAiMsg(msgBloqueio, 992, chatId));
        return;
      }

      // Mostra linha30
      const l30 = getLine('linha30', etapa4);
      if (!l30) return;

      typeText(l30, () => {
        saveAiMsg(l30, 30, chatId);

        // 1ª vez: linha31 → linha33Final
        if (completions === 0) {
          const l31 = getLine('linha31', etapa4);
          const l33 = getLine('linha33Final', etapa4);
          const seq = [l31, l33].filter(Boolean);
          typeSequence(seq, () => {
            saveAiMsgs(seq, 990, chatId);
            completionsRef.current = 1;
          });
        }
        // 2ª vez: linha32 → linha33Final → linha34FinalDeTudo
        else if (completions === 1) {
          const l32 = getLine('linha32', etapa4);
          const l33 = getLine('linha33Final', etapa4);
          const l34 = getLine('linha34FinalDeTudo', etapa4);
          const seq = [l32, l33, l34].filter(Boolean);
          typeSequence(seq, () => {
            saveAiMsgs(seq, 991, chatId);
            completionsRef.current = 2;
          });
        }
      });
      return;
    }

    // ── 990/991: fluxo completo, aguarda reinício via botão limpar ──
    if (seqIdx === 990 || seqIdx === 991 || seqIdx === 992) {
      return;
    }

  }, [inputValue, isTyping, seqIdx, etapa1, etapa2, etapa3, etapa4,
      getLine, chatId, typeText, typeSequence, saveHistory, saveAiMsg, saveAiMsgs]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    if (onClose) { onClose(); } else { navigate('/home'); }
  };

  // Limpar conversa: respeita contagem de tentativas, NUNCA apaga historicototal
  const limparConversa = useCallback(async () => {
    if (!chatId) return;

    // Bloqueia reinício após 2 tentativas completas
    if (completionsRef.current >= 2) {
      const msg = 'Você já realizou este teste duas vezes. Não é possível reiniciar novamente. 💛';
      typeText(msg, () => {});
      return;
    }

    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    setIsTyping(false);
    setTypingText('');

    // Salva etapa especial que preserva contagem: 980 + completions
    // ex: completions=1 → etapa salva = 980 (indica "reiniciado após 1 conclusão")
    const etapaReinicio = 980 + completionsRef.current;

    await supabase
      .from('chat')
      .update({ historico: [], etapa: etapaReinicio })
      .eq('id', chatId);

    savedHistoryRef.current = [];
    setMessages([]);
    setSeqIdx(4);

    const seq = ['linha1', 'linha2', 'linha3', 'linha4']
      .map((k) => pickRandom(etapa1[k]))
      .filter(Boolean);

    typeSequence(seq, () => {
      const msgs = seq.map((t) => ({ type: 'ai', text: t }));
      savedHistoryRef.current = msgs;
      supabase
        .from('chat')
        .update({ historico: msgs, etapa: 4 })
        .eq('id', chatId);
    });
  }, [chatId, etapa1, typeText, typeSequence]);

  useEffect(() => {
    let cancelled = false;

    async function fetchChat() {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (cancelled) return;

        if (authError || !authData?.user?.id) {
          setError('Usuario nao autenticado.');
          setLoading(false);
          return;
        }

        const userId = authData.user.id;
        setChatId(userId);

        const { data: configData, error: configError } = await supabase
          .from('respostas')
          .select('etapa1, etapa2, etapa3, etapa4')
          .limit(1)
          .single();

        if (cancelled) return;

        if (configError || !configData) {
          setError('Tabela respostas nao encontrada.');
          setLoading(false);
          return;
        }

        const parseObj = (raw) => {
          if (!raw) return {};
          if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
          return typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
        };

        const parseArr = (raw) => {
          if (!raw) return [];
          if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return []; } }
          return Array.isArray(raw) ? raw : [];
        };

        const e1 = parseObj(configData.etapa1);
        const e2 = parseObj(configData.etapa2);
        const e3 = parseObj(configData.etapa3);
        const e4 = parseObj(configData.etapa4);
        setEtapa1(e1);
        setEtapa2(e2);
        setEtapa3(e3);
        setEtapa4(e4);

        const { data: userRow, error: userError } = await supabase
          .from('chat')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (cancelled) return;

        if (userError) {
          setError('Erro ao buscar dados do usuario.');
          setLoading(false);
          return;
        }

        if (!userRow) {
          await supabase.from('chat').insert({
            id: userId,
            historico: [],
            historicototal: [],
            etapa: 0,
          });
        }

        const historico = parseArr(userRow?.historico);
        const historicoTotal = parseArr(userRow?.historicototal);
        const etapa = typeof userRow?.etapa === 'number' ? userRow.etapa : 0;

        // Reconstrói contagem de tentativas a partir do etapa salvo
        if (etapa === 991 || etapa === 992) {
          completionsRef.current = 2;
        } else if (etapa === 990) {
          completionsRef.current = 1;
        } else {
          completionsRef.current = 0;
        }

        // Restaura histórico salvo
        if (userRow && historico.length > 0) {
          savedHistoryRef.current = historico;
          savedTotalRef.current = historicoTotal;
          setMessages(historico);
          setSeqIdx(etapa);
          setLoading(false);
          return;
        }

        savedTotalRef.current = historicoTotal;

        // Sem histórico: exibe linha1 → linha2 → linha3 → linha4
        const seq = ['linha1', 'linha2', 'linha3', 'linha4']
          .map((k) => pickRandom(e1[k]))
          .filter(Boolean);

        setSeqIdx(4);
        let localHistory = [];

        const runSeq = (lines) => {
          if (cancelled || lines.length === 0) {
            if (!cancelled) {
              savedHistoryRef.current = localHistory;
              supabase
                .from('chat')
                .update({ historico: localHistory, historicototal: historicoTotal, etapa: 4 })
                .eq('id', userId);
              setLoading(false);
            }
            return;
          }
          const [first, ...rest] = lines;
          if (!first) { runSeq(rest); return; }
          setIsTyping(true);
          setTypingText('');
          let i = 0;
          typingTimerRef.current = setInterval(() => {
            if (cancelled) { clearInterval(typingTimerRef.current); return; }
            if (i < first.length) {
              setTypingText(first.slice(0, i + 1));
              i++;
            } else {
              clearInterval(typingTimerRef.current);
              setIsTyping(false);
              setMessages((prev) => [...prev, { type: 'ai', text: first }]);
              setTypingText('');
              localHistory = [...localHistory, { type: 'ai', text: first }];
              runSeq(rest);
            }
          }, 30);
        };

        runSeq(seq);

      } catch (err) {
        if (!cancelled) setError('Erro inesperado: ' + err.message);
      }
    }

    fetchChat();

    return () => {
      cancelled = true;
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="smartpa-container">
        <div className="smartpa-header">
          <span className="smartpa-header-title">Smart PA</span>
          <button className="smartpa-close" onClick={handleClose} title="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="smartpa-chat smartpa-chat-center">
          <div className="smartpa-loading">
            <div className="smartpa-loading-dot" /><div className="smartpa-loading-dot" /><div className="smartpa-loading-dot" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="smartpa-container">
        <div className="smartpa-header">
          <span className="smartpa-header-title">Smart PA</span>
          <button className="smartpa-close" onClick={handleClose} title="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="smartpa-chat smartpa-chat-center">
          <div className="smartpa-error">
            <span className="smartpa-error-icon">!</span>
            <p className="smartpa-error-msg">{error}</p>
            <button className="smartpa-retry" onClick={() => window.location.reload()}>Tentar novamente</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="smartpa-container">
      <div className="smartpa-header">
        <span className="smartpa-header-title">Smart PA</span>
        <div className="smartpa-header-actions">
          <button className="smartpa-limpar" onClick={limparConversa} title="Limpar conversa">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
          <button className="smartpa-close" onClick={handleClose} title="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="smartpa-chat">
        {messages.map((msg, i) => (
          <div key={i} className={`smartpa-msg smartpa-msg-${msg.type}`}>
            <div className="smartpa-bubble">{msg.text}</div>
          </div>
        ))}
        {isTyping && typingText && (
          <div className="smartpa-msg smartpa-msg-ai">
            <div className="smartpa-bubble smartpa-bubble-typing">
              {typingText}<span className="smartpa-cursor">|</span>
            </div>
          </div>
        )}
      </div>

      <div className="smartpa-input-area">
        <input
          className="smartpa-input"
          type="text"
          placeholder={isTyping ? 'SmartPA esta escrevendo...' : 'Digite sua mensagem...'}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isTyping}
          autoFocus
        />
        <button
          className="smartpa-send"
          onClick={handleSend}
          disabled={!inputValue.trim() || isTyping}
          title="Enviar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}