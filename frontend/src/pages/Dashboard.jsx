import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import Chart from 'chart.js/auto'

const SUBJECTS = ['Python', 'SQL', 'Data Science', 'Estatística', 'IA']

const STUDENTS = [
  { id: 1, name: 'Ana Souza', class: '1A', grades: { Python: 8.5, SQL: 7.2, 'Data Science': 8.8, Estatística: 7.5, IA: 9.1 } },
  { id: 2, name: 'Bruno Lima', class: '1A', grades: { Python: 6.9, SQL: 7.8, 'Data Science': 7.2, Estatística: 6.5, IA: 7.0 } },
  { id: 3, name: 'Carla Ribeiro', class: '2A', grades: { Python: 9.0, SQL: 8.5, 'Data Science': 9.2, Estatística: 8.0, IA: 9.4 } },
  { id: 4, name: 'Diego Martins', class: '2B', grades: { Python: 5.5, SQL: 6.0, 'Data Science': 6.3, Estatística: 5.8, IA: 6.5 } },
  { id: 5, name: 'Eduarda Nunes', class: '3A', grades: { Python: 7.8, SQL: 8.2, 'Data Science': 7.5, Estatística: 7.9, IA: 8.0 } },
]

const EVENTS = [
  { date: '2025-11-20', title: 'Prova de Python - 1º Ano', type: 'Avaliação' },
  { date: '2025-11-22', title: 'Entrega de projeto SQL', type: 'Entrega' },
  { date: '2025-11-25', title: 'Oficina de IA Generativa', type: 'Evento' },
]

const NOTIFICATIONS = [
  { id: 1, title: 'Prova de Python amanhã', text: 'Turmas 1A e 1B: revisão hoje às 19h na EduConnect.', date: '2025-11-19', audience: 'Alunos', subject: 'Python' },
  { id: 2, title: 'Correção de SQL disponível', text: 'Notas da atividade prática de SQL já estão no sistema.', date: '2025-11-18', audience: 'Professores', subject: 'SQL' },
  { id: 3, title: 'Novo conteúdo de IA', text: 'Publicado módulo “Redes Neurais” em IA Aplicada.', date: '2025-11-17', audience: 'Alunos', subject: 'IA' },
]

function formatDateLabel(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function Dashboard() {
  const { theme } = useTheme()
  const chartCanvasRef = useRef(null)
  const chartInstanceRef = useRef(null)

  const [currentDate, setCurrentDate] = useState(new Date())

  const stats = useMemo(() => {
    const totalStudents = STUDENTS.length
    const mediasAlunos = STUDENTS.map((s) => {
      const values = Object.values(s.grades)
      const media = values.reduce((acc, v) => acc + v, 0) / values.length
      return { ...s, media }
    })
    const mediaGeral = mediasAlunos.reduce((acc, s) => acc + s.media, 0) / mediasAlunos.length
    const aprovados = mediasAlunos.filter((s) => s.media >= 6).length
    const reprovados = mediasAlunos.filter((s) => s.media < 6).length

    const mediaPorMateria = SUBJECTS.map((subject) => {
      const soma = STUDENTS.reduce((acc, st) => acc + st.grades[subject], 0)
      return soma / STUDENTS.length
    })

    return {
      totalStudents,
      mediaGeral: Number(mediaGeral.toFixed(1)),
      aprovados,
      reprovados,
      mediaPorMateria,
    }
  }, [])

  useEffect(() => {
    if (!chartCanvasRef.current) return

    const colors =
      theme === 'dark'
        ? { bg: 'rgba(248, 113, 113, 0.25)', border: '#f97373', grid: '#1f2937', ticks: '#e5e7eb' }
        : { bg: 'rgba(220, 38, 38, 0.18)', border: '#dc2626', grid: '#e5e7eb', ticks: '#111827' }

    const ctx = chartCanvasRef.current.getContext('2d')
    if (chartInstanceRef.current) chartInstanceRef.current.destroy()

    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: SUBJECTS,
        datasets: [{ label: 'Média por matéria', data: stats.mediaPorMateria, backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 2, borderRadius: 6 }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 10, ticks: { stepSize: 2, color: colors.ticks }, grid: { color: colors.grid } },
          x: { ticks: { color: colors.ticks }, grid: { display: false } },
        },
      },
    })

    return () => chartInstanceRef.current?.destroy()
  }, [theme, stats.mediaPorMateria])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = new Date(year, month, 1).getDay()

  const calendarCells = []
  for (let i = 0; i < firstWeekday; i++) calendarCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d)

  function goToPrevMonth() {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() - 1)
      return d
    })
  }

  function goToNextMonth() {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + 1)
      return d
    })
  }

  const visibleEvents = useMemo(
    () => EVENTS.filter((ev) => {
      const d = new Date(ev.date)
      return d.getFullYear() === year && d.getMonth() === month
    }),
    [year, month],
  )

  return (
    <div className="dashboard-shell">
      <div className="dashboard-tagline">
        <h1 className="dashboard-title">Painel Acadêmico</h1>
        <p className="dashboard-subtitle">Visão geral das turmas e do desempenho em Python, SQL, IA e mais.</p>
      </div>

      <main className="dashboard-main">
        <section className="dashboard-left">
          <div className="summary-grid">
            <div className="summary-card">
              <span className="summary-label">Alunos ativos</span>
              <span className="summary-value">{stats.totalStudents}</span>
              <span className="summary-chip">Python, SQL, IA e mais</span>
            </div>

            <div className="summary-card">
              <span className="summary-label">Média geral</span>
              <span className="summary-value">{stats.mediaGeral}</span>
              <span className="summary-chip">Meta: &gt; 7,0</span>
            </div>

            <div className="summary-card">
              <span className="summary-label">Aprovação</span>
              <span className="summary-value">{stats.aprovados}/{stats.totalStudents}</span>
              <span className="summary-chip">
                {stats.reprovados === 0 ? 'Nenhuma reprovação' : `${stats.reprovados} reprovações`}
              </span>
            </div>
          </div>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Desempenho por matéria</h2>
                <p className="panel-subtitle">Média das notas (0 a 10) por disciplina.</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <canvas ref={chartCanvasRef} height="140" />
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Calendário de avaliações</h2>
                <p className="panel-subtitle">Provas, entregas e eventos de tecnologia por mês.</p>
              </div>
            </div>

            <div className="calendar-wrapper">
              <div className="calendar-month-row">
                <button type="button" onClick={goToPrevMonth}>‹</button>
                <div className="calendar-month">
                  {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </div>
                <button type="button" onClick={goToNextMonth}>›</button>
              </div>

              <div className="calendar-grid">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d) => (
                  <div key={d} className="calendar-weekday">{d}</div>
                ))}

                {calendarCells.map((day, index) => {
                  if (!day) return <div key={index} className="calendar-day empty" />

                  const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const hasEvent = EVENTS.some((e) => e.date === iso)

                  return (
                    <div key={index} className={`calendar-day${hasEvent ? ' has-event' : ''}`}>
                      <span>{day}</span>
                    </div>
                  )
                })}
              </div>

              <ul className="calendar-events">
                {visibleEvents.length === 0 && (
                  <li className="calendar-event-item">
                    <p className="calendar-event-title">Não há eventos cadastrados neste mês.</p>
                  </li>
                )}

                {visibleEvents.map((ev) => (
                  <li key={ev.date} className="calendar-event-item">
                    <span className="calendar-event-dot" />
                    <div>
                      <p className="calendar-event-title">{ev.title}</p>
                      <p className="calendar-event-meta">{formatDateLabel(ev.date)} • {ev.type}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </section>

        <aside className="dashboard-right-column">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Notificações</h2>
                <p className="panel-subtitle">Comunicados recentes para alunos e professores.</p>
              </div>
            </div>

            <ul className="notif-list">
              {NOTIFICATIONS.map((n) => (
                <li key={n.id} className="notif-item">
                  <p className="notif-title">{n.title}</p>
                  <p className="notif-text">{n.text}</p>
                  <p className="notif-meta">{formatDateLabel(n.date)} • {n.audience} • {n.subject}</p>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </main>
    </div>
  )
}
