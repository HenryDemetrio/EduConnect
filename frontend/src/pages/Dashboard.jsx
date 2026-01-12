import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { apiJson } from "../services/api";

function formatDateBR(isoUtc) {
  if (!isoUtc) return "";
  return new Date(isoUtc).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function monthLabelBR(date) {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

// chave YYYY-MM-DD considerando America/Sao_Paulo (pra bater certinho no calendário)
function dateKeySP(isoUtc) {
  return new Date(isoUtc).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

export default function Dashboard() {
  const { theme } = useTheme();
  const { me } = useAuth();

  const chartCanvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const role = me?.role || me?.Role; // dependendo do teu backend/front, pode vir "Role" ou "role"
  const userName = me?.nome || me?.Nome || "Usuário";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [turmas, setTurmas] = useState([]);
  const [turmaScope, setTurmaScope] = useState("all"); // "all" | turmaId (string)
  const selectedTurmaId = turmaScope !== "all" ? Number(turmaScope) : null;

  const [eventos, setEventos] = useState([]);
  const [notifs, setNotifs] = useState([]);

  // desempenho: array { disciplinaId, disciplinaNome, mediaNota, total }
  const [desempenho, setDesempenho] = useState([]);

  const [currentDate, setCurrentDate] = useState(new Date());

  // --- carregar turmas conforme role
  useEffect(() => {
    let cancelled = false;

    async function loadTurmas() {
      try {
        if (!role) return;

        if (role === "Admin") {
          const list = await apiJson("/turmas");
          if (!cancelled) setTurmas(list || []);
        } else if (role === "Professor") {
          const list = await apiJson("/turmas/minhas");
          if (!cancelled) setTurmas(list || []);
        } else {
          // Aluno: não precisa listar todas turmas (escopo é "minha turma" via endpoints /me)
          if (!cancelled) setTurmas([]);
        }
      } catch {
        if (!cancelled) setTurmas([]);
      }
    }

    loadTurmas();
    return () => {
      cancelled = true;
    };
  }, [role]);

  // --- carregar dados do dashboard
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      if (!role) return;

      setLoading(true);
      setError("");

      try {
        // 1) Eventos
        let evts = [];
        if (role === "Aluno") {
          evts = await apiJson("/eventos/me");
        } else {
          const qs = selectedTurmaId ? `?turmaId=${selectedTurmaId}` : "";
          evts = await apiJson(`/eventos${qs}`);
        }

        // 2) Notificações (feed do dashboard)
        // - Aluno: só Geral + Turma (NÃO inclui direta pra ele)
        // - Admin/Professor: pode vir tudo, mas a SIDEBAR vai filtrar
        const nfQs = role !== "Aluno" && selectedTurmaId ? `?turmaId=${selectedTurmaId}` : "";
        const nfs = await apiJson(`/notificacoes/feed${nfQs}`);

        // 3) Desempenho por matéria
        let perf = [];
        if (role === "Aluno") {
          const minhas = await apiJson("/avaliacoes/me");
          const map = new Map();
          for (const a of (minhas || [])) {
            const nome = a.disciplinaNome || a.DisciplinaNome || "Disciplina";
            const nota = Number(a.nota ?? a.Nota ?? 0);
            const prev = map.get(nome) || { sum: 0, count: 0 };
            prev.sum += nota;
            prev.count += 1;
            map.set(nome, prev);
          }
          perf = Array.from(map.entries()).map(([disciplinaNome, v], idx) => ({
            disciplinaId: idx + 1,
            disciplinaNome,
            mediaNota: v.count ? Number((v.sum / v.count).toFixed(1)) : 0,
            total: v.count,
          }));
        } else {
          const qs = selectedTurmaId ? `?turmaId=${selectedTurmaId}` : "";
          perf = await apiJson(`/avaliacoes/resumo${qs}`);
        }

        if (!cancelled) {
          setEventos(evts || []);
          setNotifs(nfs || []);
          setDesempenho(perf || []);
        }
      } catch (e) {
        if (!cancelled) setError("Falha ao carregar Dashboard. Verifique backend/rotas e token.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [role, selectedTurmaId]);

  // ✅ sidebar: SOMENTE gerais + por turma (sem diretas)
  const sidebarNotifs = useMemo(() => {
    return (notifs || []).filter((n) => {
      const escopo = n.escopo || n.Escopo;
      const usuarioId = n.usuarioId ?? n.UsuarioId;
      // Só Geral/Turma => usuarioId null e escopo != Direta
      return usuarioId == null && escopo !== "Direta";
    });
  }, [notifs]);

  // --- chart data
  const chartData = useMemo(() => {
    const labels = (desempenho || []).map((x) => x.disciplinaNome);
    const values = (desempenho || []).map((x) => Number(x.mediaNota ?? 0));
    return { labels, values };
  }, [desempenho]);

  // --- render chart
  useEffect(() => {
    if (!chartCanvasRef.current) return;

    const colors =
      theme === "dark"
        ? { bg: "rgba(248, 113, 113, 0.22)", border: "#f97373", grid: "#1f2937", ticks: "#e5e7eb" }
        : { bg: "rgba(220, 38, 38, 0.16)", border: "#dc2626", grid: "#e5e7eb", ticks: "#111827" };

    const ctx = chartCanvasRef.current.getContext("2d");
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    chartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: "Média por matéria",
            data: chartData.values,
            backgroundColor: colors.bg,
            borderColor: colors.border,
            borderWidth: 2,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 10, ticks: { stepSize: 2, color: colors.ticks }, grid: { color: colors.grid } },
          x: { ticks: { color: colors.ticks }, grid: { display: false } },
        },
      },
    });

    return () => chartInstanceRef.current?.destroy();
  }, [theme, chartData.labels, chartData.values]);

  // --- calendário
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const calendarCells = [];
  for (let i = 0; i < firstWeekday; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  function goToPrevMonth() {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  }

  function goToNextMonth() {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  }

  const eventKeysThisMonth = useMemo(() => {
    const set = new Set();
    for (const e of eventos || []) {
      const key = dateKeySP(e.inicioUtc || e.InicioUtc);
      if (!key) continue;
      const d = new Date(`${key}T00:00:00`);
      if (d.getFullYear() === year && d.getMonth() === month) set.add(key);
    }
    return set;
  }, [eventos, year, month]);

  const visibleEvents = useMemo(() => {
    const list = [];
    for (const e of eventos || []) {
      const key = dateKeySP(e.inicioUtc || e.InicioUtc);
      if (!key) continue;
      const d = new Date(`${key}T00:00:00`);
      if (d.getFullYear() === year && d.getMonth() === month) list.push({ ...e, _key: key });
    }
    list.sort((a, b) => new Date(a.inicioUtc || a.InicioUtc) - new Date(b.inicioUtc || b.InicioUtc));
    return list;
  }, [eventos, year, month]);

  // --- “cards” do topo (usa o que aparece na home: Gerais+Turma)
  const stats = useMemo(() => {
    const qtdEventosMes = visibleEvents.length;
    const qtdNotifs = (sidebarNotifs || []).length;
    const mediaGeral =
      chartData.values.length > 0
        ? Number((chartData.values.reduce((acc, v) => acc + v, 0) / chartData.values.length).toFixed(1))
        : 0;

    return { qtdEventosMes, qtdNotifs, mediaGeral };
  }, [visibleEvents.length, sidebarNotifs, chartData.values]);

  return (
    <div className="dashboard-shell">
      <div className="dashboard-tagline">
        <h1 className="dashboard-title">Bem-vindo, {userName}</h1>
        <p className="dashboard-subtitle">
          Seu painel principal - eventos, comunicados e desempenho em um só lugar.
        </p>
      </div>

      {error && (
        <div className="panel" style={{ marginTop: 12, borderColor: "rgba(220,38,38,0.35)" }}>
          <p className="panel-title">Ops…</p>
          <p className="panel-subtitle">{error}</p>
        </div>
      )}

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Eventos no mês</span>
          <span className="summary-value">{loading ? "—" : stats.qtdEventosMes}</span>
          <span className="panel-subtitle">Calendário sincronizado</span>
        </div>

        <div className="summary-card">
          <span className="summary-label">Comunicados</span>
          <span className="summary-value">{loading ? "—" : stats.qtdNotifs}</span>
          <span className="panel-subtitle">Gerais + Turma</span>
        </div>

        <div className="summary-card">
          <span className="summary-label">Média por matéria</span>
          <span className="summary-value">{loading ? "—" : stats.mediaGeral}</span>
          <span className="panel-subtitle">Notas (0 a 10)</span>
        </div>
      </div>

      <main className="teacher-grid" style={{ marginTop: 14 }}>
        <section className="teacher-main-column">
          <section className="panel">
            <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div>
                <h2 className="panel-title">Desempenho por matéria</h2>
                <p className="panel-subtitle">
                  {role === "Aluno"
                    ? "Sua média por disciplina."
                    : "Média das turmas por disciplina (filtre por turma ou veja tudo)."}
                </p>
              </div>

              {role !== "Aluno" && (
                <div style={{ minWidth: 240 }}>
                  <label className="panel-subtitle" style={{ display: "block", marginBottom: 6 }}>
                    Escopo
                  </label>
                  <select
                    value={turmaScope}
                    onChange={(e) => setTurmaScope(e.target.value)}
                    className="input"
                    style={{ width: "100%" }}
                  >
                    <option value="all">Todas as turmas</option>
                    {turmas.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.nome} ({t.codigo})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="chart-wrapper">
              <canvas ref={chartCanvasRef} height="140" />
              {!loading && chartData.labels.length === 0 && (
                <p className="panel-subtitle" style={{ marginTop: 10 }}>
                  Nenhuma avaliação encontrada para montar o gráfico.
                </p>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Calendário</h2>
                <p className="panel-subtitle">
                  {role === "Aluno"
                    ? "Eventos gerais + da sua turma."
                    : "Eventos gerais + por turma (selecione o escopo acima)."}
                </p>
              </div>
            </div>

            <div className="calendar-wrapper">
              <div className="calendar-month-row">
                <button type="button" onClick={goToPrevMonth}>‹</button>
                <div className="calendar-month">{monthLabelBR(currentDate)}</div>
                <button type="button" onClick={goToNextMonth}>›</button>
              </div>

              <div className="calendar-grid">
                {["D", "S", "T", "Q", "Q", "S", "S"].map((d) => (
                  <div key={d} className="calendar-weekday">{d}</div>
                ))}

                {calendarCells.map((day, index) => {
                  if (!day) return <div key={index} className="calendar-day empty" />;

                  const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const hasEvent = eventKeysThisMonth.has(iso);

                  return (
                    <div key={index} className={`calendar-day${hasEvent ? " has-event" : ""}`}>
                      <span>{day}</span>
                    </div>
                  );
                })}
              </div>

              <ul className="calendar-events">
                {visibleEvents.length === 0 && !loading && (
                  <li className="calendar-event-item">
                    <p className="calendar-event-title">Não há eventos cadastrados neste mês.</p>
                  </li>
                )}

                {visibleEvents.map((ev) => {
                  const titulo = ev.titulo || ev.Titulo;
                  const inicioUtc = ev.inicioUtc || ev.InicioUtc;
                  const turmaNome = ev.turmaNome || ev.TurmaNome;
                  const escopo = ev.turmaId || ev.TurmaId ? (turmaNome ? turmaNome : "Turma") : "Geral";

                  return (
                    <li key={ev.id || `${titulo}-${inicioUtc}`} className="calendar-event-item">
                      <span className="calendar-event-dot" />
                      <div>
                        <p className="calendar-event-title">{titulo}</p>
                        <p className="calendar-event-meta">
                          {formatDateBR(inicioUtc)} • {escopo}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        </section>

        <aside className="teacher-aside">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Notificações</h2>
                <p className="panel-subtitle">
                  Apenas gerais + da turma.
                </p>
              </div>
            </div>

            <ul className="notif-list">
              {!loading && (!sidebarNotifs || sidebarNotifs.length === 0) && (
                <li className="notif-item">
                  <p className="notif-title">Sem comunicados no momento</p>
                  <p className="notif-text">Quando alguém publicar um aviso geral ou da turma, ele aparece aqui.</p>
                </li>
              )}

              {(sidebarNotifs || []).map((n) => {
                const titulo = n.titulo || n.Titulo;
                const mensagem = n.mensagem || n.Mensagem;
                const criado = n.criadoEmUtc || n.CriadoEmUtc;
                const escopo = n.escopo || n.Escopo || (n.turmaId ? "Turma" : "Geral");

                return (
                  <li key={n.id || n.Id} className="notif-item">
                    <p className="notif-title">{titulo}</p>
                    <p className="notif-text">{mensagem}</p>
                    <p className="notif-meta">
                      {formatDateBR(criado)} • {escopo}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </main>
    </div>
  );
}
