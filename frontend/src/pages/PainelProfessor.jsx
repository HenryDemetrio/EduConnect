import { useEffect, useMemo, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { apiJson } from '../services/api'

// ---------- helpers ----------
const BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:5230'

function absUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

function clamp(n, min, max) {
  if (Number.isNaN(n)) return min
  return Math.min(max, Math.max(min, n))
}

function formatDateLocal(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function labelTipo(tipo) {
  if ((tipo || '').toLowerCase() === 'avaliacao') return 'Prova'
  return 'Tarefa'
}

function labelNumero(tipo, numero) {
  const t = (tipo || '').toLowerCase()
  const n = Number(numero || 0)
  if (!n) return '—'
  if (t === 'avaliacao') return `P${n}`
  return `T${n}`
}

function showErr(e) {
  return (
    e?.payload?.message ||
    e?.message ||
    (e?.status ? `Erro na API (${e.status})` : 'Erro na API')
  )
}

export default function PainelProfessor() {
  const { theme } = useTheme()
  const { me } = useAuth()

  // dropdowns (Turma -> Disciplina)
  const [loadingTD, setLoadingTD] = useState(true)
  const [turmasDisciplinas, setTurmasDisciplinas] = useState([]) // /professores/me/turmas

  const turmas = useMemo(() => {
    const map = new Map()
    for (const x of turmasDisciplinas) {
      if (!map.has(x.turmaId)) {
        map.set(x.turmaId, { turmaId: x.turmaId, turmaNome: x.turmaNome, turmaCodigo: x.turmaCodigo })
      }
    }
    return Array.from(map.values())
  }, [turmasDisciplinas])

  const [selectedTurmaId, setSelectedTurmaId] = useState(null)
  const disciplinasDaTurma = useMemo(() => {
    if (!selectedTurmaId) return []
    return turmasDisciplinas.filter((x) => x.turmaId === selectedTurmaId)
  }, [turmasDisciplinas, selectedTurmaId])

  const [selectedTdId, setSelectedTdId] = useState(null)

  const selected = useMemo(() => {
    return turmasDisciplinas.find((x) => x.turmaDisciplinaId === selectedTdId) || null
  }, [turmasDisciplinas, selectedTdId])

  // alunos da turma (pra fechar boletim)
  const [loadingAlunos, setLoadingAlunos] = useState(false)
  const [alunos, setAlunos] = useState([]) // /turmas/{turmaId}/alunos

  // tarefas (P1/P2/P3 e T1/T2/T3)
  const [loadingTarefas, setLoadingTarefas] = useState(false)
  const [tarefas, setTarefas] = useState([]) // /turma-disciplinas/{tdId}/tarefas

  // expand entregas por tarefa
  const [expandedTarefaId, setExpandedTarefaId] = useState(null)
  const [loadingEntregas, setLoadingEntregas] = useState(false)
  const [entregas, setEntregas] = useState([])

  // criar tarefa (sem peso, sem notaMax)
  const [creating, setCreating] = useState(false)
  const [tipo, setTipo] = useState('Avaliacao')
  const [numero, setNumero] = useState(1)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dataEntrega, setDataEntrega] = useState('')

  // upload enunciado (PDF)
  const [uploadingEnunciadoId, setUploadingEnunciadoId] = useState(null)

  // corrigir entrega
  const [modalEntregaOpen, setModalEntregaOpen] = useState(false)
  const [modalEntrega, setModalEntrega] = useState(null)
  const [notaEntrega, setNotaEntrega] = useState('')
  const [feedbackEntrega, setFeedbackEntrega] = useState('')
  const [savingEntrega, setSavingEntrega] = useState(false)

  // fechar boletim
  const [modalFecharOpen, setModalFecharOpen] = useState(false)
  const [modalAluno, setModalAluno] = useState(null)
  const [freq, setFreq] = useState('')
  const [closing, setClosing] = useState(false)
  const [resultadoFechamento, setResultadoFechamento] = useState(null)

  // ranking (top alunos)
  const [loadingRanking, setLoadingRanking] = useState(false)
  const [ranking, setRanking] = useState([]) // /avaliacoes/resumo?turmaId=...

  // toast
  const [toast, setToast] = useState(null)
  function showToast(type, text) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 2800)
  }

  // ----------- load TurmasDisciplinas do professor -----------
  useEffect(() => {
    let alive = true
    async function load() {
      try {
        setLoadingTD(true)
        const data = await apiJson('/professores/me/turmas')
        if (!alive) return
        const list = Array.isArray(data) ? data : []
        setTurmasDisciplinas(list)

        if (list.length) {
          const firstTurmaId = list[0].turmaId
          setSelectedTurmaId(firstTurmaId)

          const firstTd = list.find((x) => x.turmaId === firstTurmaId)
          setSelectedTdId(firstTd?.turmaDisciplinaId ?? null)
        } else {
          setSelectedTurmaId(null)
          setSelectedTdId(null)
        }
      } catch {
        if (!alive) return
        setTurmasDisciplinas([])
        setSelectedTurmaId(null)
        setSelectedTdId(null)
      } finally {
        if (!alive) return
        setLoadingTD(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  // se mudou turma, “reseta” disciplina para a primeira da turma
  useEffect(() => {
    if (!selectedTurmaId) {
      setSelectedTdId(null)
      return
    }
    const first = turmasDisciplinas.find((x) => x.turmaId === selectedTurmaId)
    if (first) setSelectedTdId(first.turmaDisciplinaId)
  }, [selectedTurmaId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ----------- load alunos da turma selecionada -----------
  useEffect(() => {
    let alive = true
    async function loadAlunos() {
      if (!selected?.turmaId) {
        setAlunos([])
        return
      }
      try {
        setLoadingAlunos(true)
        const data = await apiJson(`/turmas/${selected.turmaId}/alunos`)
        if (!alive) return
        setAlunos(Array.isArray(data) ? data : [])
      } catch {
        if (!alive) return
        setAlunos([])
      } finally {
        if (!alive) return
        setLoadingAlunos(false)
      }
    }
    loadAlunos()
    return () => { alive = false }
  }, [selected?.turmaId])

  // ----------- ranking da turma (top por média) -----------
  async function refreshRanking(turmaId = selected?.turmaId) {
    if (!turmaId) {
      setRanking([])
      return
    }
    setLoadingRanking(true)
    try {
      // endpoint existe no back (você já usou no dashboard): /avaliacoes/resumo?turmaId=...
      const data = await apiJson(`/avaliacoes/resumo?turmaId=${turmaId}`)
      const list = Array.isArray(data) ? data : []
      // “resumo” pode ser por disciplina; aqui a gente só usa como widget visual (top por mediaNota)
      const top = [...list]
        .filter(x => typeof x.mediaNota === 'number' || typeof x.mediaNota === 'string')
        .map(x => ({ ...x, mediaNota: Number(x.mediaNota) }))
        .sort((a, b) => (b.mediaNota ?? 0) - (a.mediaNota ?? 0))
        .slice(0, 5)
      setRanking(top)
    } catch {
      setRanking([])
    } finally {
      setLoadingRanking(false)
    }
  }

  useEffect(() => {
    refreshRanking()
  }, [selected?.turmaId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ----------- load tarefas da TurmaDisciplina -----------
  async function refreshTarefas(tdId = selected?.turmaDisciplinaId) {
    if (!tdId) {
      setTarefas([])
      return
    }
    setLoadingTarefas(true)
    try {
      const data = await apiJson(`/turma-disciplinas/${tdId}/tarefas`)
      setTarefas(Array.isArray(data) ? data : [])
    } catch (e) {
      setTarefas([])
      showToast('error', showErr(e))
    } finally {
      setLoadingTarefas(false)
    }
  }

  useEffect(() => {
    setExpandedTarefaId(null)
    setEntregas([])
    refreshTarefas()
  }, [selected?.turmaDisciplinaId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ----------- entregas por tarefa -----------
  async function toggleEntregas(tarefaId) {
    if (!tarefaId) return
    if (expandedTarefaId === tarefaId) {
      setExpandedTarefaId(null)
      setEntregas([])
      return
    }
    setExpandedTarefaId(tarefaId)
    setLoadingEntregas(true)
    try {
      const data = await apiJson(`/tarefas/${tarefaId}/entregas`)
      setEntregas(Array.isArray(data) ? data : [])
    } catch (e) {
      setEntregas([])
      showToast('error', showErr(e))
    } finally {
      setLoadingEntregas(false)
    }
  }

  // ----------- criar prova/tarefa (P1/P2/P3, T1/T2/T3) -----------
  async function criarTarefa() {
    if (!selected?.turmaDisciplinaId) return

    const nNumero = clamp(Number(numero), 1, 3)

    if (!titulo.trim()) {
      showToast('error', 'Título é obrigatório.')
      return
    }
    if (!dataEntrega) {
      showToast('error', 'Data de entrega é obrigatória.')
      return
    }

    try {
      setCreating(true)
      await apiJson('/tarefas', 'POST', {
        turmaDisciplinaId: selected.turmaDisciplinaId,
        tipo,
        numero: nNumero,
        titulo: titulo.trim(),
        descricao: descricao?.trim() || null,
        dataEntrega,
      })

      showToast('success', 'Atividade criada. Agora envie o PDF do enunciado para publicar.')
      setTitulo('')
      setDescricao('')
      setDataEntrega('')
      await refreshTarefas()
    } catch (e) {
      showToast('error', showErr(e))
    } finally {
      setCreating(false)
    }
  }

  // ----------- upload enunciado PDF (publica a atividade) -----------
  async function uploadEnunciado(tarefaId, file) {
    if (!tarefaId || !file) return

    if (file.type !== 'application/pdf') {
      showToast('error', 'Somente PDF é permitido.')
      return
    }

    const fd = new FormData()
    fd.append('arquivo', file)

    try {
      setUploadingEnunciadoId(tarefaId)
      const token = localStorage.getItem('token')
      const resp = await fetch(`${BASE_URL}/tarefas/${tarefaId}/enunciado`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })

      if (!resp.ok) {
        let payload = null
        try { payload = await resp.json() } catch {}
        throw { status: resp.status, payload }
      }

      showToast('success', 'Enunciado enviado. Atividade publicada!')
      await refreshTarefas()
    } catch (e) {
      showToast('error', showErr(e))
    } finally {
      setUploadingEnunciadoId(null)
    }
  }

  // ----------- corrigir entrega -----------
  function openCorrigir(entrega) {
    setModalEntrega(entrega)
    setNotaEntrega(entrega?.nota != null ? String(entrega.nota) : '')
    setFeedbackEntrega(entrega?.feedbackProfessor || '')
    setModalEntregaOpen(true)
  }

  function closeCorrigir() {
    setModalEntregaOpen(false)
    setModalEntrega(null)
    setNotaEntrega('')
    setFeedbackEntrega('')
  }

  async function salvarCorrecao() {
    if (!modalEntrega?.id) return

    const n = clamp(Number(String(notaEntrega).replace(',', '.')), 0, 10)
    if (Number.isNaN(n)) {
      showToast('error', 'Nota inválida.')
      return
    }

    try {
      setSavingEntrega(true)
      await apiJson(`/entregas/${modalEntrega.id}/avaliar`, 'PUT', {
        nota: n,
        feedbackProfessor: feedbackEntrega?.trim() || null,
      })
      showToast('success', 'Entrega corrigida.')
      closeCorrigir()
      if (expandedTarefaId) {
        await toggleEntregas(expandedTarefaId) // fecha
        await toggleEntregas(expandedTarefaId) // abre
      }
    } catch (e) {
      showToast('error', showErr(e))
    } finally {
      setSavingEntrega(false)
    }
  }

  // ----------- fechar boletim (por aluno + td) -----------
  function openFechar(aluno) {
    setModalAluno(aluno)
    setFreq('')
    setResultadoFechamento(null)
    setModalFecharOpen(true)
  }

  function closeFechar() {
    setModalFecharOpen(false)
    setModalAluno(null)
    setFreq('')
    setResultadoFechamento(null)
  }

  async function fecharBoletim() {
    if (!modalAluno?.alunoId || !selected?.turmaDisciplinaId) return
    const f = clamp(Number(String(freq).replace(',', '.')), 0, 100)
    if (Number.isNaN(f)) {
      showToast('error', 'Frequência inválida.')
      return
    }

    try {
      setClosing(true)
      const resp = await apiJson('/avaliacoes/fechar', 'POST', {
        alunoId: modalAluno.alunoId,
        turmaDisciplinaId: selected.turmaDisciplinaId,
        frequencia: f,
      })
      setResultadoFechamento(resp || null)
      showToast('success', 'Boletim fechado/calculado.')
      await refreshRanking()
    } catch (e) {
      showToast('error', showErr(e))
    } finally {
      setClosing(false)
    }
  }

  // ----------- UI derivadas -----------
  const tarefasOrdenadas = useMemo(() => {
    const list = Array.isArray(tarefas) ? [...tarefas] : []
    return list.sort((a, b) => {
      const ta = (a.tipo || '').toLowerCase()
      const tb = (b.tipo || '').toLowerCase()
      const wa = ta === 'avaliacao' ? 0 : 1
      const wb = tb === 'avaliacao' ? 0 : 1
      if (wa !== wb) return wa - wb
      return Number(a.numero || 0) - Number(b.numero || 0)
    })
  }, [tarefas])

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

      <main className="dashboard-main">
        <div style={{ marginBottom: 14 }}>
          <h1 className="dashboard-title" style={{ marginBottom: 6 }}>Painel do professor</h1>
          <p className="dashboard-subtitle">
            Provas/Tarefas por <strong>Tipo + Número</strong> com PDF obrigatório (enunciado e resposta).
          </p>
        </div>

        <section className="panel teacher-grid">
          {/* COLUNA ESQUERDA */}
          <div className="teacher-main-column">
            <div className="teacher-card">
              <h2 className="panel-title">{me?.nome || 'Professor'}</h2>

              <p className="panel-subtitle" style={{ marginTop: 4 }}>
                {loadingTD ? 'Carregando suas turmas...' : selected ? (
                  <>
                    <strong>{selected.disciplinaNome}</strong> · {selected.turmaNome} ({selected.turmaCodigo})
                  </>
                ) : (
                  'Você ainda não possui turmas vinculadas.'
                )}
              </p>

              <div className="disciplina-row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 220 }}>
                  <label className="teacher-label">Turma</label>
                  <select
                    className="disciplina-select"
                    value={selectedTurmaId ?? ''}
                    onChange={(e) => setSelectedTurmaId(Number(e.target.value))}
                    disabled={loadingTD || turmas.length === 0}
                  >
                    {turmas.map((t) => (
                      <option key={t.turmaId} value={t.turmaId}>
                        {t.turmaNome} ({t.turmaCodigo})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ minWidth: 260 }}>
                  <label className="teacher-label">Disciplina</label>
                  <select
                    className="disciplina-select"
                    value={selectedTdId ?? ''}
                    onChange={(e) => setSelectedTdId(Number(e.target.value))}
                    disabled={loadingTD || disciplinasDaTurma.length === 0}
                  >
                    {disciplinasDaTurma.map((td) => (
                      <option key={td.turmaDisciplinaId} value={td.turmaDisciplinaId}>
                        {td.disciplinaNome}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    refreshTarefas()
                    refreshRanking()
                  }}
                  disabled={!selected?.turmaDisciplinaId}
                  style={{ height: 42, alignSelf: 'end' }}
                >
                  Atualizar
                </button>
              </div>
            </div>

            {/* CRIAR ATIVIDADE */}
            <div className="teacher-card">
              <h3 className="panel-title">Criar atividade (Prova/Tarefa)</h3>
              <p className="panel-subtitle" style={{ marginTop: 4 }}>
                Peso e nota máxima são fixos: <strong>nota 0–10</strong> e cálculo <strong>70/30</strong> no fechamento.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '180px 180px 1fr', gap: 10, marginTop: 10 }}>
                <div>
                  <label className="teacher-label">Tipo</label>
                  <select
                    className="disciplina-select"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    disabled={!selected?.turmaDisciplinaId || creating}
                  >
                    <option value="Avaliacao">Prova</option>
                    <option value="Tarefa">Tarefa</option>
                  </select>
                </div>

                <div>
                  <label className="teacher-label">Número</label>
                  <select
                    className="disciplina-select"
                    value={numero}
                    onChange={(e) => setNumero(Number(e.target.value))}
                    disabled={!selected?.turmaDisciplinaId || creating}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </div>

                <div>
                  <label className="teacher-label">Título</label>
                  <input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Prova Python - P1"
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
                    disabled={!selected?.turmaDisciplinaId || creating}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 10, marginTop: 10 }}>
                <div>
                  <label className="teacher-label">Descrição (opcional)</label>
                  <input
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Instruções rápidas..."
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
                    disabled={!selected?.turmaDisciplinaId || creating}
                  />
                </div>

                <div>
                  <label className="teacher-label">Data entrega</label>
                  <input
                    type="datetime-local"
                    value={dataEntrega}
                    onChange={(e) => setDataEntrega(e.target.value)}
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
                    disabled={!selected?.turmaDisciplinaId || creating}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={criarTarefa}
                  disabled={!selected?.turmaDisciplinaId || creating}
                >
                  {creating ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </div>

            {/* LISTA DE ATIVIDADES */}
            <div className="teacher-card">
              <h3 className="panel-title">Atividades da disciplina</h3>
              <p className="panel-subtitle" style={{ marginTop: 4 }}>
                Envie o <strong>PDF do enunciado</strong> para publicar. Depois acompanhe entregas e corrija.
              </p>

              {loadingTarefas ? (
                <p className="panel-subtitle">Carregando...</p>
              ) : tarefasOrdenadas.length === 0 ? (
                <p className="panel-subtitle">Nenhuma atividade criada ainda.</p>
              ) : (
                <table className="list-table" style={{ marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>Código</th>
                      <th>Título</th>
                      <th>Entrega</th>
                      <th style={{ width: 170 }}>Status</th>
                      <th style={{ width: 210 }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tarefasOrdenadas.map((t) => {
                      const code = `${labelNumero(t.tipo, t.numero)} · ${labelTipo(t.tipo)}`
                      const publicado = !!t.enunciadoUrl
                      return (
                        <tr key={t.id}>
                          <td>{code}</td>
                          <td>
                            <strong>{t.titulo}</strong>
                            <div style={{ opacity: 0.85, marginTop: 2 }}>
                              {t.descricao || '—'}
                            </div>
                          </td>
                          <td>{t.dataEntrega ? new Date(t.dataEntrega).toLocaleString('pt-BR') : '—'}</td>
                          <td>{publicado ? 'Publicado' : 'Aguardando PDF'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {t.enunciadoUrl ? (
                                <a className="btn-secondary" href={absUrl(t.enunciadoUrl)} target="_blank" rel="noreferrer">
                                  Ver enunciado
                                </a>
                              ) : null}

                              <label className="btn-secondary" style={{ cursor: uploadingEnunciadoId === t.id ? 'not-allowed' : 'pointer' }}>
                                {uploadingEnunciadoId === t.id ? 'Enviando...' : (publicado ? 'Trocar PDF' : 'Enviar PDF')}
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  style={{ display: 'none' }}
                                  disabled={uploadingEnunciadoId === t.id}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    e.target.value = ''
                                    if (file) uploadEnunciado(t.id, file)
                                  }}
                                />
                              </label>

                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => toggleEntregas(t.id)}
                              >
                                {expandedTarefaId === t.id ? 'Fechar entregas' : 'Ver entregas'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              {/* ENTREGAS EXPANDIDAS */}
              {expandedTarefaId && (
                <div style={{ marginTop: 14 }}>
                  <h4 style={{ margin: 0 }}>Entregas</h4>
                  <p className="panel-subtitle" style={{ marginTop: 4 }}>
                    {loadingEntregas ? 'Carregando...' : 'Clique em “Corrigir” para lançar nota e feedback.'}
                  </p>

                  {!loadingEntregas && entregas.length === 0 ? (
                    <p className="panel-subtitle">Sem entregas ainda.</p>
                  ) : (
                    <table className="list-table" style={{ marginTop: 10 }}>
                      <thead>
                        <tr>
                          <th>Aluno</th>
                          <th style={{ width: 120 }}>Status</th>
                          <th style={{ width: 120 }}>Nota</th>
                          <th style={{ width: 220 }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entregas.map((e) => {
                          const hasNota = e.nota != null
                          const alunoLabel = e.alunoNome || e.nomeAluno || e.aluno?.nome || `Aluno #${e.alunoId}`
                          const arquivoUrl = e.arquivoUrl || e.arquivoPath || e.arquivoUrlPublica || null
                          return (
                            <tr key={e.id}>
                              <td>
                                <strong>{alunoLabel}</strong>
                                <div style={{ opacity: 0.85, marginTop: 2 }}>
                                  Enviado em: {formatDateLocal(e.enviadoEm || e.criadoEm || e.createdAt)}
                                </div>
                              </td>
                              <td>{hasNota ? 'Corrigido' : 'Pendente'}</td>
                              <td>{hasNota ? Number(e.nota).toFixed(2) : '—'}</td>
                              <td>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  {arquivoUrl ? (
                                    <a className="btn-secondary" href={absUrl(arquivoUrl)} target="_blank" rel="noreferrer">
                                      Ver PDF
                                    </a>
                                  ) : (
                                    <span style={{ opacity: 0.8 }}>Sem arquivo</span>
                                  )}

                                  <button type="button" className="btn-primary" onClick={() => openCorrigir(e)}>
                                    Corrigir
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* FECHAR BOLETIM */}
            <div className="teacher-card">
              <h3 className="panel-title">Fechar boletim (por aluno)</h3>
              <p className="panel-subtitle" style={{ marginTop: 4 }}>
                Antes de gerar deve definir a <strong>frequência</strong> do aluno. O sistema valida completude e aplica a regra automaticamente.
              </p>

              {loadingAlunos ? (
                <p className="panel-subtitle">Carregando alunos...</p>
              ) : alunos.length === 0 ? (
                <p className="panel-subtitle">Sem alunos (ou você não tem turma selecionada).</p>
              ) : (
                <table className="list-table" style={{ marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>RA</th>
                      <th style={{ width: 180 }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunos.map((a) => (
                      <tr key={a.alunoId}>
                        <td>{a.nome}</td>
                        <td>{a.ra}</td>
                        <td>
                          <button type="button" className="btn-secondary" onClick={() => openFechar(a)}>
                            Gerar Boletim
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA */}
          <aside className="teacher-aside">
            {/* Regra fixa */}
            <div className="teacher-card">
              <h3 className="panel-title">Regra de negócio fixa</h3>
              <p className="panel-subtitle" style={{ marginTop: 6, opacity: 0.9 }}>
                O professor apenas cria/corrige atividades e informa frequência no fechamento.
              </p>

              <div style={{ marginTop: 10, opacity: 0.9 }}>
                <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                  <li><strong>2 provas</strong>: P1 e P2</li>
                  <li><strong>3 tarefas</strong>: T1, T2 e T3</li>
                  <li><strong>Recuperação</strong>: P3 (somente se média &lt; 6)</li>
                  <li><strong>Peso</strong>: Provas 70% + Tarefas 30%</li>
                  <li><strong>Frequência mínima</strong>: 75%</li>
                  <li><strong>Aprovação</strong>: média final ≥ 6</li>
                </ul>
              </div>
            </div>

            {/* Ranking */}
            <div className="teacher-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <h3 className="panel-title" style={{ margin: 0 }}>Top (turma)</h3>
                <button type="button" className="btn-secondary" onClick={() => refreshRanking()} disabled={!selected?.turmaId || loadingRanking}>
                  {loadingRanking ? '...' : 'Atualizar'}
                </button>
              </div>

              <p className="panel-subtitle" style={{ marginTop: 6 }}>
                Visual rápido das melhores <strong>médias</strong> já fechadas (referência para você acompanhar evolução).
              </p>

              {loadingRanking ? (
                <p className="panel-subtitle">Carregando ranking...</p>
              ) : ranking.length === 0 ? (
                <p className="panel-subtitle">Sem dados ainda. Feche alguns boletins pra aparecer aqui.</p>
              ) : (
                <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                  {ranking.map((r, idx) => (
                    <div
                      key={`${r.disciplinaId ?? idx}-${idx}`}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        border: '1px solid rgba(148,163,184,0.25)',
                        background: theme === 'dark' ? 'rgba(2,6,23,0.35)' : 'rgba(255,255,255,0.7)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                        <strong style={{ fontSize: 13, opacity: 0.95 }}>{r.disciplinaNome || 'Disciplina'}</strong>
                        <span style={{ fontWeight: 700 }}>{Number(r.mediaNota ?? 0).toFixed(1)}</span>
                      </div>
                      <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
                        Total de registros: {r.total ?? '—'}
                      </div>

                      {/* barzinha */}
                      <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: theme === 'dark' ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.25)' }}>
                        <div
                          style={{
                            width: `${clamp((Number(r.mediaNota ?? 0) / 10) * 100, 0, 100)}%`,
                            height: 8,
                            borderRadius: 999,
                            background: 'rgba(239,68,68,0.85)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </section>
      </main>

      {/* MODAL CORRIGIR */}
      {modalEntregaOpen && modalEntrega && (
        <div
          onClick={closeCorrigir}
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
                <h3 style={{ margin: 0 }}>Corrigir entrega</h3>
                <div style={{ opacity: 0.85, marginTop: 4 }}>
                  ID: {modalEntrega.id}
                </div>
              </div>

              <button type="button" className="btn-secondary" onClick={closeCorrigir} disabled={savingEntrega}>
                Fechar
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginTop: 14 }}>
              <div>
                <label className="teacher-label">Nota (0 a 10)</label>
                <input
                  value={notaEntrega}
                  onChange={(e) => setNotaEntrega(e.target.value)}
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
                  disabled={savingEntrega}
                />
              </div>

              <div>
                <label className="teacher-label">Feedback (opcional)</label>
                <input
                  value={feedbackEntrega}
                  onChange={(e) => setFeedbackEntrega(e.target.value)}
                  placeholder="Comentário para o aluno..."
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
                  disabled={savingEntrega}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button type="button" className="btn-primary" onClick={salvarCorrecao} disabled={savingEntrega}>
                {savingEntrega ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FECHAR BOLETIM */}
      {modalFecharOpen && modalAluno && (
        <div
          onClick={closeFechar}
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
              width: 'min(760px, 100%)',
              borderRadius: 18,
              background: theme === 'dark' ? 'rgba(2,6,23,0.92)' : '#fff',
              border: '1px solid rgba(148,163,184,0.2)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}></h3>
                <div style={{ opacity: 0.85, marginTop: 4 }}>
                  <strong>{modalAluno.nome}</strong> · RA {modalAluno.ra}
                </div>
                <div style={{ opacity: 0.8, marginTop: 4 }}>
                  {selected?.turmaNome} · {selected?.disciplinaNome}
                </div>
              </div>

              <button type="button" className="btn-secondary" onClick={closeFechar} disabled={closing}>
                Fechar
              </button>
            </div>

            <div style={{ marginTop: 14 }}>
              <label className="teacher-label">Frequência do aluno (0 a 100)</label>
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
                disabled={closing}
              />
            </div>

            {resultadoFechamento && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: '1px solid rgba(148,163,184,0.25)' }}>
                <div><strong>Situação:</strong> {resultadoFechamento.situacao}</div>
                <div style={{ marginTop: 6, opacity: 0.9 }}>
                  <div>P1: {resultadoFechamento.p1 ?? '—'} | P2: {resultadoFechamento.p2 ?? '—'} | P3: {resultadoFechamento.p3 ?? '—'}</div>
                  <div>T1: {resultadoFechamento.t1 ?? '—'} | T2: {resultadoFechamento.t2 ?? '—'} | T3: {resultadoFechamento.t3 ?? '—'}</div>
                  <div>Média final: {resultadoFechamento.mediaFinal ?? '—'} | Pós-rec: {resultadoFechamento.mediaPosRec ?? '—'}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button type="button" className="btn-primary" onClick={fecharBoletim} disabled={closing}>
                {closing ? 'Processando...' : 'Gerar Boletim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
