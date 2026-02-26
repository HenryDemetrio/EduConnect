import { useState } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../context/ThemeContext";
import { apiJson } from "../services/api";

export default function RecuperarSenha() {
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    setErro("");

    if (!email.trim()) {
      setErro("Informe seu e-mail.");
      return;
    }

    try {
      setLoading(true);

    
      await apiJson("/auth/forgot-password", "POST", { email: email.trim() });

      setMsg("Se esse e-mail existir, enviamos um link de recuperação. Verifique sua caixa de entrada.");
    } catch (e1) {
      
      setMsg(
        "Recuperação ainda não está automatizada. Peça ao Admin para redefinir sua senha ou conecte este fluxo ao Power Automate."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="partners-bar">
        <img
          src="https://tivit.com/wp-content/themes/tivit-v2/assets/images/logo-tivit-almaviva.svg"
          alt="Logo TIVIT"
        />
        <img
          src="https://cursos.jmarc.com.br/images/Logos/Alura_image.png"
          alt="Logo Alura"
        />
        <img
          src="https://i0.wp.com/innovationweeksjc.com.br/wp-content/uploads/2024/08/Artboard-1.png?fit=800%2C378&ssl=1"
          alt="Logo FIAP"
        />
      </div>

      <div className="auth-card">
        <div className="auth-card__header">
          <h2>Recuperar senha</h2>
          <ThemeToggle />
        </div>

        <p className="auth-subtitle">Informe seu e-mail para receber instruções.</p>

        {erro ? <div className="settings-alert error">{erro}</div> : null}
        {msg ? <div className="settings-alert ok">{msg}</div> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@educonnect.com"
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link"}
          </button>

          <div style={{ marginTop: 10 }}>
            <Link to="/login" className="auth-link">
              Voltar para login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}