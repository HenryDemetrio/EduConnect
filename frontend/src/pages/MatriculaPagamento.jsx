import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../context/ThemeContext";
import { apiRequest } from "../services/api";

export default function MatriculaPagamento() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [file, setFile] = useState(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function handleFinalizar() {
    const id = localStorage.getItem("preMatriculaId");
    if (!id) return navigate("/matricula");

    if (!file) return setErro("Envie o comprovante de pagamento (PDF).");

    try {
      setErro("");
      setLoading(true);

      const fd = new FormData();
      fd.append("Comprovante", file); // PascalCase pra bater com DTO

      await apiRequest(`/pre-matriculas/${id}/pagamento`, {
        method: "POST",
        body: fd,
      });

      setSucesso(true);
      localStorage.removeItem("preMatriculaId");
      setTimeout(() => navigate("/login"), 700);
    } catch (err) {
      setErro(err?.payload?.message || err?.message || "Falha ao enviar comprovante.");
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
          <h2>Pagamento</h2>
          <ThemeToggle />
        </div>

        <p className="auth-subtitle">
          Envie o comprovante em PDF. Depois o Admin aprova sua matrícula.
        </p>

        {erro ? <div className="settings-alert error">{erro}</div> : null}
        {sucesso ? <div className="settings-alert ok">Etapa 3 concluída ✅</div> : null}

        <div className="auth-form">
          <div className="form-field">
            <label>Comprovante de pagamento (PDF) *</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <button className="btn-primary" onClick={handleFinalizar} disabled={loading}>
            {loading ? "Enviando..." : "Finalizar"}
          </button>
        </div>
      </div>
    </div>
  );
}