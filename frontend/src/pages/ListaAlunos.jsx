import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminListPage from "../components/AdminListPage";
import { apiJson } from "../services/api";
import { useTheme } from "../context/ThemeContext";

const EVT_TURMAS_CHANGED = "educonnect:turmas-changed";

function inputStyle(theme) {
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

function MatriculasPanel() {
  const { theme } = useTheme();

  const API_BASE = import.meta.env.VITE_API_URL || "https://localhost:5230";

  const [turmas, setTurmas] = useState([]);
  const [pendentes, setPendentes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");

  // form de aprovação por linha
  const [formMap, setFormMap] = useState({}); // { [preId]: { ra: "", turmaId: "" } }

  async function carregar() {
    try {
      setLoading(true);
      setErro("");
      setMsg("");

      const [t, p] = await Promise.all([
        apiJson("/turmas"),
        apiJson("/admin/pre-matriculas/pendentes"),
      ]);

      setTurmas(Array.isArray(t) ? t : []);
      setPendentes(Array.isArray(p) ? p : []);

      // inicializa form por item
      const initial = {};
      (Array.isArray(p) ? p : []).forEach((x) => {
        initial[x.id] = { ra: "", turmaId: "" };
      });
      setFormMap(initial);
    } catch (e) {
      setErro(e?.payload?.message || "Não foi possível carregar pré-matrículas pendentes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function setRow(id, patch) {
    setFormMap((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  }

  function fileUrl(path) {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${API_BASE}${path}`;
  }

  async function aprovar(preId) {
    setErro("");
    setMsg("");

    const row = formMap[preId] || { ra: "", turmaId: "" };
    if (!row.ra?.trim() || !row.turmaId) {
      setErro("Informe RA e selecione a turma para aprovar.");
      return;
    }

    try {
      const resp = await apiJson(`/admin/pre-matriculas/${preId}/aprovar`, "POST", {
        ra: row.ra.trim(),
        turmaId: Number(row.turmaId),
      });

      // remove da lista
      setPendentes((prev) => prev.filter((x) => x.id !== preId));

      setMsg(
        `Pré-matrícula aprovada. Login do aluno: ${resp?.usuarioEmail || "-"} | senha inicial: ${resp?.senhaInicial || "-"}`
      );
    } catch (e) {
      setErro(e?.payload?.message || "Erro ao aprovar pré-matrícula.");
    }
  }

  return (
    <section className="panel" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <h2 className="dashboard-title" style={{ fontSize: "1.05rem", marginBottom: 4 }}>
            Matrículas pendentes (Pré-matrícula)
          </h2>
          <p className="dashboard-subtitle">
            Lista de alunos que enviaram documentos + pagamento e aguardam aprovação.
          </p>
        </div>

        <button className="btn-secondary btn-small" type="button" onClick={carregar} disabled={loading}>
          Atualizar
        </button>
      </div>

      {erro && <p className="form-error" style={{ marginTop: 10 }}>{erro}</p>}
      {msg && <p style={{ marginTop: 10, fontSize: "0.85rem" }}>{msg}</p>}

      <div className="table-container" style={{ marginTop: 10 }}>
        <table className="list-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contato</th>
              <th>Docs</th>
              <th style={{ width: 130 }}>RA</th>
              <th style={{ width: 260 }}>Turma</th>
              <th className="col-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="table-empty">Carregando...</td></tr>
            )}

            {!loading && pendentes.length === 0 && (
              <tr><td colSpan={6} className="table-empty">Nenhuma pré-matrícula pendente.</td></tr>
            )}

            {!loading && pendentes.map((p) => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontWeight: 650 }}>{p.nome}</div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>ID #{p.id}</div>
                </td>

                <td>
                  <div>{p.email}</div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>{p.telefone}</div>
                </td>

                <td>
                  <div className="row-actions" style={{ gap: 8 }}>
                    <a className="btn-ghost btn-small" href={fileUrl(p.rgCpfUrl)} target="_blank" rel="noreferrer">
                      RG/CPF
                    </a>
                    <a className="btn-ghost btn-small" href={fileUrl(p.escolaridadeUrl)} target="_blank" rel="noreferrer">
                      Escolaridade
                    </a>
                    <a className="btn-ghost btn-small" href={fileUrl(p.comprovantePagamentoUrl)} target="_blank" rel="noreferrer">
                      Pagamento
                    </a>
                  </div>
                </td>

                <td>
                  <input
                    style={inputStyle(theme)}
                    value={formMap[p.id]?.ra ?? ""}
                    onChange={(e) => setRow(p.id, { ra: e.target.value })}
                    placeholder="Ex: 2026A001"
                  />
                </td>

                <td>
                  <select
                    style={inputStyle(theme)}
                    value={formMap[p.id]?.turmaId ?? ""}
                    onChange={(e) => setRow(p.id, { turmaId: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.codigo} — {t.nome}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="col-actions">
                  <div className="row-actions">
                    <button className="btn-ghost btn-small" type="button" onClick={() => aprovar(p.id)}>
                      Aprovar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TurmasPanel() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");

  const [turmas, setTurmas] = useState([]);
  const [nova, setNova] = useState({ codigo: "", nome: "", ano: new Date().getFullYear() });

  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({ codigo: "", nome: "", ano: new Date().getFullYear() });

  async function carregar() {
    setErro("");
    try {
      setLoading(true);
      const t = await apiJson("/turmas");
      setTurmas(Array.isArray(t) ? t : []);
    } catch (e) {
      setErro(e?.payload?.message || "Não foi possível carregar turmas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function fireChanged() {
    window.dispatchEvent(new Event(EVT_TURMAS_CHANGED));
  }

  async function criar() {
    setErro("");
    setMsg("");

    if (!nova.codigo.trim() || !nova.nome.trim() || !nova.ano) {
      setErro("Preencha código, nome e ano.");
      return;
    }

    try {
      setLoading(true);
      await apiJson("/turmas", "POST", {
        codigo: nova.codigo.trim(),
        nome: nova.nome.trim(),
        ano: Number(nova.ano),
      });
      setMsg("Turma criada.");
      setNova({ codigo: "", nome: "", ano: new Date().getFullYear() });
      await carregar();
      fireChanged();
    } catch (e) {
      setErro(e?.payload?.message || "Erro ao criar turma.");
    } finally {
      setLoading(false);
    }
  }

  function iniciarEdicao(t) {
    setEditId(t.id);
    setEdit({ codigo: t.codigo ?? "", nome: t.nome ?? "", ano: t.ano ?? new Date().getFullYear() });
    setMsg("");
    setErro("");
  }

  function cancelarEdicao() {
    setEditId(null);
    setEdit({ codigo: "", nome: "", ano: new Date().getFullYear() });
  }

  async function salvarEdicao() {
    if (!editId) return;
    setErro("");
    setMsg("");

    if (!edit.codigo.trim() || !edit.nome.trim() || !edit.ano) {
      setErro("Preencha código, nome e ano.");
      return;
    }

    try {
      setLoading(true);
      await apiJson(`/turmas/${editId}`, "PUT", {
        codigo: edit.codigo.trim(),
        nome: edit.nome.trim(),
        ano: Number(edit.ano),
      });
      setMsg("Turma atualizada.");
      setEditId(null);
      await carregar();
      fireChanged();
    } catch (e) {
      setErro(e?.payload?.message || "Erro ao atualizar turma.");
    } finally {
      setLoading(false);
    }
  }

  async function excluir(id) {
    const ok = confirm("Excluir turma? (Se houver matrículas/disciplinas vinculadas, pode dar erro.)");
    if (!ok) return;

    setErro("");
    setMsg("");

    try {
      setLoading(true);
      await apiJson(`/turmas/${id}`, "DELETE");
      setMsg("Turma excluída.");
      await carregar();
      fireChanged();
    } catch (e) {
      setErro(e?.payload?.message || "Erro ao excluir turma.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <h2 className="dashboard-title" style={{ fontSize: "1.05rem", marginBottom: 4 }}>Turmas</h2>
          <p className="dashboard-subtitle">
            Crie, edite e exclua turmas rapidamente (código, nome e ano).
          </p>
        </div>

        <button className="btn-secondary btn-small" type="button" onClick={carregar} disabled={loading}>
          Atualizar
        </button>
      </div>

      <div className="form-grid" style={{ marginTop: 12 }}>
        <div className="form-field">
          <label>Código</label>
          <input
            style={inputStyle(theme)}
            value={nova.codigo}
            onChange={(e) => setNova((p) => ({ ...p, codigo: e.target.value }))}
            placeholder="Ex: TURMA-2026-1A"
          />
        </div>

        <div className="form-field">
          <label>Nome</label>
          <input
            style={inputStyle(theme)}
            value={nova.nome}
            onChange={(e) => setNova((p) => ({ ...p, nome: e.target.value }))}
            placeholder="Ex: 1A - 2026"
          />
        </div>

        <div className="form-field">
          <label>Ano</label>
          <input
            style={inputStyle(theme)}
            type="number"
            value={nova.ano}
            onChange={(e) => setNova((p) => ({ ...p, ano: e.target.value }))}
            placeholder="2026"
          />
        </div>

        <div className="form-field" style={{ justifyContent: "end" }}>
          <label style={{ opacity: 0 }}>.</label>
          <button className="btn-primary btn-small" type="button" onClick={criar} disabled={loading}>
            Criar turma
          </button>
        </div>
      </div>

      {erro && <p className="form-error" style={{ marginTop: 10 }}>{erro}</p>}
      {msg && <p style={{ marginTop: 10, fontSize: "0.85rem" }}>{msg}</p>}

      <div className="table-container" style={{ marginTop: 10 }}>
        <table className="list-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>Ano</th>
              <th className="col-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="table-empty">Carregando...</td></tr>
            )}

            {!loading && turmas.length === 0 && (
              <tr><td colSpan={4} className="table-empty">Nenhuma turma cadastrada.</td></tr>
            )}

            {!loading && turmas.map((t) => {
              const editing = editId === t.id;
              return (
                <tr key={t.id}>
                  <td>
                    {editing ? (
                      <input
                        style={inputStyle(theme)}
                        value={edit.codigo}
                        onChange={(e) => setEdit((p) => ({ ...p, codigo: e.target.value }))}
                      />
                    ) : (
                      t.codigo
                    )}
                  </td>
                  <td>
                    {editing ? (
                      <input
                        style={inputStyle(theme)}
                        value={edit.nome}
                        onChange={(e) => setEdit((p) => ({ ...p, nome: e.target.value }))}
                      />
                    ) : (
                      t.nome
                    )}
                  </td>
                  <td style={{ width: 110 }}>
                    {editing ? (
                      <input
                        style={inputStyle(theme)}
                        type="number"
                        value={edit.ano}
                        onChange={(e) => setEdit((p) => ({ ...p, ano: e.target.value }))}
                      />
                    ) : (
                      t.ano
                    )}
                  </td>
                  <td className="col-actions">
                    <div className="row-actions">
                      {editing ? (
                        <>
                          <button className="btn-ghost btn-small" type="button" onClick={salvarEdicao} disabled={loading}>
                            Salvar
                          </button>
                          <button className="btn-ghost btn-small" type="button" onClick={cancelarEdicao} disabled={loading}>
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="btn-ghost btn-small" type="button" onClick={() => iniciarEdicao(t)}>
                            Editar
                          </button>
                          <button className="btn-ghost btn-small btn-danger" type="button" onClick={() => excluir(t.id)}>
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ListaAlunos() {
  const { theme } = useTheme();

  const [turmas, setTurmas] = useState([]);
  const [matriculas, setMatriculas] = useState([]);
  const [turmaFiltro, setTurmaFiltro] = useState("all");

  async function loadTopo() {
    try {
      const [t, m] = await Promise.all([apiJson("/turmas"), apiJson("/matriculas")]);
      setTurmas(Array.isArray(t) ? t : []);
      setMatriculas(Array.isArray(m) ? m : []);
    } catch {
      // se falhar, segue vida
    }
  }

  useEffect(() => {
    loadTopo();

    const onChanged = () => loadTopo();
    window.addEventListener(EVT_TURMAS_CHANGED, onChanged);
    return () => window.removeEventListener(EVT_TURMAS_CHANGED, onChanged);
  }, []);

  const alunoTurmas = useMemo(() => {
    const map = new Map();
    for (const m of matriculas) {
      const aid = Number(m.alunoId);
      const tid = Number(m.turmaId);
      if (!aid || !tid) continue;
      if (!map.has(aid)) map.set(aid, new Set());
      map.get(aid).add(tid);
    }
    return map;
  }, [matriculas]);

  const filterFn = (a) => {
    if (turmaFiltro === "all") return true;
    const tid = Number(turmaFiltro);
    const set = alunoTurmas.get(Number(a.id));
    return !!set && set.has(tid);
  };

  return (
    <AdminListPage
      title="Alunos"
      subtitle="Visão única de alunos cadastrados. Use filtro por turma para organizar."
      endpoint="/alunos"
      createTo="/admin/alunos/novo"
      searchPlaceholder="Nome, RA, e-mail institucional ou contato..."
      columns={[
        { key: "ra", label: "RA" },
        { key: "nome", label: "Nome" },
        { key: "emailInstitucional", label: "E-mail institucional" },
        { key: "emailContato", label: "E-mail contato" },
      ]}
      mapItem={(a) => ({
        id: a.id,
        nome: a.nome ?? "",
        ra: a.ra ?? "",
        emailInstitucional: a.emailInstitucional ?? "",
        emailContato: a.emailContato ?? "",
      })}
      searchFn={(a, q) =>
        (a.nome || "").toLowerCase().includes(q) ||
        (a.ra || "").toLowerCase().includes(q) ||
        (a.emailInstitucional || "").toLowerCase().includes(q) ||
        (a.emailContato || "").toLowerCase().includes(q)
      }
      filterFn={filterFn}
      toolbarExtra={() => (
        <>
          <label className="field-label">Turma</label>
          <select
            value={turmaFiltro}
            onChange={(e) => setTurmaFiltro(e.target.value)}
            style={{ ...inputStyle(theme), marginTop: 6 }}
          >
            <option value="all">Todas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.codigo} — {t.nome}
              </option>
            ))}
          </select>
        </>
      )}
      rowActions={(a, refresh) => (
        <>
          <Link className="btn-ghost btn-small" to={`/admin/alunos/${a.id}/editar`}>
            Editar
          </Link>
          <button
            className="btn-ghost btn-small btn-danger"
            type="button"
            onClick={async () => {
              const ok = confirm(`Excluir o aluno "${a.nome}"? Isso remove também o usuário vinculado.`);
              if (!ok) return;
              await apiJson(`/alunos/${a.id}`, "DELETE");
              await refresh();
            }}
          >
            Excluir
          </button>
        </>
      )}
    >
      <MatriculasPanel />
      <TurmasPanel />
    </AdminListPage>
  );
}