
import React, { useState, useEffect } from "react";
import "./Register.css";
import loadingImg from "/TI 2026/React/login-app/src/components/loading.png";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient";


function Register() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);  
  const validarEmail = (email) => {return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)};
  const validarSenha = (senha) => {return /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,50}$/.test(senha)};
  const [contaCriada, setContaCriada] = useState(false);

  useEffect(() => {
  if (contaCriada) {
    const t = setTimeout(() => navigate("/"), 2500);
    return () => clearTimeout(t);
  }
  }, [contaCriada]);


  const handleRegister = async () => {
   
    if (!nome || !email || !senha || !confirmSenha) {
      setErro("Preencha todos os campos");
      return;
    } 

    if (senha !== confirmSenha) {
      setErro("Senhas não coincidem");
      return;
    }

    if (!validarEmail(email)) {
      setErro("Use um email válido");
      return;
    }

    if (!validarSenha(senha)) {
      setErro("Crie uma senha melhor.");
      return;
    }

    setErro("");
    setLoading(true);


   
  const { data, error } = await supabase.auth.signUp({
        email: email,
        password: senha,
        options: {
          emailRedirectTo: "http://localhost:3000/confirmado",
          data: {
            nome: nome,
          },
        },
  });
  if (!error && data?.user) {
    const { error: registroError } = await supabase
      .from("registros")
      .insert({
        user_id: data.user.id,
        nome: nome,
        email: email,
        //test: senha,
      });
    if (registroError) {
      console.log(registroError);
    }
  }

    setLoading(false);

    if (error) {
      console.log(error);
      setErro(error.message);
      return;
    }

    // sucesso
    setContaCriada(true);
    setErro("Conta criada!");

    setTimeout(() => {
      navigate("/");
    }, 2500);
  };


  const senhaTemMaiuscula = /[A-Z]/.test(senha);
  const senhaTemMinuscula = /[a-z]/.test(senha);
  const senhaTemNumero = /[0-9]/.test(senha);
  const senhaTemSimbolo = /[^A-Za-z0-9]/.test(senha);
  const senhaTem8 = senha.length >= 8;

  const forcaSenha =
    [
      senhaTemMaiuscula,
      senhaTemMinuscula,
      senhaTemNumero,
      senhaTemSimbolo,
      senhaTem8,
    ].filter(Boolean).length;

  return (
    <div className="container">

      {}
      {loading && (
        <div className="overlay">
          <img src={loadingImg} alt="loading" className="loadingImg" />
        </div>
      )}

      {}
      <div className="logoContainer">
        <img src="/logoas.png" alt="Logo" className="logoImg" />
      </div>

      <div className="title">Cadastro</div>
      
      {}
      <div className="form">
        <input
          type="text"
          placeholder="Nome"
          className="input"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          className="input"
          value={email}
          onChange={(e)=> setEmail(e.target.value)}
          pattern=".@(gmail\.com|yahoo\.com|outlook\.com"
          title="Use um email válido."
        />

        <input
          type={mostrarSenha ? "text" : "password"}
          placeholder="Senha"
          className="input"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

         <input
          type={mostrarConfirmar? "text" : "password"}
          placeholder="Confirmar Senha"
          className="input"
          value={confirmSenha}
          onChange={(e) => setConfirmSenha(e.target.value)}
          
        />      

        <button
        className="eyeButton"
        onClick={() => {
        setMostrarSenha(true);
        setMostrarConfirmar(true);

    setTimeout(() => {
      setMostrarSenha(false);
      setMostrarConfirmar(false);
    }, 3000);
  }}
>
  👁️
</button>

        <div className="passwordStrength">

          <div className="strengthBar">
            <div
              className={`strengthFill level${forcaSenha}`}
            ></div>
          </div>

          <div className="passwordRules">
            <p className={senhaTemMaiuscula ? "ok" : ""}>
              ✓ Letra maiúscula
            </p>

            <p className={senhaTemMinuscula ? "ok" : ""}>
              ✓ Letra minúscula
            </p>

            <p className={senhaTemNumero ? "ok" : ""}>
              ✓ Número
            </p>

            <p className={senhaTemSimbolo ? "ok" : ""}>
              ✓ Símbolo
            </p>

            <p className={senhaTem8 ? "ok" : ""}>
              ✓ Mínimo 8 caracteres
            </p>
          </div>

        </div>


        {erro && <span className="error">{erro}</span>}

        <button className="button" onClick={handleRegister}>
          Criar Conta
        </button>

        <div className="links">
          <button className="linkButton"
          onClick={() => navigate("/")}
          >Voltar ao Login</button>
        </div>

      </div>
    </div>
  );
}



export default Register;

