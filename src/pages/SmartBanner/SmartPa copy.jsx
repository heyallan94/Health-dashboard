import './SmartPa.css';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

export default function SmartPa({ onClose }) {
  const navigate = useNavigate();
  const [lines, setLines] = useState([]);
  const [linha5N, setLinha5N] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatId, setChatId] = useState(null);
  const typingTimerRef = useRef(null);
  const savedHistoryRef = useRef([]);
  const savedTotalRef = useRef([]);
    /*<button className="smartpa-limpar" onClick={limparConversa} title="Limpar conversa">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>*/
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

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMsg = inputValue.trim();
    setInputValue('');

    setMessages((prev) => [...prev, { type: 'user', text: userMsg }]);

    if (currentLineIdx === 5) {
      if (userMsg.trim().toLowerCase() !== 'allan') {
        const newTotal = [...savedTotalRef.current, userMsg];

        if (linha5N.length > 0) {
          const randomN = linha5N[Math.floor(Math.random() * linha5N.length)];
          typeText(randomN, () => {
            const newHistory = [
              ...savedHistoryRef.current,
              { type: 'user', text: userMsg },
              { type: 'ai', text: randomN },
            ];
            saveHistory(newHistory, newTotal, currentLineIdx, chatId);
          });
        } else {
          const newHistory = [
            ...savedHistoryRef.current,
            { type: 'user', text: userMsg },
            { type: 'ai', text: 'Nome incorreto. Tente novamente.' },
          ];
          saveHistory(newHistory, newTotal, currentLineIdx, chatId);
        }
        return;
      }

      const userHistory = [...savedHistoryRef.current, { type: 'user', text: userMsg }];
      const userTotal = [...savedTotalRef.current, userMsg];
      const newEtapa = currentLineIdx + 1;
      await saveHistory(userHistory, userTotal, newEtapa, chatId);

      if (currentLineIdx < lines.length) {
        typeText(lines[currentLineIdx], () => {
          setCurrentLineIdx(newEtapa);
          const aiHistory = [...savedHistoryRef.current, { type: 'ai', text: lines[currentLineIdx] }];
          saveHistory(aiHistory, savedTotalRef.current, newEtapa, chatId);
        });
      }
      return;
    }

    const userHistory = [...savedHistoryRef.current, { type: 'user', text: userMsg }];
    const userTotal = [...savedTotalRef.current, userMsg];
    const newEtapa = currentLineIdx + 1;
    await saveHistory(userHistory, userTotal, newEtapa, chatId);

    if (currentLineIdx < lines.length) {
      typeText(lines[currentLineIdx], () => {
        setCurrentLineIdx(newEtapa);
        const aiHistory = [...savedHistoryRef.current, { type: 'ai', text: lines[currentLineIdx] }];
        saveHistory(aiHistory, savedTotalRef.current, newEtapa, chatId);
      });
    }
  }, [inputValue, isTyping, currentLineIdx, lines, linha5N, chatId, typeText, saveHistory]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    if (onClose) { onClose(); } else { navigate('/home'); }
  };

  const limparConversa = useCallback(async () => {
    if (!chatId) return;
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    setIsTyping(false);
    setTypingText('');

    await supabase
      .from('chat')
      .update({ historico: [], etapa: 0 })
      .eq('id', chatId);

    savedHistoryRef.current = [];
    setMessages([]);
    setCurrentLineIdx(0);

    const maxInit = Math.min(5, lines.length);
    if (maxInit === 0) return;

    const typeLine = (idx) => {
      if (idx >= maxInit) return;
      typeText(lines[idx], () => {
        if (idx < 4 && idx + 1 < maxInit) {
          typeLine(idx + 1);
        } else {
          setCurrentLineIdx(maxInit);
          const initialHistory = lines.slice(0, maxInit).map((text) => ({
            type: 'ai',
            text,
          }));
          saveHistory(initialHistory, [], maxInit, chatId);
        }
      });
    };
    typeLine(0);
  }, [chatId, lines, typeText, saveHistory]);

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
          .select('etapa1')
          .limit(1)
          .single();

        if (cancelled) return;

        if (configError || !configData) {
          setError('Tabela respostas nao encontrada ou vazia.');
          setLoading(false);
          return;
        }

        let jsonData = configData.etapa1;

        if (!jsonData) {
          setError('Coluna "etapa1" na tabela respostas esta vazia.');
          setLoading(false);
          return;
        }

        if (typeof jsonData === 'string') {
          try {
            jsonData = JSON.parse(jsonData);
          } catch (parseErr) {
            setError('JSON invalido em respostas.etapa1.');
            setLoading(false);
            return;
          }
        }

        if (typeof jsonData !== 'object' || Array.isArray(jsonData)) {
          setError('Conteudo de "etapa1" nao e um objeto JSON.');
          setLoading(false);
          return;
        }

        const extractNum = (key) => parseInt(key.replace(/^linha\s*/i, ''), 10);

        const lineKeys = Object.keys(jsonData)
          .filter((k) => /^linha\s*\d+$/i.test(k))
          .sort((a, b) => extractNum(a) - extractNum(b));

        if (lineKeys.length === 0) {
          setError('Nenhuma chave "linha 1", "linha 2"... encontrada.');
          setLoading(false);
          return;
        }

        const sortedLines = lineKeys.map((k) => {
          const arr = jsonData[k];
          if (Array.isArray(arr) && arr.length > 0) {
            return arr[Math.floor(Math.random() * arr.length)];
          }
          return arr;
        });

        setLines(sortedLines);

        const linha5nKey = Object.keys(jsonData).find((k) => /^linha\s*5n$/i.test(k));
        if (linha5nKey && Array.isArray(jsonData[linha5nKey])) {
          setLinha5N(jsonData[linha5nKey]);
        }

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

        const historico = parseArray(userRow?.historico);
        const historicoTotal = parseArray(userRow?.historicototal);
        const etapa = typeof userRow?.etapa === 'number' ? userRow.etapa : 0;

        if (userRow && historico.length > 0 && etapa > 0) {
          savedHistoryRef.current = historico;
          savedTotalRef.current = historicoTotal;
          setMessages(historico);
          setCurrentLineIdx(etapa);
          setLoading(false);
          return;
        }

        const maxInit = Math.min(5, sortedLines.length);

        const typeLine = (idx) => {
          if (idx >= maxInit) return;
          typeText(sortedLines[idx], () => {
            if (idx < 4 && idx + 1 < maxInit) {
              typeLine(idx + 1);
            } else {
              setCurrentLineIdx(maxInit);
              const initialHistory = sortedLines.slice(0, maxInit).map((text) => ({
                type: 'ai',
                text,
              }));
              saveHistory(initialHistory, [], maxInit, userId);
            }
          });
        };

        typeLine(0);
      } catch (err) {
        if (!cancelled) setError('Erro inesperado: ' + err.message);
      }

      if (!cancelled) setLoading(false);
    }

    function parseArray(raw) {
      if (!raw) return [];
      if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch (e) { return []; }
      }
      if (Array.isArray(raw)) return raw;
      return [];
    }

    fetchChat();

    return () => {
      cancelled = true;
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, [typeText, saveHistory]);

  if (loading) {
    return (
      <div className="smartpa-container">
        <div className="smartpa-header">
          <span className="smartpa-header-title">Smart PA</span>
          <button className="smartpa-close" onClick={handleClose} title="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="smartpa-chat smartpa-chat-center">
          <div className="smartpa-loading">
            <div className="smartpa-loading-dot" />
            <div className="smartpa-loading-dot" />
            <div className="smartpa-loading-dot" />
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="smartpa-chat smartpa-chat-center">
          <div className="smartpa-error">
            <span className="smartpa-error-icon">!</span>
            <p className="smartpa-error-msg">{error}</p>
            <button className="smartpa-retry" onClick={() => window.location.reload()}>
              Tentar novamente
            </button>
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
          
          <button className="smartpa-close" onClick={handleClose} title="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="smartpa-chat">
        {messages.map((msg, i) => (
          <div key={i} className={`smartpa-msg smartpa-msg-${msg.type}`}>
            <div className="smartpa-bubble">
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && typingText && (
          <div className="smartpa-msg smartpa-msg-ai">
            <div className="smartpa-bubble smartpa-bubble-typing">
              {typingText}
              <span className="smartpa-cursor">|</span>
            </div>
          </div>
        )}
      </div>

      <div className="smartpa-input-area">
        <input
          className="smartpa-input"
          type="text"
          placeholder={
            isTyping
              ? 'SmartPA esta escrevendo...'
              : 'Digite sua mensagem...'
          }
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
