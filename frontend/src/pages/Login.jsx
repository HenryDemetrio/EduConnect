import { useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    if (!email || !senha) {
      setErro('Preencha e-mail e senha.')
      return
    }

    try {
      setErro('')
      setSubmitting(true)

      const resp = await login(email.trim(), senha)

      const role = (resp?.role || '').toLowerCase()
      if (role === 'admin') navigate('/dashboard')
      else if (role === 'professor') navigate('/dashboard')
      else if (role === 'aluno') navigate('/dashboard')
      else navigate('/dashboard')
    } catch (err) {
      const msg =
        err?.payload?.message ||
        (err?.status === 401 ? 'E-mail ou senha inválidos.' : 'Falha ao realizar login.')
      setErro(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Logos dos parceiros em cima do card */}
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
        {/* topo do card: logo EduConnect grande à esquerda + toggle à direita */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18
          }}
        >
          <img
            className="app-logo"
            src={theme === 'dark' ? '/educonnect-logo-dark.svg' : '/educonnect-logo.svg'}
            alt="Logo EduConnect"
          />

          <ThemeToggle />
        </div>

        <div className="auth-header">
          <span className="auth-tag">Área restrita</span>
          <h1 className="auth-title">Login EduConnect</h1>
          <p className="auth-subtitle">Acesse o painel com suas credenciais.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="email">E-mail institucional</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seuemail@escola.com"
              required
              disabled={submitting}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              disabled={submitting}
            />
          </div>

          {erro && (
            <p style={{ color: '#b91c1c', fontSize: '0.8rem', marginTop: 4 }}>
              {erro}
            </p>
          )}

          <div className="auth-actions">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          <div style={{ marginBottom: 4 }}>
            <Link to="/recuperar-senha" className="authlink">
              Esqueceu sua senha?
            </Link>
          </div>

          <span>Ainda não tem acesso? </span>
          <Link to="/matricula" className="authlink">
            Matricule-se agora!
          </Link>
        </div>
      </div>
    </div>
  )
}
