import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../context/ThemeContext";

export default function MatriculaPagamento() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  function handleNext() {
    if (!file) {
      alert("Envie o comprovante de pagamento!");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setSucesso(true);
      setLoading(false);

      setTimeout(() => {
        navigate("/login");
      }, 2500);

    }, 1500);
  }

  return (
    <div className="auth-page">

      <div className="partners-bar">
        <img src="https://tivit.com/wp-content/themes/tivit-v2/assets/images/logo-tivit-almaviva.svg" alt="Logo TIVIT" />
        <img src="https://cursos.jmarc.com.br/images/Logos/Alura_image.png" alt="Logo Alura" />
        <img src="https://i0.wp.com/innovationweeksjc.com.br/wp-content/uploads/2024/08/Artboard-1.png?fit=800%2C378&ssl=1" alt="Logo FIAP" />
      </div>

      <div className="auth-card">

        <div className="auth-header-top">
          <img
            className="app-logo"
            src={theme === "dark" ? "/educonnect-logo-dark.svg" : "/educonnect-logo.svg"}
            alt="Logo EduConnect"
          />
          <ThemeToggle />
        </div>

        <h2 className="auth-title">Etapa 3 - Pagamento</h2>
        <br />
        <p className="auth-subtitle">
          Envie o comprovante de pagamento (PDF ou imagem).
        </p>
        <br />

        <div className="form-card">
          <label>Comprovante de pagamento</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files[0])}
          />

          <button className="btn-primary" onClick={handleNext} disabled={loading}>
            {loading ? "Processando..." : "Finalizar matrícula →"}
          </button>
        </div>

        {/* Caixa de sucesso */}
        {sucesso && (
          <div className="success-box fade-in">
            <strong>Pagamento enviado!</strong>
            <p>
              Sua matrícula será analisada e, após aprovação, você receberá um
              e-mail com seu RA.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
