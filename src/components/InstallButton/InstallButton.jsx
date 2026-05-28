import React, { useEffect, useState } from "react";
import "./InstallButton.css";

const isIos = () => {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
};

const isAndroid = () => {
  const ua = window.navigator.userAgent.toLowerCase();
  return /android/.test(ua);
};

const isStandalone = () => {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
};

function InstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [podeInstalarAndroid, setPodeInstalarAndroid] = useState(false);
  const [mostrarInstrucaoIos, setMostrarInstrucaoIos] = useState(false);
  const [instalado, setInstalado] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalado(true);
      return;
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();

      if (!isAndroid()) return;

      setInstallPrompt(event);
      setPodeInstalarAndroid(true);
      setMostrarInstrucaoIos(false);
    };

    const handleAppInstalled = () => {
      setInstalado(true);
      setInstallPrompt(null);
      setPodeInstalarAndroid(false);
      setMostrarInstrucaoIos(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (isIos()) {
      setMostrarInstrucaoIos(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const instalarAndroid = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();

    const resultado = await installPrompt.userChoice;

    setInstallPrompt(null);
    setPodeInstalarAndroid(false);

    if (resultado.outcome === "accepted") {
      setInstalado(true);
    }
  };

  if (instalado) return null;

  if (podeInstalarAndroid) {
    return (
      <div className="installBox">
        <button
          type="button"
          className="installButton"
          onClick={instalarAndroid}
        >
          📲 Instalar AS Saúde
        </button>
      </div>
    );
  }

  if (mostrarInstrucaoIos) {
    return (
      <div className="installIosBox">
        <p>
          IMPORTANTE!<br></br> 
          No iPhone, <strong>Toque nos 3 pontinhos,</strong><br></br>
          Toque em <strong>Compartilhar,</strong><br></br>
          Toque em <strong>MAIS</strong>,<br></br> 
          E por fim <strong>"Adicionar à Tela de Início.</strong><br></br>
          <i>Dessa forma você terá o aplicativo instalado.</i>
        </p>
      </div>
    );
  }

  return null;
}

export default InstallButton;
