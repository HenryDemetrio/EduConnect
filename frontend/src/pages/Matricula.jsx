import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../context/ThemeContext";
import { apiJson } from "../services/api";

export default function Matricula() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNasc, setDataNasc] = useState("");
  const [endereco, setEndereco] = useState("");

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!nome || !email || !telefone || !dataNasc || !endereco) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      setErro("");
      setLoading(true);

      // ✅ Backend: POST /pre-matriculas
      const resp = await apiJson("/pre-matriculas", "POST", {
        nome,
        email,
        telefone,
        dataNasc, // "YYYY-MM-DD"
        endereco,
      });

      const id = resp?.id ?? resp?.preMatriculaId;
      if (!id) throw new Error("Resposta do servidor sem ID da pré-matrícula.");

      localStorage.setItem("preMatriculaId", String(id));

      setSucesso(true);
      setTimeout(() => navigate("/matricula-efetivacao"), 600);
    } catch (err) {
      const msg =
        err?.payload?.message ||
        err?.payload?.error ||
        err?.message ||
        "Não foi possível iniciar sua matrícula.";
      setErro(msg);
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
          <h2>Pré-matrícula</h2>
          <ThemeToggle />
        </div>

        <p className="auth-subtitle">
          Preencha seus dados para iniciar o processo.
        </p>

        {erro ? <div className="settings-alert error">{erro}</div> : null}
        {sucesso ? (
          <div className="settings-alert ok">Etapa 1 concluída ✅</div>
        ) : null}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label>Nome completo *</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>E-mail *</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="form-field">
              <label>Telefone *</label>
              <input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Data de nascimento *</label>
              <input
                type="date"
                value={dataNasc}
                onChange={(e) => setDataNasc(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Endereço *</label>
              <input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            </div>
          </div>

          <button className="btn-primary" disabled={loading}>
            {loading ? "Enviando..." : "Continuar"}
          </button>

          <div className="auth-footer">
            <span>Já tem conta?</span>{" "}
            <Link to="/login" className="settings-link">
              Entrar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}