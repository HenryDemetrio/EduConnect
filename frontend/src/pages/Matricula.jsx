import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../context/ThemeContext'

export default function Matricula() {
  const navigate = useNavigate()
  const { theme } = useTheme()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [dataNasc, setDataNasc] = useState('')
  const [endereco, setEndereco] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()

    if (!nome || !email || !telefone || !dataNasc || !endereco) {
      setErro('Preencha todos os campos obrigatórios.')
      return
    }

    setErro('')
    setLoading(true)

    setTimeout(() => {
      setSucesso(true)
      setLoading(false)

      setTimeout(() => {
        navigate('/matricula-efetivacao')   // ✔ ROTA CORRETA AQUI
      }, 2000)

    }, 1500)
  }

  return (
    <div className="auth-page">

      <div className="partners-bar">
        <img src="https://tivit.com/wp-content/themes/tivit-v2/assets/images/logo-tivit-almaviva.svg" alt="Logo TIVIT"/>
        <img src="https://cursos.jmarc.com.br/images/Logos/Alura_image.png" alt="Logo Alura"/>
        <img src="https://i0.wp.com/innovationweeksjc.com.br/wp-content/uploads/2024/08/Artboard-1.png?fit=800%2C378&ssl=1" alt="Logo FIAP"/>
      </div>

      <div className="auth-card">

        <div className="auth-header-top">
          <img
            className="app-logo"
            src={theme === 'dark' ? '/educonnect-logo-dark.svg' : '/educonnect-logo.svg'}
            alt="Logo EduConnect"
          />
          <ThemeToggle />
        </div>

        <div className="auth-header">
          <span className="auth-tag">Matrícula online</span>
          <h1 className="auth-title">Etapa 1 - Inscrição</h1>
          <p className="auth-subtitle">
            Preencha seus dados pessoais e continue para o envio dos documentos.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          
          <div className="auth-field">
            <label>Nome completo</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div className="auth-field">
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
            />
          </div>

          <div className="auth-field">
            <label>Telefone</label>
            <input
              type="text"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              placeholder="(11) 99999-0000"
            />
          </div>

          <div className="auth-field">
            <label>Data de nascimento</label>
            <input
              type="text"
              placeholder="dd/mm/yyyy"
              value={dataNasc}
              onChange={(e) => {
                let value = e.target.value;
                value = value.replace(/\D/g, "");

                if (value.length > 2) value = value.replace(/(\d{2})(\d)/, "$1/$2");
                if (value.length > 5) value = value.replace(/(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");

                setDataNasc(value.slice(0, 10));
              }}
              maxLength={10}
            />
          </div>

          <div className="auth-field">
            <label>Endereço completo</label>
            <input
              type="text"
              value={endereco}
              onChange={e => setEndereco(e.target.value)}
              placeholder="Rua, número, bairro, cidade"
            />
          </div>

          {erro && <p style={{color:'#b91c1c', fontSize:'0.8rem'}}>{erro}</p>}

          <div className="auth-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Processando..." : "Continuar para documentos →"}
            </button>
          </div>
        </form>

        {sucesso && (
          <div className="success-box fade-in">
            <strong>Dados enviados!</strong>
            <p>Redirecionando para o envio de documentos…</p>
          </div>
        )}

        <div className="auth-footer">
          <span>Já é aluno? </span>
          <Link to="/login">Ir para login</Link>
        </div>

      </div>
    </div>
  )
}
