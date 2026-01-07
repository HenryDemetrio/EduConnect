import { useEffect, useMemo, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { apiJson } from '../services/api'

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

// ---------- helpers ----------
function clamp(n, min, max) {
  if (Number.isNaN(n)) return min
  return Math.min(max, Math.max(min, n))
}

function calcSituacao(nota, frequencia) {
  if (frequencia < 75) return 'Reprovado por frequência'
  if (nota >= 7) return 'Aprovado'
  if (nota >= 5) return 'Recuperação'
  return 'Reprovado por nota'
}

function formatUtc(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function downloadCsv(filename, rows) {
  const escape = (val) => {
    const s = String(val ?? '')
    if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const content = rows.map((r) => r.map(escape).join(';')).join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function PainelProfessor() {
  const { theme } = useTheme()
  const { me } = useAuth()

  // carregamentos
  const [loadingTurmas, setLoadingTurmas] = useState(true)
  const [loadingAlunos, setLoadingAlunos] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(false)

  // dados principais
  const [turmasDisciplinas, setTurmasDisciplinas] = useState([]) // /professores/me/turmas
  const [selectedTdId, setSelectedTdId] = useState(null)

  const [alunos, setAlunos] = useState([]) // /turmas/{turmaId}/alunos
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('todos') // todos | pendente | aprovado | recuperacao | reprovado

  // status de avaliação por aluno (para a TurmaDisciplina selecionada)
  // { [alunoId]: { id, nota, frequencia, situacao } }
  const [avaliacoesByAluno, setAvaliacoesByAluno] = useState({})

  // modal de lançamento
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAluno, setModalAluno] = useState(null)
  const [nota, setNota] = useState('')
  const [freq, setFreq] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null) // { type, text }

  // extras (wow): eventos/notificações
  const [eventos, setEventos] = useState([])
  const [notifs, setNotifs] = useState([])

  function showToast(type, text) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 2800)
  }

  // ----------- carrega disciplinas/turmas do professor -----------
  useEffect(() => {
    let alive = true

    async function loadTurmas() {
      try {
        setLoadingTurmas(true)
        const data = await apiJson('/professores/me/turmas')

        if (!alive) return
        const list = Array.isArray(data) ? data : []
        setTurmasDisciplinas(list)

        if (list.length > 0) setSelectedTdId(list[0].turmaDisciplinaId)
      } catch {
        if (!alive) return
        setTurmasDisciplinas([])
        setSelectedTdId(null)
      } finally {
        if (!alive) return
        setLoadingTurmas(false)
      }
    }

    loadTurmas()
    return () => {
      alive = false
    }
  }, [])

  const selected = useMemo(() => {
    return turmasDisciplinas.find((x) => x.turmaDisciplinaId === selectedTdId) || null
  }, [turmasDisciplinas, selectedTdId])

  // ----------- carrega alunos da turma selecionada -----------
  useEffect(() => {
    let alive = true

    async function loadAlunos() {
      if (!selected?.turmaId) {
        setAlunos([])
        setAvaliacoesByAluno({})
        return
      }

      try {
        setLoadingAlunos(true)
        const data = await apiJson(`/turmas/${selected.turmaId}/alunos`)

        if (!alive) return
        const list = Array.isArray(data) ? data : []
        setAlunos(list)

        setAvaliacoesByAluno({})
      } catch {
        if (!alive) return
        setAlunos([])
        setAvaliacoesByAluno({})
      } finally {
        if (!alive) return
        setLoadingAlunos(false)
      }
    }

    loadAlunos()
    return () => {
      alive = false
    }
  }, [selected?.turmaId])

  // ----------- carrega status (quem já foi avaliado nessa disciplina) -----------
  useEffect(() => {
    let alive = true

    async function loadStatus() {
      if (!selected?.turmaDisciplinaId || alunos.length === 0) return

      try {
        setLoadingStatus(true)

        const results = await Promise.all(
          alunos.map(async (a) => {
            try {
              const avals = await apiJson(`/avaliacoes/aluno/${a.alunoId}`)
              const list = Array.isArray(avals) ? avals : []
              const match = list.find((x) => x.turmaDisciplinaId === selected.turmaDisciplinaId)
              if (!match) return [a.alunoId, null]
              return [
                a.alunoId,
                {
                  id: match.id,
                  nota: match.nota,
                  frequencia: match.frequencia,
                  situacao: match.situacao,
                },
              ]
            } catch {
              return [a.alunoId, null]
            }
          })
        )

        if (!alive) return

        const map = {}
        for (const [alunoId, val] of results) {
          if (val) map[alunoId] = val
        }
        setAvaliacoesByAluno(map)
      } finally {
        if (!alive) return
        setLoadingStatus(false)
      }
    }

    loadStatus()
    return () => {
      alive = false
    }
  }, [selected?.turmaDisciplinaId, alunos])

  // ----------- extras: eventos e notificações (não quebram se não existir endpoint) -----------
  useEffect(() => {
    let alive = true

    async function loadExtras() {
      try {
        const n = await apiJson('/notificacoes/me')
        if (!alive) return
        setNotifs(Array.isArray(n) ? n : [])
      } catch {
        if (!alive) return
        setNotifs([])
      }

      if (selected?.turmaId) {
        try {
          const e = await apiJson(`/eventos?turmaId=${selected.turmaId}`)
          if (!alive) return
          setEventos(Array.isArray(e) ? e : [])
        } catch {
          if (!alive) return
          setEventos([])
        }
      } else {
        setEventos([])
      }
    }

    loadExtras()
    return () => {
      alive = false
    }
  }, [selected?.turmaId])

  // ----------- filtros/derivados -----------
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()

    return alunos
      .filter((a) => {
        if (!q) return true
        return (
          (a.nome || '').toLowerCase().includes(q) ||
          (a.ra || '').toLowerCase().includes(q) ||
          (a.email || '').toLowerCase().includes(q)
        )
      })
      .filter((a) => {
        const av = avaliacoesByAluno[a.alunoId]
        if (filtro === 'todos') return true
        if (filtro === 'pendente') return !av
        if (!av) return false

        const sit = (av.situacao || '').toLowerCase()
        if (filtro === 'aprovado') return sit.includes('aprovado')
        if (filtro === 'recuperacao') return sit.includes('recuper')
        if (filtro === 'reprovado') return sit.includes('reprov')
        return true
      })
  }, [alunos, search, filtro, avaliacoesByAluno])

  const stats = useMemo(() => {
    const total = alunos.length
    const avaliados = Object.keys(avaliacoesByAluno).length
    const pendentes = total - avaliados

    let somaNota = 0
    let somaFreq = 0
    let count = 0
    let alertas = 0

    for (const alunoIdStr of Object.keys(avaliacoesByAluno)) {
      const av = avaliacoesByAluno[Number(alunoIdStr)]
      if (!av) continue
      somaNota += Number(av.nota || 0)
      somaFreq += Number(av.frequencia || 0)
      count++
      if (Number(av.frequencia) < 75 || Number(av.nota) < 5) alertas++
    }

    const mediaNota = count ? somaNota / count : 0
    const mediaFreq = count ? somaFreq / count : 0

    return { total, avaliados, pendentes, mediaNota, mediaFreq, alertas }
  }, [alunos, avaliacoesByAluno])

  // gráfico (Top 10 por nota)
  const chartData = useMemo(() => {
    const items = alunos
      .map((a) => {
        const av = avaliacoesByAluno[a.alunoId]
        return { nome: a.nome, nota: av?.nota ?? null }
      })
      .filter((x) => x.nota !== null)
      .sort((a, b) => Number(b.nota) - Number(a.nota))
      .slice(0, 10)

    return {
      labels: items.map((x) => x.nome),
      datasets: [
        {
          label: 'Nota (0 a 10)',
          data: items.map((x) => Number(x.nota)),
          backgroundColor: 'rgba(2,132,199,0.25)',
          borderColor: 'rgba(2,132,199,1)',
          borderWidth: 2,
          borderRadius: 12,
          maxBarThickness: 40,
        },
      ],
    }
  }, [alunos, avaliacoesByAluno])

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      scales: {
        y: { beginAtZero: true, max: 10, ticks: { stepSize: 2 } },
        x: { grid: { display: false } },
      },
      plugins: { legend: { display: false }, title: { display: false } },
    }),
    []
  )

  // ----------- modal actions -----------
  function openModal(aluno) {
    setModalAluno(aluno)
    const existing = avaliacoesByAluno[aluno.alunoId]
    setNota(existing ? String(existing.nota) : '')
    setFreq(existing ? String(existing.frequencia) : '')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setModalAluno(null)
    setNota('')
    setFreq('')
  }

  async function salvarAvaliacao({ allowUpdate = true } = {}) {
    if (!modalAluno || !selected?.turmaDisciplinaId) return

    const n = clamp(Number(String(nota).replace(',', '.')), 0, 10)
    const f = clamp(Number(String(freq).replace(',', '.')), 0, 100)

    if (Number.isNaN(n) || Number.isNaN(f)) {
      showToast('error', 'Informe nota e frequência válidas.')
      return
    }

    const existing = avaliacoesByAluno[modalAluno.alunoId]

    try {
      setSaving(true)

      if (existing?.id && allowUpdate) {
        await apiJson(`/avaliacoes/${existing.id}`, 'DELETE')
      }

      const payload = {
        alunoId: modalAluno.alunoId,
        turmaDisciplinaId: selected.turmaDisciplinaId,
        nota: n,
        frequencia: f,
      }

      const created = await apiJson('/avaliacoes', 'POST', payload)

      setAvaliacoesByAluno((prev) => ({
        ...prev,
        [modalAluno.alunoId]: {
          id: created?.id ?? existing?.id ?? 0,
          nota: n,
          frequencia: f,
          situacao: calcSituacao(n, f),
        },
      }))

      showToast('success', 'Avaliação salva com sucesso.')
      closeModal()
    } catch (e) {
      const msg =
        e?.payload?.message ||
        (e?.status === 409
          ? 'Já existe avaliação para este aluno nessa disciplina.'
          : 'Erro ao salvar avaliação.')
      showToast('error', msg)
    } finally {
      setSaving(false)
    }
  }

  async function excluirAvaliacao() {
    if (!modalAluno) return
    const existing = avaliacoesByAluno[modalAluno.alunoId]
    if (!existing?.id) return

    try {
      setSaving(true)
      await apiJson(`/avaliacoes/${existing.id}`, 'DELETE')

      setAvaliacoesByAluno((prev) => {
        const copy = { ...prev }
        delete copy[modalAluno.alunoId]
        return copy
      })

      showToast('success', 'Avaliação removida.')
      closeModal()
    } catch {
      showToast('error', 'Erro ao remover avaliação.')
    } finally {
      setSaving(false)
    }
  }

  function exportarCsv() {
    if (!selected) return

    const header = ['Turma', 'Disciplina', 'Aluno', 'RA', 'Email', 'Nota', 'Frequência', 'Situação']

    const body = alunos.map((a) => {
      const av = avaliacoesByAluno[a.alunoId]
      return [
        selected.turmaNome,
        selected.disciplinaNome,
        a.nome,
        a.ra,
        a.email,
        av ? av.nota : '',
        av ? av.frequencia : '',
        av ? av.situacao : 'Pendente',
      ]
    })

    downloadCsv(
      `educonnect_${selected.turmaCodigo}_${selected.disciplinaNome.replace(/\s+/g, '_')}.csv`,
      [header, ...body]
    )

    showToast('success', 'CSV exportado.')
  }

  const previewSituacao = useMemo(() => {
    const n = clamp(Number(String(nota).replace(',', '.')), 0, 10)
    const f = clamp(Number(String(freq).replace(',', '.')), 0, 100)
    if (String(nota).trim() === '' || String(freq).trim() === '') return '—'
    if (Number.isNaN(n) || Number.isNaN(f)) return '—'
    return calcSituacao(n, f)
  }, [nota, freq])

  return (
    <div className="dashboard-shell">
      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 18,
            right: 18,
            zIndex: 9999,
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid rgba(148,163,184,0.25)',
            background: toast.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            color: theme === 'dark' ? '#f8fafc' : '#111827',
            backdropFilter: 'blur(10px)',
            maxWidth: 360,
          }}
        >
          <strong style={{ display: 'block', marginBottom: 2 }}>
            {toast.type === 'success' ? 'OK' : 'Atenção'}
          </strong>
          <span style={{ opacity: 0.9 }}>{toast.text}</span>
        </div>
      )}

      {/* MAIN (sem header duplicado) */}
      <main className="dashboard-main">
        <div style={{ marginBottom: 14 }}>
          <h1 className="dashboard-title" style={{ marginBottom: 6 }}>Painel do professor</h1>
          <p className="dashboard-subtitle">
            Lançamento rápido de avaliações, métricas automáticas e exportação de planilha.
          </p>
        </div>

        <section className="panel teacher-grid">
          {/* COLUNA ESQUERDA */}
          <div className="teacher-main-column">
            <div className="teacher-card">
              <h2 className="panel-title">{me?.nome || 'Professor'}</h2>

              <p className="panel-subtitle" style={{ marginTop: 4 }}>
                {loadingTurmas ? 'Carregando suas turmas...' : selected ? (
                  <>
                    <strong>{selected.disciplinaNome}</strong> · {selected.turmaNome} ({selected.turmaCodigo})
                  </>
                ) : (
                  'Você ainda não possui turmas vinculadas.'
                )}
              </p>

              <div className="disciplina-row">
                <label className="teacher-label">Turma/Disciplina:</label>
                <select
                  className="disciplina-select"
                  value={selectedTdId ?? ''}
                  onChange={(e) => setSelectedTdId(Number(e.target.value))}
                  disabled={loadingTurmas || turmasDisciplinas.length === 0}
                >
                  {turmasDisciplinas.map((td) => (
                    <option key={td.turmaDisciplinaId} value={td.turmaDisciplinaId}>
                      {td.turmaNome} · {td.disciplinaNome}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={exportarCsv}
                  disabled={!selected || alunos.length === 0}
                  style={{ marginLeft: 10 }}
                >
                  Exportar CSV
                </button>
              </div>

              <div className="summary-grid" style={{ marginTop: 12 }}>
                <div className="summary-card">
                  <p className="summary-label">Alunos</p>
                  <p className="summary-value">{stats.total}</p>
                </div>

                <div className="summary-card">
                  <p className="summary-label">Avaliados</p>
                  <p className="summary-value">{stats.avaliados}</p>
                </div>

                <div className="summary-card">
                  <p className="summary-label">Pendentes</p>
                  <p className="summary-value">{stats.pendentes}</p>
                </div>

                <div className="summary-card">
                  <p className="summary-label">Média nota</p>
                  <p className="summary-value">{stats.avaliados ? stats.mediaNota.toFixed(1) : '—'}</p>
                </div>

                <div className="summary-card">
                  <p className="summary-label">Média freq.</p>
                  <p className="summary-value">{stats.avaliados ? `${stats.mediaFreq.toFixed(0)}%` : '—'}</p>
                </div>

                <div className="summary-card">
                  <p className="summary-label">Alertas</p>
                  <p className="summary-value">{stats.alertas}</p>
                </div>
              </div>
            </div>

            <div className="teacher-card">
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <label className="teacher-label">Buscar aluno</label>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nome, RA ou e-mail..."
                    style={{
                      width: '100%',
                      marginTop: 6,
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: theme === 'dark' ? 'rgba(2,6,23,0.4)' : '#fff',
                      color: theme === 'dark' ? '#f8fafc' : '#111827',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ width: 220 }}>
                  <label className="teacher-label">Filtro</label>
                  <select
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: 6,
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: theme === 'dark' ? 'rgba(2,6,23,0.4)' : '#fff',
                      color: theme === 'dark' ? '#f8fafc' : '#111827',
                      outline: 'none',
                    }}
                  >
                    <option value="todos">Todos</option>
                    <option value="pendente">Pendentes</option>
                    <option value="aprovado">Aprovados</option>
                    <option value="recuperacao">Recuperação</option>
                    <option value="reprovado">Reprovados</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="teacher-card">
              <h3 className="panel-title">Alunos</h3>
              <p className="panel-subtitle" style={{ marginTop: 4 }}>
                {loadingAlunos
                  ? 'Carregando alunos...'
                  : loadingStatus
                  ? 'Atualizando status de avaliações...'
                  : 'Clique em “Avaliar” para lançar nota e frequência.'}
              </p>

              <table className="list-table" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>RA</th>
                    <th>Nota</th>
                    <th>Freq.</th>
                    <th>Situação</th>
                    <th style={{ width: 120 }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ opacity: 0.8 }}>
                        Nenhum aluno encontrado.
                      </td>
                    </tr>
                  ) : (
                    rows.map((a) => {
                      const av = avaliacoesByAluno[a.alunoId]
                      const situacao = av?.situacao || 'Pendente'

                      return (
                        <tr key={a.alunoId}>
                          <td>{a.nome}</td>
                          <td>{a.ra}</td>
                          <td>{av ? Number(av.nota).toFixed(1) : '—'}</td>
                          <td>{av ? `${Number(av.frequencia).toFixed(0)}%` : '—'}</td>
                          <td>{situacao}</td>
                          <td>
                            <button type="button" className="btn-secondary" onClick={() => openModal(a)}>
                              Avaliar
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* COLUNA DIREITA */}
          <aside className="teacher-aside">
            <div className="teacher-card">
              <h3 className="panel-title">Top 10 por nota</h3>
              <p className="panel-subtitle" style={{ marginTop: 4 }}>
                Mostra os melhores desempenhos na disciplina selecionada.
              </p>
              <div className="chart-wrapper" style={{ marginTop: 8 }}>
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>

            <div className="teacher-card">
              <h3 className="panel-title">Próximos eventos</h3>
              {eventos.length === 0 ? (
                <p className="panel-subtitle">Sem eventos (ou endpoint não configurado).</p>
              ) : (
                <ul className="student-notifications">
                  {eventos.slice(0, 5).map((ev) => (
                    <li key={ev.id}>
                      <strong>{ev.titulo}</strong>
                      <div style={{ opacity: 0.9 }}>
                        {formatUtc(ev.inicioUtc)} – {formatUtc(ev.fimUtc)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="teacher-card">
              <h3 className="panel-title">Notificações</h3>
              {notifs.length === 0 ? (
                <p className="panel-subtitle">Sem notificações (ou endpoint não configurado).</p>
              ) : (
                <ul className="student-notifications">
                  {notifs.slice(0, 5).map((n) => (
                    <li key={n.id}>
                      <strong>{n.titulo}</strong>
                      <div style={{ opacity: 0.9 }}>{n.mensagem}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </section>
      </main>

      {/* MODAL */}
      {modalOpen && modalAluno && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2,6,23,0.55)',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(720px, 100%)',
              borderRadius: 18,
              background: theme === 'dark' ? 'rgba(2,6,23,0.92)' : '#fff',
              border: '1px solid rgba(148,163,184,0.2)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Avaliação</h3>
                <div style={{ opacity: 0.85, marginTop: 4 }}>
                  <strong>{modalAluno.nome}</strong> · RA {modalAluno.ra}
                </div>
                <div style={{ opacity: 0.8, marginTop: 4 }}>
                  {selected?.turmaNome} · {selected?.disciplinaNome}
                </div>
              </div>

              <button type="button" className="btn-secondary" onClick={closeModal} disabled={saving}>
                Fechar
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
              <div>
                <label className="teacher-label">Nota (0 a 10)</label>
                <input
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ex: 8.5"
                  style={{
                    width: '100%',
                    marginTop: 6,
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(148,163,184,0.25)',
                    background: theme === 'dark' ? 'rgba(2,6,23,0.4)' : '#fff',
                    color: theme === 'dark' ? '#f8fafc' : '#111827',
                    outline: 'none',
                  }}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="teacher-label">Frequência (0 a 100)</label>
                <input
                  value={freq}
                  onChange={(e) => setFreq(e.target.value)}
                  placeholder="Ex: 92"
                  style={{
                    width: '100%',
                    marginTop: 6,
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(148,163,184,0.25)',
                    background: theme === 'dark' ? 'rgba(2,6,23,0.4)' : '#fff',
                    color: theme === 'dark' ? '#f8fafc' : '#111827',
                    outline: 'none',
                  }}
                  disabled={saving}
                />
              </div>
            </div>

            <div style={{ marginTop: 10, opacity: 0.9 }}>
              <span style={{ fontWeight: 600 }}>Prévia:</span> {previewSituacao}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              {avaliacoesByAluno[modalAluno.alunoId]?.id ? (
                <button type="button" className="btn-secondary" onClick={excluirAvaliacao} disabled={saving}>
                  Excluir
                </button>
              ) : null}

              <button
                type="button"
                className="btn-primary"
                onClick={() => salvarAvaliacao({ allowUpdate: true })}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
