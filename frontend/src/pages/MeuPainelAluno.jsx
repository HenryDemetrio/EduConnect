import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { apiDownloadPdf, apiJson } from '../services/api'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// ---------------------------------------------------------------------
// MOCK (ainda) para dados acadêmicos/graph (porque o backend gera PDF,
// mas não expõe as notas em JSON pro aluno — por enquanto).
// ---------------------------------------------------------------------
const alunoDemo = {
  nome: 'Aluno',
  ra: 'EC000000',
  email: 'aluno@educonnect.com',
  turma: '—',
  curso: 'Python, SQL, Data Science, Estatística, IA',
  mediaGeral: 8.3,
  frequencia: 96,
  situacao: 'Aprovado',
  notas: {
    Python: 8.7,
    SQL: 7.9,
    'Data Science': 8.9,
    Estatística: 7.5,
    IA: 8.6,
  },
}

// ---------------------------------------------------------------------
// COMPONENTE
// ---------------------------------------------------------------------
export default function MeuPainelAluno() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const { me, logout } = useAuth()

  const [exportando, setExportando] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [notifsLoading, setNotifsLoading] = useState(true)

  // Chart (ainda mock)
  const chartData = useMemo(() => {
    const materias = Object.keys(alunoDemo.notas)
    const valoresNotas = Object.values(alunoDemo.notas)

    return {
      labels: materias,
      datasets: [
        {
          label: 'Nota (0 a 10)',
          data: valoresNotas,
          backgroundColor: 'rgba(225,29,72,0.2)',
          borderColor: 'rgba(225,29,72,1)',
          borderWidth: 2,
          borderRadius: 12,
          maxBarThickness: 40,
        },
      ],
    }
  }, [])

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 10,
          ticks: { stepSize: 2 },
          grid: { display: true, color: 'rgba(148,163,184,0.15)' },
        },
        x: { grid: { display: false } },
      },
      plugins: {
        legend: { display: false },
        title: { display: false },
      },
    }),
    []
  )

  function handleLogout() {
    logout()
    navigate('/login')
  }

  async function handleExportarBoletim() {
    try {
      setExportando(true)
      await apiDownloadPdf('/relatorios/me/boletim', 'boletim.pdf')
    } catch (e) {
      alert('Não foi possível baixar o boletim. Verifique se você está logado como Aluno.')
    } finally {
      setExportando(false)
    }
  }

  // Carrega notificações reais do backend
  useEffect(() => {
    let alive = true

    async function loadNotificacoes() {
      try {
        setNotifsLoading(true)
        const data = await apiJson('/notificacoes/me')

        if (!alive) return
        // backend retorna lista de Notificacao: { titulo, mensagem, criadoEmUtc, lida, ... }
        setNotifs(Array.isArray(data) ? data : [])
      } catch {
        if (!alive) return
        setNotifs([])
      } finally {
        if (!alive) return
        setNotifsLoading(false)
      }
    }

    loadNotificacoes()

    return () => {
      alive = false
    }
  }, [])

  // Nome/email do usuário logado (se /auth/me retornar)
  const nomeHeader = me?.nome || alunoDemo.nome
  const emailHeader = me?.email || alunoDemo.email

  return (
    <div className="aluno-view dashboard-shell">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="dashboard-top-row">
          <img
            className="app-logo"
            src={theme === 'dark' ? '/educonnect-logo-dark.svg' : '/educonnect-logo.svg'}
            alt="Logo EduConnect"
          />

          <div className="dashboard-right">
            <ThemeToggle />

            {/* Nav básica: deixa o aluno ver só o que faz sentido */}
            <nav className="dashboard-nav">
              <Link to="/meu-painel" className="active">Meu painel</Link>
              <Link to="/login">Login</Link>
            </nav>

            <button type="button" className="logout-button" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </div>

        <div className="dashboard-tagline">
          <h1 className="dashboard-title">Meu painel</h1>
          <p className="dashboard-subtitle">
            Visão personalizada do desempenho do aluno, com notas, frequência e notificações.
          </p>
        </div>
      </header>

      {/* MAIN */}
      <main className="student-main">
        <section className="panel student-grid">
          {/* COLUNA ESQUERDA */}
          <div className="student-main-column">
            {/* CARD RESUMO */}
            <div className="student-card">
              <div className="student-header">
                <div>
                  <h2 className="panel-title">{nomeHeader}</h2>
                  <p className="panel-subtitle">
                    {emailHeader}
                    {alunoDemo.ra ? ` · RA ${alunoDemo.ra}` : ''} {alunoDemo.turma ? `· Turma ${alunoDemo.turma}` : ''}
                  </p>
                </div>
                <span className="student-badge">{alunoDemo.situacao}</span>
              </div>

              {/* GRID DE INFORMAÇÕES */}
              <div className="info-grid">
                <div className="info-row">
                  <span className="info-label">Disciplinas</span>
                  <span className="info-value">{alunoDemo.curso}</span>
                </div>

                <div className="info-row">
                  <span className="info-label">Média geral</span>
                  <span className="info-value highlight">{alunoDemo.mediaGeral.toFixed(1)}</span>
                </div>

                <div className="info-row">
                  <span className="info-label">Frequência</span>
                  <span className="info-value">{alunoDemo.frequencia}%</span>
                </div>
              </div>
            </div>

            {/* CARD DO GRÁFICO */}
            <div className="student-card">
              <h3 className="panel-title">Desempenho por matéria</h3>
              <p className="panel-subtitle">Notas nas principais disciplinas da trilha.</p>

              <div className="chart-wrapper">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* AÇÃO */}
            <div className="boletim-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleExportarBoletim}
                disabled={exportando}
              >
                {exportando ? 'Baixando...' : 'Exportar boletim (PDF)'}
              </button>
            </div>
          </div>

          {/* COLUNA DIREITA */}
          <aside className="student-aside">
            <div className="student-card">
              <h3 className="panel-title">Notificações para você</h3>

              {notifsLoading ? (
                <p className="panel-subtitle">Carregando notificações...</p>
              ) : notifs.length === 0 ? (
                <p className="panel-subtitle">Sem notificações no momento.</p>
              ) : (
                <ul className="student-notifications">
                  {notifs.slice(0, 6).map((n) => (
                    <li key={n.id}>
                      <strong>{n.titulo}</strong>
                      <div style={{ opacity: 0.9 }}>{n.mensagem}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="student-card">
              <h3 className="panel-title">Próximos passos</h3>
              <ul className="student-next-steps">
                <li>Conferir o boletim em PDF no botão “Exportar”.</li>
                <li>Acompanhar notificações e calendário do EduConnect.</li>
                <li>Manter frequência acima de 75%.</li>
              </ul>
            </div>
          </aside>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="partners-footer">
        <img src="https://tivit.com/wp-content/themes/tivit-v2/assets/images/logo-tivit-almaviva.svg" alt="Logo TIVIT" />
        <img src="https://cursos.jmarc.com.br/images/Logos/Alura_image.png" alt="Logo Alura" />
        <img src="https://i0.wp.com/innovationweeksjc.com.br/wp-content/uploads/2024/08/Artboard-1.png?fit=800%2C378&ssl=1" alt="Logo FIAP" />
      </footer>
    </div>
  )
}
