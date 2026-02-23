import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../context/ThemeContext";
import { apiRequest } from "../services/api";

export default function MatriculaEfetivacao() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [rgCpf, setRgCpf] = useState(null);
  const [escolaridade, setEscolaridade] = useState(null);

  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function handleNext() {
    const id = localStorage.getItem("preMatriculaId");
    if (!id) {
      navigate("/matricula");
      return;
    }

    if (!rgCpf || !escolaridade) {
      setErro("Envie RG/CPF e Comprovante de Escolaridade (PDF).");
      return;
    }

    try {
      setErro("");
      setLoading(true);

      const fd = new FormData();
      fd.append("rgCpf", rgCpf);
      fd.append("escolaridade", escolaridade);

      await apiRequest(`/pre-matriculas/${id}/documentos`, {
        method: "POST",
        body: fd,
      });

      setSucesso(true);
      setTimeout(() => navigate("/matricula-pagamento"), 600);
    } catch (err) {
      const msg =
        err?.payload?.message ||
        err?.payload?.error ||
        err?.message ||
        "Não foi possível enviar os documentos.";
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
          <h2>Efetivação</h2>
          <ThemeToggle />
        </div>

        <p className="auth-subtitle">Envie os documentos obrigatórios em PDF.</p>

        {erro ? <div className="settings-alert error">{erro}</div> : null}
        {sucesso ? (
          <div className="settings-alert ok">Etapa 2 concluída ✅</div>
        ) : null}

        <div className="auth-form">
          <div className="form-field">
            <label>RG/CPF (PDF) *</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setRgCpf(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="form-field">
            <label>Comprovante de escolaridade (PDF) *</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setEscolaridade(e.target.files?.[0] ?? null)}
            />
          </div>

          <button className="btn-primary" onClick={handleNext} disabled={loading}>
            {loading ? "Enviando..." : "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}