import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { apiJson } from "../services/api";

const EVENT_TYPES = ["Aula", "Avaliação", "Reunião", "Aviso", "Entrega"];

function lsKeyEvents(turmaId) {
  return `educonnect.events.turma.${turmaId}`;
}
function lsKeyNotifs(turmaId) {
  return `educonnect.notifs.turma.${turmaId}`;
}

function safeJsonParse(str, fallback) {
  try {
    const v = JSON.parse(str);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function readLocalList(key) {
  return safeJsonParse(localStorage.getItem(key), []);
}

function writeLocalList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function ymd(date) {
  // retorna YYYY-MM-DD no timezone local
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatPt(dateStrOrIso) {
  if (!dateStrOrIso) return "";
  const d = new Date(dateStrOrIso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}
function weekdayIndex(date) {
  // 0=Dom..6=Sáb
  return date.getDay();
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function inputBaseStyle(theme) {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.25)",
    background: theme === "dark" ? "rgba(2,6,23,0.4)" : "#fff",
    color: theme === "dark" ? "#f8fafc" : "#111827",
    outline: "none",
  };
}

export default function AgendaAvisos() {
  const { theme } = useTheme();
  const { me } = useAuth();

  const role = me?.role || "Aluno";
  const canManage = role === "Admin" || role === "Professor";

  // seleção de turma
  const [loadingTurmas, setLoadingTurmas] = useState(true);
  const [turmas, setTurmas] = useState([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState("");

  // calendário
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(ymd(new Date()));

  // dados
  const [events, setEvents] = useState([]);
  const [notifs, setNotifs] = useState([]);

  // ui
  const [toast, setToast] = useState(null); // {type,text}
  const [modalEventOpen, setModalEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");

  const [notifTitle, setNotifTitle] = useState("");
  const [notifMsg, setNotifMsg] = useState("");

  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 2600);
  }

  // ---------------- Turmas por role ----------------
  useEffect(() => {
    let alive = true;

    async function loadTurmas() {
      setLoadingTurmas(true);
      try {
        let list = [];

        if (role === "Professor") {
          // /professores/me/turmas => vem TurmaDisciplina, então dedup por turmaId
          const td = await apiJson("/professores/me/turmas");
          const arr = Array.isArray(td) ? td : [];
          const map = new Map();
          for (const x of arr) {
            if (!map.has(x.turmaId)) {
              map.set(x.turmaId, {
                turmaId: x.turmaId,
                turmaNome: x.turmaNome,
                turmaCodigo: x.turmaCodigo,
              });
            }
          }
          list = Array.from(map.values());
        } else if (role === "Admin") {
          const t = await apiJson("/turmas");
          const arr = Array.isArray(t) ? t : [];
          list = arr.map((x) => ({
            turmaId: x.id ?? x.turmaId ?? x.turmaID ?? x.turma_id,
            turmaNome: x.nome ?? x.turmaNome ?? x.codigo ?? "Turma",
            turmaCodigo: x.codigo ?? x.turmaCodigo ?? x.nome ?? "",
          }));
        } else {
          // aluno: tenta ser “limpo”, se não houver endpoint, deixa sem seleção
          // (sem quebrar apresentação)
          list = [];
        }

        if (!alive) return;
        setTurmas(list);

        if (list.length > 0) {
          setSelectedTurmaId(String(list[0].turmaId));
        } else {
          setSelectedTurmaId("");
        }
      } catch {
        if (!alive) return;
        setTurmas([]);
        setSelectedTurmaId("");
      } finally {
        if (!alive) return;
        setLoadingTurmas(false);
      }
    }

    loadTurmas();
    return () => {
      alive = false;
    };
  }, [role]);

  const selectedTurma = useMemo(() => {
    return turmas.find((t) => String(t.turmaId) === String(selectedTurmaId)) || null;
  }, [turmas, selectedTurmaId]);

  // ---------------- Load eventos/notifs (API -> fallback localStorage) ----------------
  useEffect(() => {
    let alive = true;

    async function loadData() {
      if (!selectedTurmaId) {
        setEvents([]);
        setNotifs([]);
        return;
      }

      // EVENTS
      try {
        // Se existir no backend um dia: GET /eventos?turmaId=...
        const apiEvents = await apiJson(`/eventos?turmaId=${selectedTurmaId}`);
        if (!alive) return;
        const list = Array.isArray(apiEvents) ? apiEvents : [];
        setEvents(list);
      } catch {
        if (!alive) return;
        const local = readLocalList(lsKeyEvents(selectedTurmaId));
        setEvents(local);
      }

      // NOTIFS
      try {
        // Se existir no backend um dia: GET /notificacoes?turmaId=...
        const apiNotifs = await apiJson(`/notificacoes?turmaId=${selectedTurmaId}`);
        if (!alive) return;
        const list = Array.isArray(apiNotifs) ? apiNotifs : [];
        setNotifs(list);
      } catch {
        if (!alive) return;
        const local = readLocalList(lsKeyNotifs(selectedTurmaId));
        setNotifs(local);
      }
    }

    loadData();
    return () => {
      alive = false;
    };
  }, [selectedTurmaId]);

  // ---------------- Calendário ----------------
  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate]);

  const daysGrid = useMemo(() => {
    const days = [];
    const startWeekday = weekdayIndex(monthStart); // 0..6
    for (let i = 0; i < startWeekday; i++) days.push(null);

    const totalDays = monthEnd.getDate();
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), d));
    }

    // completa a última linha
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [monthStart, monthEnd, currentDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      const key = ymd(ev.startAt ?? ev.inicioUtc ?? ev.date ?? ev.data ?? ev.start);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    }
    return map;
  }, [events]);

  const selectedDayEvents = useMemo(() => {
    return eventsByDay.get(selectedDay) || [];
  }, [eventsByDay, selectedDay]);

  // ---------------- Ações Eventos ----------------
  function openCreateEvent() {
    setEditingEvent(null);
    setEventTitle("");
    setEventType(EVENT_TYPES[0]);
    setEventStart("");
    setEventEnd("");
    setModalEventOpen(true);
  }

  function openEditEvent(ev) {
    setEditingEvent(ev);
    setEventTitle(ev.title ?? ev.titulo ?? "");
    setEventType(ev.type ?? ev.tipo ?? EVENT_TYPES[0]);
    setEventStart((ev.startAt ?? ev.inicioUtc ?? "").slice(0, 16));
    setEventEnd((ev.endAt ?? ev.fimUtc ?? "").slice(0, 16));
    setModalEventOpen(true);
  }

  function closeEventModal() {
    setModalEventOpen(false);
    setEditingEvent(null);
  }

  async function saveEvent() {
    if (!selectedTurmaId) return;

    const title = eventTitle.trim();
    if (!title) return showToast("error", "Título do evento é obrigatório.");

    if (!eventStart || !eventEnd) return showToast("error", "Informe início e fim do evento.");

    const start = new Date(eventStart);
    const end = new Date(eventEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return showToast("error", "Datas inválidas.");
    }
    if (end < start) return showToast("error", "Fim não pode ser antes do início.");

    const payload = {
      id: editingEvent?.id ?? editingEvent?.eventId ?? editingEvent?.eventoId ?? uid(),
      turmaId: Number(selectedTurmaId),
      title,
      type: eventType,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      createdBy: me?.nome ?? "Sistema",
      createdByRole: role,
    };

    // tenta API primeiro; se falhar, salva local
    try {
      if (editingEvent) {
        await apiJson(`/eventos/${payload.id}`, "PUT", payload);
      } else {
        await apiJson(`/eventos`, "POST", payload);
      }
      showToast("success", "Evento salvo.");
      // reload via API
      const apiEvents = await apiJson(`/eventos?turmaId=${selectedTurmaId}`);
      setEvents(Array.isArray(apiEvents) ? apiEvents : []);
    } catch {
      const next = (() => {
        const cur = Array.isArray(events) ? [...events] : [];
        const idx = cur.findIndex((x) => String(x.id ?? x.eventId) === String(payload.id));
        if (idx >= 0) cur[idx] = payload;
        else cur.push(payload);
        return cur;
      })();

      setEvents(next);
      writeLocalList(lsKeyEvents(selectedTurmaId), next);
      showToast("success", "Evento salvo (demo/local).");
    }

    // seleciona dia do evento automaticamente
    setSelectedDay(ymd(start));
    closeEventModal();
  }

  async function deleteEvent(ev) {
    if (!selectedTurmaId) return;
    const id = ev.id ?? ev.eventId ?? ev.eventoId;
    if (!id) return;

    try {
      await apiJson(`/eventos/${id}`, "DELETE");
      showToast("success", "Evento removido.");
      const apiEvents = await apiJson(`/eventos?turmaId=${selectedTurmaId}`);
      setEvents(Array.isArray(apiEvents) ? apiEvents : []);
    } catch {
      const next = events.filter((x) => String(x.id ?? x.eventId) !== String(id));
      setEvents(next);
      writeLocalList(lsKeyEvents(selectedTurmaId), next);
      showToast("success", "Evento removido (demo/local).");
    }
  }

  // ---------------- Ações Notificações ----------------
  async function publishNotif() {
    if (!selectedTurmaId) return;
    const title = notifTitle.trim();
    const msg = notifMsg.trim();

    if (!title || !msg) return showToast("error", "Título e mensagem são obrigatórios.");

    const payload = {
      id: uid(),
      turmaId: Number(selectedTurmaId),
      title,
      message: msg,
      createdAt: new Date().toISOString(),
      createdBy: me?.nome ?? "Sistema",
      createdByRole: role,
      priority: "normal",
    };

    try {
      await apiJson(`/notificacoes`, "POST", payload);
      showToast("success", "Aviso publicado.");
      const apiNotifs = await apiJson(`/notificacoes?turmaId=${selectedTurmaId}`);
      setNotifs(Array.isArray(apiNotifs) ? apiNotifs : []);
    } catch {
      const next = [payload, ...(Array.isArray(notifs) ? notifs : [])];
      setNotifs(next);
      writeLocalList(lsKeyNotifs(selectedTurmaId), next);
      showToast("success", "Aviso publicado (demo/local).");
    }

    setNotifTitle("");
    setNotifMsg("");
  }

  async function deleteNotif(n) {
    if (!selectedTurmaId) return;
    const id = n.id ?? n.notificacaoId;
    if (!id) return;

    try {
      await apiJson(`/notificacoes/${id}`, "DELETE");
      showToast("success", "Aviso removido.");
      const apiNotifs = await apiJson(`/notificacoes?turmaId=${selectedTurmaId}`);
      setNotifs(Array.isArray(apiNotifs) ? apiNotifs : []);
    } catch {
      const next = notifs.filter((x) => String(x.id ?? x.notificacaoId) !== String(id));
      setNotifs(next);
      writeLocalList(lsKeyNotifs(selectedTurmaId), next);
      showToast("success", "Aviso removido (demo/local).");
    }
  }

  const monthLabel = useMemo(() => {
    return currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [currentDate]);

  return (
    <div className="dashboard-shell">
      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 18,
            right: 18,
            zIndex: 9999,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,0.25)",
            background: toast.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
            color: theme === "dark" ? "#f8fafc" : "#111827",
            backdropFilter: "blur(10px)",
            maxWidth: 360,
          }}
        >
          <strong style={{ display: "block", marginBottom: 2 }}>
            {toast.type === "success" ? "OK" : "Atenção"}
          </strong>
          <span style={{ opacity: 0.9 }}>{toast.text}</span>
        </div>
      )}

      <main className="dashboard-main">
        <div style={{ marginBottom: 14 }}>
          <h1 className="dashboard-title" style={{ marginBottom: 6 }}>
            Agenda & Avisos
          </h1>
          <p className="dashboard-subtitle">
            Uma central única para eventos e comunicados — sem páginas demais, sem confusão.
          </p>
        </div>

        <section className="panel teacher-grid">
          {/* COLUNA PRINCIPAL */}
          <div className="teacher-main-column">
            <div className="teacher-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h2 className="panel-title" style={{ marginBottom: 4 }}>
                    Calendário da turma
                  </h2>
                  <p className="panel-subtitle">
                    {selectedTurma
                      ? `${selectedTurma.turmaNome}${selectedTurma.turmaCodigo ? ` (${selectedTurma.turmaCodigo})` : ""}`
                      : role === "Aluno"
                      ? "Calendário da sua turma"
                      : "Selecione uma turma para visualizar e organizar eventos"}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {/* seletor de turma (Admin/Professor) */}
                  {(role === "Admin" || role === "Professor") && (
                    <div style={{ minWidth: 260 }}>
                      <label className="teacher-label">Turma</label>
                      <select
                        className="disciplina-select"
                        value={selectedTurmaId}
                        onChange={(e) => setSelectedTurmaId(e.target.value)}
                        disabled={loadingTurmas || turmas.length === 0}
                        style={{ marginTop: 6 }}
                      >
                        {turmas.length === 0 ? (
                          <option value="">
                            {loadingTurmas ? "Carregando..." : "Sem turmas disponíveis"}
                          </option>
                        ) : (
                          turmas.map((t) => (
                            <option key={t.turmaId} value={t.turmaId}>
                              {t.turmaNome} {t.turmaCodigo ? `(${t.turmaCodigo})` : ""}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  )}

                  {canManage && (
                    <button type="button" className="btn-primary" onClick={openCreateEvent} disabled={!selectedTurmaId}>
                      + Novo evento
                    </button>
                  )}
                </div>
              </div>

              {/* Month row */}
              <div className="calendar-month-row" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCurrentDate((d) => addMonths(d, -1))}
                >
                  ←
                </button>

                <div className="calendar-month" style={{ fontWeight: 700, textTransform: "capitalize" }}>
                  {monthLabel}
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCurrentDate((d) => addMonths(d, 1))}
                >
                  →
                </button>
              </div>

              {/* Calendar */}
              <div className="calendar-wrapper">
                <div className="calendar-grid" style={{ marginTop: 10 }}>
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((w) => (
                    <div key={w} className="calendar-weekday">
                      {w}
                    </div>
                  ))}

                  {daysGrid.map((d, idx) => {
                    if (!d) {
                      return <div key={`e-${idx}`} className="calendar-day empty" />;
                    }
                    const key = ymd(d);
                    const has = (eventsByDay.get(key) || []).length > 0;
                    const isSelected = key === selectedDay;

                    return (
                      <button
                        key={key}
                        type="button"
                        className={`calendar-day ${has ? "has-event" : ""}`}
                        onClick={() => setSelectedDay(key)}
                        style={{
                          cursor: "pointer",
                          outline: isSelected ? "2px solid rgba(2,132,199,0.75)" : "none",
                        }}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Eventos do dia */}
            <div className="teacher-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h3 className="panel-title" style={{ marginBottom: 4 }}>
                    Eventos do dia
                  </h3>
                  <p className="panel-subtitle">
                    {selectedDay ? `Selecionado: ${selectedDay.split("-").reverse().join("/")}` : "Selecione um dia"}
                  </p>
                </div>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div style={{ opacity: 0.8, marginTop: 8 }}>
                  Sem eventos para este dia.
                </div>
              ) : (
                <ul className="calendar-events" style={{ marginTop: 10 }}>
                  {selectedDayEvents.map((ev) => {
                    const id = ev.id ?? ev.eventId ?? ev.eventoId ?? uid();
                    const title = ev.title ?? ev.titulo ?? "Evento";
                    const type = ev.type ?? ev.tipo ?? "Aviso";
                    const startAt = ev.startAt ?? ev.inicioUtc ?? ev.start ?? "";
                    const endAt = ev.endAt ?? ev.fimUtc ?? ev.end ?? "";

                    return (
                      <li key={id} className="calendar-event-item">
                        <div className="calendar-event-dot" />
                        <div style={{ flex: 1 }}>
                          <div className="calendar-event-title" style={{ fontWeight: 700 }}>
                            {title}
                          </div>
                          <div className="calendar-event-meta" style={{ opacity: 0.85, marginTop: 2 }}>
                            <span style={{ fontWeight: 600 }}>{type}</span>
                            {" · "}
                            {formatPt(startAt)} — {formatPt(endAt)}
                          </div>
                          <div style={{ opacity: 0.7, marginTop: 4, fontSize: 12 }}>
                            Criado por: {ev.createdBy ?? ev.criadoPor ?? "—"} {ev.createdByRole ? `(${ev.createdByRole})` : ""}
                          </div>
                        </div>

                        {canManage && (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button type="button" className="btn-secondary" onClick={() => openEditEvent(ev)}>
                              Editar
                            </button>
                            <button type="button" className="btn-secondary" onClick={() => deleteEvent(ev)}>
                              Remover
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* COLUNA LATERAL */}
          <aside className="teacher-aside">
            <div className="teacher-card">
              <h3 className="panel-title">Avisos da turma</h3>
              <p className="panel-subtitle" style={{ marginTop: 4 }}>
                {canManage
                  ? "Publique comunicados rápidos. O aluno vê no Dashboard e aqui."
                  : "Aqui ficam os comunicados oficiais da sua turma."}
              </p>

              {canManage && (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div>
                    <label className="teacher-label">Título</label>
                    <input
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      placeholder="Ex: Mudança de sala / Aviso importante"
                      style={{ ...inputBaseStyle(theme), marginTop: 6 }}
                    />
                  </div>

                  <div>
                    <label className="teacher-label">Mensagem</label>
                    <textarea
                      value={notifMsg}
                      onChange={(e) => setNotifMsg(e.target.value)}
                      placeholder="Escreva um aviso curto e objetivo..."
                      rows={4}
                      style={{ ...inputBaseStyle(theme), marginTop: 6, resize: "vertical" }}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    onClick={publishNotif}
                    disabled={!selectedTurmaId || !notifTitle.trim() || !notifMsg.trim()}
                  >
                    Publicar aviso
                  </button>
                </div>
              )}
            </div>

            <div className="teacher-card">
              <h3 className="panel-title">Últimos avisos</h3>

              {notifs.length === 0 ? (
                <p className="panel-subtitle">Sem avisos (ou ainda não publicados).</p>
              ) : (
                <ul className="student-notifications" style={{ marginTop: 10 }}>
                  {notifs.slice(0, 8).map((n) => {
                    const id = n.id ?? n.notificacaoId ?? uid();
                    const title = n.title ?? n.titulo ?? "Aviso";
                    const msg = n.message ?? n.mensagem ?? "";
                    const createdAt = n.createdAt ?? n.criadoEm ?? "";

                    return (
                      <li key={id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <strong>{title}</strong>
                          <div style={{ opacity: 0.9, marginTop: 2 }}>{msg}</div>
                          <div style={{ opacity: 0.7, marginTop: 6, fontSize: 12 }}>
                            {createdAt ? `Publicado em ${formatPt(createdAt)}` : ""}{" "}
                            {n.createdBy ? `· ${n.createdBy}` : ""}
                          </div>
                        </div>

                        {canManage && (
                          <button type="button" className="btn-secondary" onClick={() => deleteNotif(n)}>
                            Remover
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </section>
      </main>

      {/* MODAL EVENTO */}
      {modalEventOpen && (
        <div
          onClick={closeEventModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.55)",
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(760px, 100%)",
              borderRadius: 18,
              background: theme === "dark" ? "rgba(2,6,23,0.92)" : "#fff",
              border: "1px solid rgba(148,163,184,0.2)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0 }}>{editingEvent ? "Editar evento" : "Novo evento"}</h3>
                <div style={{ opacity: 0.85, marginTop: 4 }}>
                  {selectedTurma
                    ? `${selectedTurma.turmaNome}${selectedTurma.turmaCodigo ? ` (${selectedTurma.turmaCodigo})` : ""}`
                    : "Turma"}
                </div>
              </div>

              <button type="button" className="btn-secondary" onClick={closeEventModal}>
                Fechar
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12, marginTop: 14 }}>
              <div>
                <label className="teacher-label">Título</label>
                <input
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Ex: Prova bimestral / Reunião de alinhamento"
                  style={{ ...inputBaseStyle(theme), marginTop: 6 }}
                />
              </div>

              <div>
                <label className="teacher-label">Tipo</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  style={{ ...inputBaseStyle(theme), marginTop: 6 }}
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="teacher-label">Início</label>
                <input
                  type="datetime-local"
                  value={eventStart}
                  onChange={(e) => setEventStart(e.target.value)}
                  style={{ ...inputBaseStyle(theme), marginTop: 6 }}
                />
              </div>

              <div>
                <label className="teacher-label">Fim</label>
                <input
                  type="datetime-local"
                  value={eventEnd}
                  onChange={(e) => setEventEnd(e.target.value)}
                  style={{ ...inputBaseStyle(theme), marginTop: 6 }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button type="button" className="btn-primary" onClick={saveEvent} disabled={!eventTitle.trim()}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
