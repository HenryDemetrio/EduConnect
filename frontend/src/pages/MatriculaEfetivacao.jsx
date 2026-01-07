import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../context/ThemeContext";

export default function MatriculaEfetivacao() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [rgCpf, setRgCpf] = useState(null);
  const [escolaridade, setEscolaridade] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  function handleNext() {
    if (!rgCpf || !escolaridade) {
      alert("Por favor, envie ambos os documentos!");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setSucesso(true);
      setLoading(false);

      setTimeout(() => {
        navigate("/matricula-pagamento");
      }, 2000);
    }, 1500);
  }

  return (
    <div className="auth-page">

      {/* PARCEIROS */}
      <div className="partners-bar">
        <img src="https://tivit.com/wp-content/themes/tivit-v2/assets/images/logo-tivit-almaviva.svg" alt="Logo TIVIT" />
        <img src="https://cursos.jmarc.com.br/images/Logos/Alura_image.png" alt="Logo Alura" />
        <img src="https://i0.wp.com/innovationweeksjc.com.br/wp-content/uploads/2024/08/Artboard-1.png?fit=800%2C378&ssl=1" alt="Logo FIAP" />
      </div>

      {/* CARD PRINCIPAL */}
      <div className="auth-card">

        {/* HEADER */}
        <div className="auth-header-top">
          <img
            className="app-logo"
            src={theme === "dark" ? "/educonnect-logo-dark.svg" : "/educonnect-logo.svg"}
            alt="Logo EduConnect"
          />
          <ThemeToggle />
        </div>

        <h2 className="auth-title">Etapa 2 - Documentos</h2>   <br />
        <p className="auth-subtitle">Envie os documentos para continuar com a matrícula. </p>
  <br />
        

        {/* FORM */}
        <div className="form-card">

          <label>Documento RG ou CPF</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setRgCpf(e.target.files[0])}
          />

          <label style={{ marginTop: 14 }}>Comprovante de conclusão ensino médio</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setEscolaridade(e.target.files[0])}
          />

          <button className="btn-primary" onClick={handleNext} disabled={loading}>
            {loading ? "Processando..." : "Enviar documentos →"}
          </button>
        </div>

        {/* SUCESSO */}
        {sucesso && (
          <div className="success-box fade-in">
            <strong>Documentos enviados!</strong>
            <p>Aguarde… encaminhando para pagamento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
