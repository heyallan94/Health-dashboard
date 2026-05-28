import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabaseClient";

export function useConexao() {
  const [verificando, setVerificando] = useState(true);
  const [conectado, setConectado] = useState(false);
  const verificandoRef = useRef(false);

  const verificarConexao = useCallback(async () => {
    if (verificandoRef.current) return conectado;

    if (!navigator.onLine) {
      setConectado(false);
      setVerificando(false);
      return false;
    }

    verificandoRef.current = true;

    try {
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("timeout")), 1800);
      });

      const ping = supabase.auth.getUser();

      await Promise.race([ping, timeout]);

      setConectado(true);
      return true;
    } catch {
      setConectado(false);
      return false;
    } finally {
      verificandoRef.current = false;
      setVerificando(false);
    }
  }, [conectado]);

  useEffect(() => {
    verificarConexao();

    const onOnline = () => verificarConexao();

    const onOffline = () => {
      setConectado(false);
      setVerificando(false);
    };

    const intervalo = setInterval(() => {
      verificarConexao();
    }, 6000);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      clearInterval(intervalo);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [verificarConexao]);

  return {
    conectado,
    verificando,
    verificarConexao,
  };
}
