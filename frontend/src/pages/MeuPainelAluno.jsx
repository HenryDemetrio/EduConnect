import { useEffect, useMemo, useState } from "react";
import { apiDownloadPdf, apiJson } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const BASE_URL = import.meta.env.VITE_API_URL || "https://localhost:5230";

function absUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function showErr(e) {
  return (
    e?.payload?.message ||
    e?.message ||
    (e?.status ? `Erro na API (${e.status})` : "Erro na API")
  );
}

function labelTipo(tipo) {
  return (tipo || "").toLowerCase() === "avaliacao" ? "Prova" : "Tarefa";
}
function codeTipoNumero(tipo, numero) {
  const t = (tipo || "").toLowerCase();
  const n = Number(numero || 0);
  if (!n) return "—";
  return t === "avaliacao" ? `P${n}` : `T${n}`;
}

async function fetchWithToken(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const resp = await fetch(url, { ...options, headers });
  return resp;
}

export default function MeuPainelAluno() {
  const { me } = useAuth();
  const { theme } = useTheme();

  // dropdown: "resumo" | turmaDisciplinaId
  const [selected, setSelected] = useState("resumo");

  // dados base
  const [loadingTD, setLoadingTD] = useState(true);
  const [turmaDisciplinas, setTurmaDisciplinas] = useState([]); // TurmaDisciplinaResponse
  const [turmaInfo, setTurmaInfo] = useState(null); // { turmaNome, turmaCodigo }

  // notificações (inclui individuais)
  const [notifsLoading, setNotifsLoading] = useState(true);
  const [notifs, setNotifs] = useState([]);

  // eventos (opcional no resumo)
  const [eventosLoading, setEventosLoading] = useState(true);
  const [eventos, setEventos] = useState([]);

  // tarefas por disciplina
  const [loadingTarefas, setLoadingTarefas] = useState(false);
  const [tarefasByTD, setTarefasByTD] = useState({}); // { [tdId]: TarefaResponse[] }

  // minha entrega por tarefa
  const [minhaEntrega, setMinhaEntrega] = useState({}); // { [tarefaId]: EntregaTarefaResponse|null }

  // upload
  const [uploadingId, setUploadingId] = useState(null);

  // boletim
  const [exportando, setExportando] = useState(false);

  // toast simples
  const [toast, setToast] = useState(null);
  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 2600);
  }

  const selectedTdId = selected === "resumo" ? null : Number(selected);

  const selectedTD = useMemo(() => {
    if (!selectedTdId) return null;
    return turmaDisciplinas.find((x) => x.id === selectedTdId) || null;
  }, [selectedTdId, turmaDisciplinas]);

  const selectedTarefas = useMemo(() => {
    if (!selectedTdId) return [];
    return tarefasByTD[selectedTdId] || [];
  }, [selectedTdId, tarefasByTD]);

  const disciplinasOptions = useMemo(() => {
    return turmaDisciplinas
      .slice()
      .sort((a, b) =>
        String(a.disciplinaNome || "").localeCompare(
          String(b.disciplinaNome || ""),
          "pt-BR"
        )
      );
  }, [turmaDisciplinas]);

  // ----------------- LOAD BASE (TD do aluno + notifs + eventos) -----------------
  useEffect(() => {
    let alive = true;

    async function loadBase() {
      try {
        setLoadingTD(true);

        // ✅ Endpoint mínimo pro aluno: GET /turmas/minha/disciplinas
        const td = await apiJson("/turmas/minha/disciplinas");
        if (!alive) return;

        const list = Array.isArray(td) ? td : [];
        setTurmaDisciplinas(list);

        if (list.length) {
          setTurmaInfo({
            turmaNome: list[0].turmaNome,
            turmaCodigo: list[0].turmaCodigo,
          });
        } else {
          setTurmaInfo(null);
        }
      } catch (e) {
        if (!alive) return;
        setTurmaDisciplinas([]);
        setTurmaInfo(null);
        showToast("error", showErr(e));
      } finally {
        if (!alive) return;
        setLoadingTD(false);
      }
    }

    async function loadNotifs() {
      try {
        setNotifsLoading(true);
        const data = await apiJson("/notificacoes/me");
        if (!alive) return;
        setNotifs(Array.isArray(data) ? data : []);
      } catch {
        if (!alive) return;
        setNotifs([]);
      } finally {
        if (!alive) return;
        setNotifsLoading(false);
      }
    }

    async function loadEventos() {
      try {
        setEventosLoading(true);
        const data = await apiJson("/eventos/me");
        if (!alive) return;
        setEventos(Array.isArray(data) ? data : []);
      } catch {
        if (!alive) return;
        setEventos([]);
      } finally {
        if (!alive) return;
        setEventosLoading(false);
      }
    }

    loadBase();
    loadNotifs();
    loadEventos();

    return () => {
      alive = false;
    };
  }, []);

  // ----------------- HELPERS: carregar tarefas + minha entrega -----------------
  async function loadTarefasForTD(tdId) {
    setLoadingTarefas(true);
    try {
      const data = await apiJson(`/turma-disciplinas/${tdId}/tarefas`);
      const list = Array.isArray(data) ? data : [];

      // ordenar: provas primeiro, depois tarefas, por numero
      list.sort((a, b) => {
        const ta = (a.tipo || "").toLowerCase();
        const tb = (b.tipo || "").toLowerCase();
        const wa = ta === "avaliacao" ? 0 : 1;
        const wb = tb === "avaliacao" ? 0 : 1;
        if (wa !== wb) return wa - wb;
        return Number(a.numero || 0) - Number(b.numero || 0);
      });

      setTarefasByTD((prev) => ({ ...prev, [tdId]: list }));

      // buscar minha entrega (pra status/nota)
      await Promise.all(
        list.map(async (t) => {
          if (!t?.id) return;

          // ✅ Endpoint mínimo: GET /tarefas/{id}/minha-entrega
          try {
            const entrega = await apiJson(`/tarefas/${t.id}/minha-entrega`);
            setMinhaEntrega((prev) => ({ ...prev, [t.id]: entrega || null }));
          } catch {
            // se não tem, deixa null
            setMinhaEntrega((prev) => ({ ...prev, [t.id]: null }));
          }
        })
      );
    } catch (e) {
      showToast("error", showErr(e));
      setTarefasByTD((prev) => ({ ...prev, [tdId]: [] }));
    } finally {
      setLoadingTarefas(false);
    }
  }

  async function loadAllForResumo() {
    // carrega todas as tarefas de todas as matérias (pra tabela resumo)
    const ids = turmaDisciplinas.map((x) => x.id);
    for (const id of ids) {
      // se já está carregado, não recarrega
      if (tarefasByTD[id]) continue;
      // eslint-disable-next-line no-await-in-loop
      await loadTarefasForTD(id);
    }
  }

  // quando TD carregou e está no resumo, tenta puxar todas (pra mostrar progresso)
  useEffect(() => {
    if (loadingTD) return;
    if (!turmaDisciplinas.length) return;
    if (selected !== "resumo") return;
    loadAllForResumo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingTD, selected, turmaDisciplinas.length]);

  // quando escolhe uma disciplina, carrega as tarefas dela
  useEffect(() => {
    if (!selectedTdId) return;
    loadTarefasForTD(selectedTdId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTdId]);

  // ----------------- ENVIAR PDF (ALUNO) -----------------
  async function enviarResposta(tarefaId, file) {
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name?.toLowerCase().endsWith(".pdf")) {
      showToast("error", "Somente PDF é permitido.");
      return;
    }

    const fd = new FormData();
    fd.append("arquivo", file);

    try {
      setUploadingId(tarefaId);

      const resp = await fetchWithToken(`${BASE_URL}/tarefas/${tarefaId}/entrega`, {
        method: "POST",
        body: fd,
      });

      if (!resp.ok) {
        let payload = null;
        try {
          payload = await resp.json();
        } catch {}
        throw { status: resp.status, payload };
      }

      // o backend retorna { message, url }
      let payload = null;
      try {
        payload = await resp.json();
      } catch {}

      showToast("success", "Entrega enviada! ✅");

      // após enviar, tenta recarregar status (minha entrega)
      try {
        const entrega = await apiJson(`/tarefas/${tarefaId}/minha-entrega`);
        setMinhaEntrega((prev) => ({ ...prev, [tarefaId]: entrega || null }));
      } catch {
        // fallback: pelo menos salva o url na memória local
        const url = payload?.url;
        setMinhaEntrega((prev) => ({
          ...prev,
          [tarefaId]: {
            ...(prev[tarefaId] || {}),
            arquivoPath: url || prev[tarefaId]?.arquivoPath || null,
            enviadoEm: new Date().toISOString(),
            nota: null,
            feedbackProfessor: null,
          },
        }));
      }
    } catch (e) {
      showToast("error", showErr(e));
    } finally {
      setUploadingId(null);
    }
  }

  // ----------------- BOLETIM PDF (ALUNO) -----------------
  async function baixarBoletim() {
    try {
      setExportando(true);
      await apiDownloadPdf("/relatorios/me/boletim", "boletim.pdf");
    } catch {
      showToast(
        "error",
        "Boletim ainda não disponível. Precisa ter tudo corrigido e frequência fechada."
      );
    } finally {
      setExportando(false);
    }
  }

  // ----------------- RESUMO: montar progresso -----------------
  const resumoRows = useMemo(() => {
    const rows = [];

    for (const td of turmaDisciplinas) {
      const list = tarefasByTD[td.id] || [];
      const total = list.length;

      const entregues = list.filter((t) => {
        const ent = minhaEntrega[t.id];
        return !!ent?.enviadoEm || !!ent?.arquivoPath || !!ent?.arquivoUrl;
      }).length;

      const corrigidos = list.filter((t) => {
        const ent = minhaEntrega[t.id];
        return ent?.nota != null;
      }).length;

      rows.push({
        tdId: td.id,
        disciplinaNome: td.disciplinaNome,
        total,
        entregues,
        corrigidos,
      });
    }

    // ordena por nome
    rows.sort((a, b) => a.disciplinaNome.localeCompare(b.disciplinaNome, "pt-BR"));
    return rows;
  }, [turmaDisciplinas, tarefasByTD, minhaEntrega]);

  // ----------------- UI -----------------
  const nomeHeader = me?.nome || "Aluno";
  const raHeader = me?.ra ? `RA ${me.ra}` : "";

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
            background:
              toast.type === "success"
                ? "rgba(16,185,129,0.12)"
                : "rgba(239,68,68,0.12)",
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
            Meu painel
          </h1>
          <p className="dashboard-subtitle">
            {turmaInfo
              ? `Turma: ${turmaInfo.turmaNome} (${turmaInfo.turmaCodigo})`
              : "Carregando turma..."}{" "}
            · {nomeHeader} {raHeader ? `· ${raHeader}` : ""}
          </p>
        </div>

        <section className="panel teacher-grid">
          {/* COLUNA ESQUERDA */}
          <div className="teacher-main-column">
            {/* HEADER + DROPDOWN ÚNICO */}
            <div className="teacher-card">
              <h2 className="panel-title">Visão</h2>
              <p className="panel-subtitle" style={{ marginTop: 4 }}>
                Selecione <strong>Resumo (Geral)</strong> ou uma disciplina para ver provas/tarefas e enviar PDF.
              </p>

              <div className="disciplina-row" style={{ gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 360 }}>
                  <label className="teacher-label">Selecionar</label>
                  <select
                    className="disciplina-select"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    disabled={loadingTD}
                  >
                    <option value="resumo">Resumo (Geral)</option>
                    {disciplinasOptions.map((td) => (
                      <option key={td.id} value={td.id}>
                        {td.disciplinaNome}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ height: 42, alignSelf: "end" }}
                  onClick={() => {
                    if (selected === "resumo") loadAllForResumo();
                    else loadTarefasForTD(Number(selected));
                  }}
                  disabled={loadingTD}
                >
                  Atualizar
                </button>
              </div>
            </div>

            {/* RESUMO (DEFAULT) */}
            {selected === "resumo" ? (
              <div className="teacher-card">
                <h3 className="panel-title">Resumo geral</h3>
                <p className="panel-subtitle" style={{ marginTop: 4 }}>
                  Progresso em todas as matérias + próximos eventos.
                </p>

                {/* progresso por disciplina */}
                <div style={{ marginTop: 12 }}>
                  <h4 style={{ margin: 0 }}>Progresso por disciplina</h4>

                  {loadingTD ? (
                    <p className="panel-subtitle">Carregando...</p>
                  ) : disciplinasOptions.length === 0 ? (
                    <p className="panel-subtitle">Nenhuma disciplina encontrada para você.</p>
                  ) : (
                    <table className="list-table" style={{ marginTop: 10 }}>
                      <thead>
                        <tr>
                          <th>Disciplina</th>
                          <th style={{ width: 140 }}>Total</th>
                          <th style={{ width: 140 }}>Entregues</th>
                          <th style={{ width: 140 }}>Corrigidos</th>
                          <th style={{ width: 140 }}>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumoRows.map((r) => (
                          <tr key={r.tdId}>
                            <td>
                              <strong>{r.disciplinaNome}</strong>
                            </td>
                            <td>{r.total}</td>
                            <td>{r.entregues}</td>
                            <td>{r.corrigidos}</td>
                            <td>
                              <button
                                className="btn-primary"
                                onClick={() => setSelected(String(r.tdId))}
                              >
                                Abrir
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* próximos eventos */}
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ margin: 0 }}>Próximos eventos</h4>

                  {eventosLoading ? (
                    <p className="panel-subtitle">Carregando...</p>
                  ) : eventos.length === 0 ? (
                    <p className="panel-subtitle">Sem eventos no momento.</p>
                  ) : (
                    <table className="list-table" style={{ marginTop: 10 }}>
                      <thead>
                        <tr>
                          <th>Título</th>
                          <th style={{ width: 220 }}>Início</th>
                          <th style={{ width: 220 }}>Fim</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventos.slice(0, 6).map((e) => (
                          <tr key={e.id}>
                            <td>
                              <strong>{e.titulo}</strong>
                              <div style={{ opacity: 0.85, marginTop: 2 }}>
                                {e.descricao || "—"}
                              </div>
                            </td>
                            <td>{e.inicio ? new Date(e.inicio).toLocaleString("pt-BR") : "—"}</td>
                            <td>{e.fim ? new Date(e.fim).toLocaleString("pt-BR") : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              // DISCIPLINA SELECIONADA
              <div className="teacher-card">
                <h3 className="panel-title">
                  {selectedTD?.disciplinaNome || "Disciplina"}
                </h3>
                <p className="panel-subtitle" style={{ marginTop: 4 }}>
                  Abra o enunciado e envie sua resposta em <strong>PDF</strong>.
                </p>

                {loadingTarefas ? (
                  <p className="panel-subtitle">Carregando atividades...</p>
                ) : selectedTarefas.length === 0 ? (
                  <p className="panel-subtitle">
                    Ainda não há atividades publicadas nesta disciplina.
                  </p>
                ) : (
                  <table className="list-table" style={{ marginTop: 10 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 120 }}>Código</th>
                        <th>Título</th>
                        <th style={{ width: 220 }}>Entrega</th>
                        <th style={{ width: 200 }}>Status</th>
                        <th style={{ width: 260 }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTarefas.map((t) => {
                        const code = `${codeTipoNumero(t.tipo, t.numero)} · ${labelTipo(
                          t.tipo
                        )}`;
                        const publicado = !!t.enunciadoUrl;
                        const ent = minhaEntrega[t.id] || null;

                        const enviado =
                          !!ent?.enviadoEm || !!ent?.arquivoPath || !!ent?.arquivoUrl;
                        const corrigido = ent?.nota != null;

                        return (
                          <tr key={t.id}>
                            <td>{code}</td>
                            <td>
                              <strong>{t.titulo}</strong>
                              <div style={{ opacity: 0.85, marginTop: 2 }}>
                                {t.descricao || "—"}
                              </div>
                            </td>
                            <td>
                              {t.dataEntrega
                                ? new Date(t.dataEntrega).toLocaleString("pt-BR")
                                : "—"}
                            </td>
                            <td>
                              {!publicado ? (
                                <span style={{ opacity: 0.8 }}>Sem enunciado</span>
                              ) : corrigido ? (
                                <span>
                                  <strong>Corrigido</strong> · Nota{" "}
                                  {Number(ent.nota).toFixed(2)}
                                </span>
                              ) : enviado ? (
                                <span>
                                  <strong>Enviado</strong>
                                </span>
                              ) : (
                                <span style={{ opacity: 0.85 }}>Pendente</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {t.enunciadoUrl ? (
                                  <a
                                    className="btn-secondary"
                                    href={absUrl(t.enunciadoUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Ver enunciado
                                  </a>
                                ) : (
                                  <span style={{ opacity: 0.75 }}>—</span>
                                )}

                                <label
                                  className="btn-primary"
                                  style={{
                                    cursor:
                                      uploadingId === t.id ? "not-allowed" : "pointer",
                                    opacity: !publicado ? 0.45 : 1,
                                  }}
                                >
                                  {uploadingId === t.id
                                    ? "Enviando..."
                                    : enviado
                                    ? "Reenviar PDF"
                                    : "Enviar PDF"}
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    style={{ display: "none" }}
                                    disabled={uploadingId === t.id || !publicado}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      e.target.value = "";
                                      if (file) enviarResposta(t.id, file);
                                    }}
                                  />
                                </label>

                                {ent?.arquivoUrl || ent?.arquivoPath ? (
                                  <a
                                    className="btn-secondary"
                                    href={absUrl(ent.arquivoUrl || ent.arquivoPath)}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Minha resposta
                                  </a>
                                ) : null}
                              </div>

                              {ent?.feedbackProfessor ? (
                                <div style={{ marginTop: 8, opacity: 0.9 }}>
                                  <strong>Feedback:</strong> {ent.feedbackProfessor}
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* COLUNA DIREITA */}
          <aside className="teacher-aside">
            <div className="teacher-card">
              <h3 className="panel-title">Regra de negócio fixa</h3>
              <p className="panel-subtitle" style={{ marginTop: 6, opacity: 0.9 }}>
                Boletim só fica disponível quando tudo estiver corrigido e frequência fechada.
              </p>

              <div style={{ marginTop: 10, opacity: 0.9 }}>
                <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                  <li>
                    <strong>2 provas</strong>: P1 e P2
                  </li>
                  <li>
                    <strong>3 tarefas</strong>: T1, T2 e T3
                  </li>
                  <li>
                    <strong>Recuperação</strong>: P3 (somente se média &lt; 6)
                  </li>
                  <li>
                    <strong>Peso</strong>: Provas 70% + Tarefas 30%
                  </li>
                  <li>
                    <strong>Frequência mínima</strong>: 75%
                  </li>
                  <li>
                    <strong>Aprovação</strong>: média final ≥ 6
                  </li>
                </ul>
              </div>

              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={baixarBoletim}
                  disabled={exportando}
                  style={{ width: "100%" }}
                >
                  {exportando ? "Baixando..." : "Baixar boletim (PDF)"}
                </button>
              </div>
            </div>

            <div className="teacher-card">
              <h3 className="panel-title">Notificações</h3>

              {notifsLoading ? (
                <p className="panel-subtitle">Carregando...</p>
              ) : notifs.length === 0 ? (
                <p className="panel-subtitle">Sem notificações no momento.</p>
              ) : (
                <ul style={{ marginTop: 10 }}>
                  {notifs.slice(0, 10).map((n) => (
                    <li key={n.id} style={{ marginBottom: 10 }}>
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
    </div>
  );
}
