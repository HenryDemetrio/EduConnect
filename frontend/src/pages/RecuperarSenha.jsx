import { Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../context/ThemeContext'

export default function RecuperarSenha() {
  const { theme } = useTheme()

  function handleSubmit(e) {
    e.preventDefault()
    // por enquanto, só simula envio
    alert(
      'Simulação: enviamos um link de recuperação para o e-mail informado.',
    )
  }

  return (
    <div className="auth-page">
      {/* mesma barra de parceiros pra manter a identidade */}
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
        {/* header com logo EduConnect e toggle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 8,
          }}
        >
          <img
            className="app-logo"
            src={
              theme === 'dark'
                ? '/educonnect-logo-dark.svg'
                : '/educonnect-logo.svg'
            }
            alt="Logo EduConnect"
          />

          <ThemeToggle />
        </div>

        <div className="auth-header">
          <span className="auth-tag">Recuperar acesso</span>
          <h1 className="auth-title">Esqueceu sua senha?</h1>
          <p className="auth-subtitle">
            Informe seu e-mail institucional para receber um link de redefinição
            de senha.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="email">E-mail institucional</label>
            <input
              id="email"
              type="email"
              placeholder="seuemail@escola.com"
              required
            />
          </div>

          <div className="auth-actions">
            <button type="submit" className="btn-primary">
              Enviar link de recuperação
            </button>
          </div>
        </form>

        <div className="auth-footer">
          <Link to="/login">Voltar para o login</Link>
        </div>
      </div>
    </div>
  )
}
