import React, { useEffect, useMemo, useState } from "react";
import { apiJson } from "../services/api";
import { useAuth } from "../context/AuthContext";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatDateBRFromKey(key) {
  // key = yyyy-mm-dd
  if (!key || typeof key !== "string") return "";
  const [y, m, d] = key.split("-");
  if (!y || !m || !d) return key;
  return `${d}/${m}/${y}`;
}

function formatDateTimeBR(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function isoToLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function localInputToUtcIso(localInput) {
  const d = new Date(localInput); // local "YYYY-MM-DDTHH:mm"
  return d.toISOString();
}

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function AgendaAvisos() {
  const { me } = useAuth();

  const isAdmin = me?.role === "Admin";
  const isProfessor = me?.role === "Professor";

  // Turmas (para calendário / filtro de eventos)
  const [turmas, setTurmas] = useState([]);
  const [turmaId, setTurmaId] = useState("");
  const [loadingTurmas, setLoadingTurmas] = useState(false);

  // Turma separada só para Notificações (evita conflito com "all/global")
  const [notifTurmaId, setNotifTurmaId] = useState("");

  const [eventos, setEventos] = useState([]);
  const [loadingEventos, setLoadingEventos] = useState(false);
  const [erroEventos, setErroEventos] = useState("");

  const [notifs, setNotifs] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [erroNotifs, setErroNotifs] = useState("");

  // calendário
  const [cursorMonth, setCursorMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDayKey, setSelectedDayKey] = useState(() => toDateKey(new Date()));

  // modal evento
  const [showEventModal, setShowEventModal] = useState(false);
  const [savingEvento, setSavingEvento] = useState(false);
  const [deletingEvento, setDeletingEvento] = useState(false);

  const [eventoGeral, setEventoGeral] = useState(false);
  const [eventoTitulo, setEventoTitulo] = useState("");
  const [eventoDescricao, setEventoDescricao] = useState("");
  const [eventoInicio, setEventoInicio] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = pad2(now.getMonth() + 1);
    const dd = pad2(now.getDate());
    return `${yyyy}-${mm}-${dd}T09:00`;
  });
  const [eventoFim, setEventoFim] = useState("");
  const [eventoEditando, setEventoEditando] = useState(null);
  const [erroSalvarEvento, setErroSalvarEvento] = useState("");

  // notificações
  const [notifTarget, setNotifTarget] = useState("geral"); // geral | turma | aluno
  const [notifTitulo, setNotifTitulo] = useState("");
  const [notifMensagem, setNotifMensagem] = useState("");
  const [savingNotif, setSavingNotif] = useState(false);

  const [alunosTurma, setAlunosTurma] = useState([]);
  const [alunoId, setAlunoId] = useState("");
  const [loadingAlunosTurma, setLoadingAlunosTurma] = useState(false);

  // ====== LOADERS ======

  async function carregarTurmas() {
    setLoadingTurmas(true);
    try {
      const url = isAdmin ? "/turmas" : (isProfessor ? "/turmas/minhas" : "/turmas");
      const data = await apiJson(url);
      const arr = Array.isArray(data) ? data : [];
      setTurmas(arr);

      // turma do calendário
      if (isAdmin) {
        setTurmaId((prev) => prev || "all");
      } else if (isProfessor) {
        const first = arr[0]?.id ? String(arr[0].id) : "";
        setTurmaId((prev) => prev || first);
      }

      // turma default do form de notificações (sempre real)
      const firstReal = arr[0]?.id ? String(arr[0].id) : "";
      setNotifTurmaId((prev) => prev || firstReal);
    } catch (e) {
      console.error(e);
      setTurmas([]);
      if (isAdmin) setTurmaId("all");
    } finally {
      setLoadingTurmas(false);
    }
  }

  async function carregarEventos() {
    setErroEventos("");
    setLoadingEventos(true);
    try {
      let data = [];

      if (isAdmin && turmaId === "all") {
        data = await apiJson("/eventos");
      } else if (isAdmin && turmaId === "global") {
        const all = await apiJson("/eventos");
        data = (all || []).filter((x) => x.turmaId == null);
      } else {
        const tid = turmaId && turmaId !== "all" && turmaId !== "global" ? Number(turmaId) : null;
        data = tid ? await apiJson(`/eventos?turmaId=${tid}`) : await apiJson("/eventos");
      }

      setEventos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErroEventos("Não foi possível carregar eventos.");
      setEventos([]);
    } finally {
      setLoadingEventos(false);
    }
  }

  async function carregarNotificacoesMine() {
    setErroNotifs("");
    setLoadingNotifs(true);
    try {
      const data = await apiJson("/notificacoes/me");
      const arr = Array.isArray(data) ? data : [];
      arr.sort((a, b) => new Date(b.criadoEmUtc || b.CriadoEmUtc || 0) - new Date(a.criadoEmUtc || a.CriadoEmUtc || 0));
      setNotifs(arr);
    } catch (e) {
      console.error(e);
      setErroNotifs("Não foi possível carregar notificações.");
      setNotifs([]);
    } finally {
      setLoadingNotifs(false);
    }
  }

  function normalizeAluno(a) {
    return {
      alunoId: a?.alunoId ?? a?.AlunoId ?? a?.id ?? a?.Id,
      nome: a?.nome ?? a?.Nome,
      ra: a?.ra ?? a?.RA,
      email: a?.email ?? a?.Email,
    };
  }

  async function carregarAlunosDaTurma(tid) {
    if (!tid) {
      setAlunosTurma([]);
      setAlunoId("");
      return;
    }

    setLoadingAlunosTurma(true);
    try {
      const data = await apiJson(`/turmas/${Number(tid)}/alunos`);
      const arr = Array.isArray(data) ? data : [];
      const norm = arr.map(normalizeAluno).filter(x => x.alunoId != null);

      norm.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

      setAlunosTurma(norm);
      setAlunoId(norm[0]?.alunoId != null ? String(norm[0].alunoId) : "");
    } catch (e) {
      console.error(e);
      setAlunosTurma([]);
      setAlunoId("");
    } finally {
      setLoadingAlunosTurma(false);
    }
  }

  // ====== EFFECTS ======

  useEffect(() => {
    carregarTurmas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!turmaId) return;
    carregarEventos();
    carregarNotificacoesMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaId]);

  useEffect(() => {
    if (notifTarget !== "aluno") return;
    if (!notifTurmaId) return;
    carregarAlunosDaTurma(notifTurmaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifTarget, notifTurmaId]);

  const turmasOptionsCalendar = useMemo(() => {
    const base = (turmas || []).map((t) => ({
      value: String(t.id),
      label: `${t.nome} (${t.codigo})`,
    }));

    if (isAdmin) {
      return [
        { value: "all", label: "Todas" },
        { value: "global", label: "Somente eventos gerais" },
        ...base
      ];
    }
    return base;
  }, [turmas, isAdmin]);

  const turmasOptionsReal = useMemo(() => {
    return (turmas || []).map((t) => ({
      value: String(t.id),
      label: `${t.nome} (${t.codigo})`,
    }));
  }, [turmas]);

  const eventosByDay = useMemo(() => {
    const map = new Map();
    for (const ev of eventos) {
      const d = new Date(ev.inicioUtc);
      const k = toDateKey(d);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(ev);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => new Date(a.inicioUtc) - new Date(b.inicioUtc));
      map.set(k, arr);
    }
    return map;
  }, [eventos]);

  const selectedDayEventos = useMemo(() => {
    return eventosByDay.get(selectedDayKey) || [];
  }, [eventosByDay, selectedDayKey]);

  // ====== EVENTO MODAL ======

  function openNovoEvento() {
    setEventoEditando(null);
    setErroSalvarEvento("");
    setEventoGeral(false);
    setEventoTitulo("");
    setEventoDescricao("");

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = pad2(today.getMonth() + 1);
    const dd = pad2(today.getDate());
    setEventoInicio(`${yyyy}-${mm}-${dd}T09:00`);
    setEventoFim("");
    setShowEventModal(true);
  }

  function openEditarEvento(ev) {
    setEventoEditando(ev);
    setErroSalvarEvento("");
    setEventoGeral(ev.turmaId == null);
    setEventoTitulo(ev.titulo || "");
    setEventoDescricao(ev.descricao || "");
    setEventoInicio(isoToLocalInput(ev.inicioUtc));
    setEventoFim(isoToLocalInput(ev.fimUtc));
    setShowEventModal(true);
  }

  async function salvarEvento(e) {
    e?.preventDefault?.();
    setErroSalvarEvento("");

    if (!eventoTitulo.trim()) return setErroSalvarEvento("Título é obrigatório.");
    if (!eventoInicio) return setErroSalvarEvento("Início é obrigatório.");

    const tid = (!eventoGeral && turmaId && turmaId !== "all" && turmaId !== "global") ? Number(turmaId) : null;
    if (!eventoGeral && !tid) return setErroSalvarEvento("Selecione uma turma (ou marque como evento geral).");

    const payload = {
      titulo: eventoTitulo.trim(),
      descricao: (eventoDescricao || "").trim() || null,
      inicioUtc: localInputToUtcIso(eventoInicio),
      fimUtc: eventoFim ? localInputToUtcIso(eventoFim) : null,
      turmaId: eventoGeral ? null : tid
    };

    setSavingEvento(true);
    try {
      const created = await apiJson("/eventos", { method: "POST", body: payload });

      if (eventoEditando?.id) {
        try {
          await apiJson(`/eventos/${eventoEditando.id}`, { method: "DELETE" });
        } catch {}
      }

      setShowEventModal(false);
      setEventoEditando(null);
      await carregarEventos();

      const dayKey = toDateKey(new Date(created?.inicioUtc || payload.inicioUtc));
      setSelectedDayKey(dayKey);
    } catch (err) {
      console.error(err);
      setErroSalvarEvento("Erro ao salvar evento. Verifique e tente novamente.");
    } finally {
      setSavingEvento(false);
    }
  }

  async function excluirEvento(evId) {
    if (!evId) return;
    if (!confirm("Excluir este evento?")) return;

    setDeletingEvento(true);
    try {
      await apiJson(`/eventos/${evId}`, { method: "DELETE" });
      await carregarEventos();
    } catch (e) {
      console.error(e);
      alert("Não foi possível excluir o evento.");
    } finally {
      setDeletingEvento(false);
    }
  }

  // ====== NOTIFICAÇÕES ======

  function normalizeApiError(err) {
    const status = err?.status;
    const payload = err?.payload;

    const payloadMsg =
      (typeof payload === "string" && payload) ||
      payload?.message ||
      payload?.title ||
      payload?.error ||
      null;

    if (status && payloadMsg) return `(${status}) ${payloadMsg}`;
    if (status) return `(${status}) Erro na API`;
    return "Erro na API";
  }

  async function publicarNotificacao(e) {
    e?.preventDefault?.();
    setErroNotifs("");

    if (!notifTitulo.trim()) return setErroNotifs("Título é obrigatório.");
    if (!notifMensagem.trim()) return setErroNotifs("Mensagem é obrigatória.");

    // geral
    if (notifTarget === "geral") {
      setSavingNotif(true);
      try {
        await apiJson("/notificacoes", {
          method: "POST",
          body: { titulo: notifTitulo.trim(), mensagem: notifMensagem.trim(), usuarioId: null }
        });
        setNotifTitulo("");
        setNotifMensagem("");
        await carregarNotificacoesMine();
      } catch (e2) {
        console.error(e2);
        setErroNotifs(`Erro ao publicar notificação ${normalizeApiError(e2)}`);
      } finally {
        setSavingNotif(false);
      }
      return;
    }

    // turma
    if (notifTarget === "turma") {
      const tid = notifTurmaId ? Number(notifTurmaId) : null;
      if (!tid) return setErroNotifs("Selecione uma turma.");

      setSavingNotif(true);
      try {
        await apiJson(`/notificacoes/turma/${tid}`, {
          method: "POST",
          body: { titulo: notifTitulo.trim(), mensagem: notifMensagem.trim() }
        });
        setNotifTitulo("");
        setNotifMensagem("");
        alert("Notificação enviada para a turma.");
      } catch (e2) {
        console.error(e2);
        setErroNotifs(`Erro ao enviar notificação para a turma ${normalizeApiError(e2)}`);
      } finally {
        setSavingNotif(false);
      }
      return;
    }

    // aluno específico
    if (notifTarget === "aluno") {
      const aid = alunoId ? Number(alunoId) : null;
      if (!aid || Number.isNaN(aid)) return setErroNotifs("Selecione um aluno.");

      setSavingNotif(true);
      try {
        await apiJson(`/notificacoes/aluno/${aid}`, {
          method: "POST",
          body: { titulo: notifTitulo.trim(), mensagem: notifMensagem.trim() }
        });
        setNotifTitulo("");
        setNotifMensagem("");
        alert("Notificação enviada para o aluno.");
      } catch (e2) {
        console.error(e2);
        setErroNotifs(`Erro ao enviar notificação para o aluno ${normalizeApiError(e2)}`);
      } finally {
        setSavingNotif(false);
      }
    }
  }

  async function excluirNotificacao(id) {
    if (!id) return;
    if (!confirm("Excluir esta notificação (do seu feed)?")) return;

    try {
      await apiJson(`/notificacoes/${id}`, { method: "DELETE" });
      await carregarNotificacoesMine();
    } catch (e) {
      console.error(e);
      alert("Não foi possível excluir.");
    }
  }

  // ====== CALENDÁRIO ======

  const calendarDays = useMemo(() => {
    const year = cursorMonth.getFullYear();
    const month = cursorMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDow = first.getDay();
    const daysInMonth = last.getDate();

    const days = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  }, [cursorMonth]);

  const monthLabel = `${MONTHS_PT[cursorMonth.getMonth()]} de ${cursorMonth.getFullYear()}`;

  // ====== UI ======

  const pageWrap = {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "10px 0 18px",
    textAlign: "left",
  };

  const grid = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 380px",
    gap: 14,
    alignItems: "start",
  };

  return (
    <div style={pageWrap}>
      {/* Header padrão do projeto */}
      <div style={{ marginBottom: 14 }}>
        <h1 className="dashboard-title" style={{ marginBottom: 6 }}>
          Agenda & Avisos
        </h1>
        <p className="dashboard-subtitle">
          Eventos e comunicações em um só lugar.
        </p>
      </div>

      <div style={grid}>
        {/* COLUNA ESQUERDA */}
        <div>
          <div className="teacher-card">
            <div className="agenda-toolbar" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div className="form-field" style={{ minWidth: 280 }}>
                  <label>Turma</label>
                  <select
                    value={turmaId}
                    onChange={(e) => setTurmaId(e.target.value)}
                    disabled={loadingTurmas}
                  >
                    {turmasOptionsCalendar.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    className="btn-secondary btn-small btn-inline"
                    onClick={() => setCursorMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                    type="button"
                    title="Mês anterior"
                  >
                    ←
                  </button>

                  <div style={{ fontWeight: 600 }}>{monthLabel}</div>

                  <button
                    className="btn-secondary btn-small btn-inline"
                    onClick={() => setCursorMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                    type="button"
                    title="Próximo mês"
                  >
                    →
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="btn-primary btn-inline"
                  type="button"
                  onClick={openNovoEvento}
                  disabled={savingEvento || deletingEvento}
                >
                  + Novo evento
                </button>

                <button
                  className="btn-secondary btn-small btn-inline"
                  type="button"
                  onClick={carregarEventos}
                  disabled={loadingEventos}
                >
                  Atualizar
                </button>
              </div>
            </div>

            {erroEventos ? <div className="form-error" style={{ marginTop: 10 }}>{erroEventos}</div> : null}

            {/* CALENDÁRIO */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((w) => (
                  <div key={w} style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>
                    {w}
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginTop: 8 }}>
                {calendarDays.map((d, idx) => {
                  if (!d) return <div key={`empty-${idx}`} style={{ height: 44 }} />;

                  const k = toDateKey(d);
                  const dayEvents = eventosByDay.get(k) || [];
                  const count = dayEvents.length;
                  const isSelected = selectedDayKey === k;

                  return (
                    <button
                      type="button"
                      key={k}
                      onClick={() => setSelectedDayKey(k)}
                      style={{
                        height: 44,
                        borderRadius: 12,
                        border: isSelected ? "1px solid rgba(59,130,246,.35)" : "1px solid var(--border)",
                        background: isSelected ? "rgba(59,130,246,.10)" : "var(--card)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 10px",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{d.getDate()}</span>

                      {count > 0 ? (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 999,
                            border: "1px solid var(--border)",
                            color: "var(--muted)",
                            background: "rgba(0,0,0,0.02)",
                          }}
                          title={`${count} evento(s)`}
                        >
                          {count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* EVENTOS DO DIA */}
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 700 }}>Eventos do dia</h3>
                  <div className="panel-subtitle" style={{ marginTop: 4 }}>
                    Selecionado: {formatDateBRFromKey(selectedDayKey)}
                  </div>
                </div>
              </div>

              {loadingEventos ? (
                <div style={{ marginTop: 10 }}>Carregando...</div>
              ) : (
                <div style={{ marginTop: 10 }}>
                  {selectedDayEventos.length === 0 ? (
                    <div className="panel-subtitle">Sem eventos para este dia.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {selectedDayEventos.map((ev) => (
                        <div
                          key={ev.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: 12,
                            border: "1px solid var(--border)",
                            borderRadius: 14,
                            background: "rgba(0,0,0,0.01)"
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700 }}>{ev.titulo}</div>
                            <div className="panel-subtitle" style={{ marginTop: 4 }}>
                              {formatDateTimeBR(ev.inicioUtc)}
                              {ev.fimUtc ? ` — ${formatDateTimeBR(ev.fimUtc)}` : ""}
                            </div>
                            {ev.descricao ? <div style={{ marginTop: 8 }}>{ev.descricao}</div> : null}
                            <div className="panel-subtitle" style={{ marginTop: 8 }}>
                              {ev.turmaId == null
                                ? "Evento geral (todas as turmas)"
                                : `Turma: ${ev.turmaCodigo || ev.turmaNome || ev.turmaId}`}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <button
                              className="btn-secondary btn-small btn-inline"
                              type="button"
                              onClick={() => openEditarEvento(ev)}
                              disabled={deletingEvento}
                            >
                              Editar
                            </button>
                            <button
                              className="btn-secondary btn-small btn-inline"
                              type="button"
                              onClick={() => excluirEvento(ev.id)}
                              disabled={deletingEvento}
                              style={{ borderColor: "rgba(220,38,38,.35)", color: "#dc2626" }}
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div>
          <div className="teacher-card">
            <h3 style={{ marginBottom: 6, fontWeight: 700 }}>Avisos / Notificações</h3>
            <p className="panel-subtitle" style={{ marginBottom: 12 }}>
              Publique comunicações rápidas. O aluno vê no Dashboard.
            </p>

            <form onSubmit={publicarNotificacao} className="form-card">
              <div className="form-field">
                <label>Destino</label>
                <select
                  value={notifTarget}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNotifTarget(v);

                    if ((v === "turma" || v === "aluno") && !notifTurmaId) {
                      const firstReal = turmas[0]?.id ? String(turmas[0].id) : "";
                      if (firstReal) setNotifTurmaId(firstReal);
                    }
                  }}
                >
                  <option value="geral">Geral (todos)</option>
                  <option value="turma">Todos alunos da turma</option>
                  <option value="aluno">Aluno específico</option>
                </select>
              </div>

              {(notifTarget === "turma" || notifTarget === "aluno") ? (
                <div className="form-field">
                  <label>Turma</label>
                  <select
                    value={notifTurmaId}
                    onChange={(e) => setNotifTurmaId(e.target.value)}
                    disabled={loadingTurmas || turmasOptionsReal.length === 0}
                  >
                    {turmasOptionsReal.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              {notifTarget === "aluno" ? (
                <div className="form-field">
                  <label>Aluno</label>
                  <select
                    value={alunoId}
                    onChange={(e) => setAlunoId(e.target.value)}
                    disabled={loadingAlunosTurma || alunosTurma.length === 0}
                  >
                    {alunosTurma.map((a) => (
                      <option key={a.alunoId} value={a.alunoId}>
                        {a.nome} — {a.ra}
                      </option>
                    ))}
                  </select>

                  {loadingAlunosTurma ? (
                    <div className="panel-subtitle">Carregando alunos...</div>
                  ) : alunosTurma.length === 0 ? (
                    <div className="panel-subtitle">Nenhum aluno encontrado nessa turma.</div>
                  ) : null}
                </div>
              ) : null}

              <div className="form-field">
                <label>Título</label>
                <input
                  value={notifTitulo}
                  onChange={(e) => setNotifTitulo(e.target.value)}
                  placeholder="Ex: Mudança de sala / Aviso importante"
                />
              </div>

              <div className="form-field">
                <label>Mensagem</label>
                <textarea
                  value={notifMensagem}
                  onChange={(e) => setNotifMensagem(e.target.value)}
                  placeholder="Escreva um aviso curto e objetivo..."
                  rows={4}
                />
              </div>

              {erroNotifs ? <div className="form-error">{erroNotifs}</div> : null}

              <div className="form-footer" style={{ marginTop: 0 }}>
                <button className="btn-primary btn-inline" type="submit" disabled={savingNotif}>
                  {savingNotif ? "Enviando..." : "Publicar"}
                </button>
              </div>
            </form>
          </div>

          <div className="teacher-card" style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontWeight: 700 }}>Últimas notificações</h3>
              <button
                className="btn-secondary btn-small btn-inline"
                type="button"
                onClick={carregarNotificacoesMine}
                disabled={loadingNotifs}
              >
                Atualizar
              </button>
            </div>

            {loadingNotifs ? <div style={{ marginTop: 10 }}>Carregando...</div> : null}
            {notifs.length === 0 && !loadingNotifs ? (
              <div className="panel-subtitle" style={{ marginTop: 8 }}>
                Sem notificações (ou ainda não publicadas).
              </div>
            ) : null}

            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
              {notifs.slice(0, 8).map((n) => {
                const created = n.criadoEmUtc ?? n.CriadoEmUtc;
                return (
                  <div
                    key={n.id}
                    style={{
                      padding: 12,
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      background: "rgba(0,0,0,0.01)"
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>{n.titulo}</div>
                      <div className="panel-subtitle" style={{ marginTop: 4 }}>
                        {created ? formatDateTimeBR(created) : ""}
                      </div>
                      <div style={{ marginTop: 8 }}>{n.mensagem}</div>
                      <div className="panel-subtitle" style={{ marginTop: 8 }}>
                        {n.usuarioId == null ? "Geral (todos)" : "Direcionada"}
                      </div>
                    </div>

                    <button
                      className="btn-secondary btn-small btn-inline"
                      type="button"
                      onClick={() => excluirNotificacao(n.id)}
                      style={{ borderColor: "rgba(220,38,38,.35)", color: "#dc2626", height: 34 }}
                    >
                      Excluir
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL EVENTO */}
      {showEventModal ? (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target?.classList?.contains("modal-overlay")) setShowEventModal(false);
          }}
        >
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <div className="modal-title">{eventoEditando ? "Editar evento" : "Novo evento"}</div>
                <div className="panel-subtitle">Crie um evento para turma ou geral.</div>
              </div>
              <button className="btn-secondary btn-small btn-inline" type="button" onClick={() => setShowEventModal(false)}>
                Fechar
              </button>
            </div>

            <form onSubmit={salvarEvento} className="form-card" style={{ marginTop: 12 }}>
              <div className="form-field">
                <label>Título</label>
                <input
                  value={eventoTitulo}
                  onChange={(e) => setEventoTitulo(e.target.value)}
                  placeholder="Ex: Prova / Entrega de trabalho"
                />
              </div>

              <div className="form-field">
                <label>Descrição (opcional)</label>
                <textarea
                  value={eventoDescricao}
                  onChange={(e) => setEventoDescricao(e.target.value)}
                  rows={3}
                  placeholder="Detalhes do evento..."
                />
              </div>

              <div className="form-field">
                <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="checkbox" checked={eventoGeral} onChange={(e) => setEventoGeral(e.target.checked)} />
                  Evento geral (todas as turmas)
                </label>
                <div className="panel-subtitle">
                  Se marcado, o evento aparece para todos (TurmaId = null).
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label>Início</label>
                  <input type="datetime-local" value={eventoInicio} onChange={(e) => setEventoInicio(e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Fim (opcional)</label>
                  <input type="datetime-local" value={eventoFim} onChange={(e) => setEventoFim(e.target.value)} />
                </div>
              </div>

              {erroSalvarEvento ? <div className="form-error">{erroSalvarEvento}</div> : null}

              <div className="form-footer">
                <button className="btn-secondary btn-inline" type="button" onClick={() => setShowEventModal(false)}>
                  Cancelar
                </button>
                <button className="btn-primary btn-inline" type="submit" disabled={savingEvento}>
                  {savingEvento ? "Salvando..." : (eventoEditando ? "Salvar alterações" : "Salvar evento")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
