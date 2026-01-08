import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminListPage from "../components/AdminListPage";
import { apiJson } from "../services/api";
import { useTheme } from "../context/ThemeContext";

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

  const [turmas, setTurmas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [matriculas, setMatriculas] = useState([]);

  const [nova, setNova] = useState({ alunoId: "", turmaId: "" });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");

  // fade out ids
  const [fadingIds, setFadingIds] = useState(() => new Set());

  async function carregarTudo() {
    try {
      setLoading(true);
      setErro("");
      setMsg("");

      const [t, a, m] = await Promise.all([
        apiJson("/turmas"),
        apiJson("/alunos"),
        apiJson("/matriculas/pendentes"),
      ]);

      setTurmas(Array.isArray(t) ? t : []);
      setAlunos(Array.isArray(a) ? a : []);
      setMatriculas(Array.isArray(m) ? m : []);
    } catch (e) {
      setErro(e?.payload?.message || "Não foi possível carregar matrículas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  // ✅ somente “pendentes”
  // Se a API retornar SOMENTE pendentes, perfeito.
  // Se futuramente vier status, essa função já cobre:
  const pendentes = useMemo(() => {
    return matriculas.filter((m) => {
      const status = (m.statusPagamento || m.status || "").toString().toLowerCase();
      const aprovadoEm = m.pagamentoAprovadoEm || m.aprovadoEm || null;

      if (status) return status.includes("pend");
      if (aprovadoEm) return false;

      // fallback: considera pendente se não tiver qualquer marca de aprovado
      return true;
    });
  }, [matriculas]);

  async function criarMatricula() {
    setErro("");
    setMsg("");

    if (!nova.alunoId || !nova.turmaId) {
      setErro("Selecione um aluno e uma turma.");
      return;
    }

    try {
      await apiJson("/matriculas", "POST", {
        alunoId: Number(nova.alunoId),
        turmaId: Number(nova.turmaId),
      });
      setMsg("Matrícula criada (pendente).");
      setNova({ alunoId: "", turmaId: "" });
      await carregarTudo();
    } catch (e) {
      setErro(e?.payload?.message || "Erro ao criar matrícula.");
    }
  }

  async function aprovarPagamento(id) {
    setErro("");
    setMsg("");

    try {
      const resp = await apiJson(`/matriculas/${id}/aprovar-pagamento`, "POST");

      // ✅ fade e remove sem precisar reload
      setFadingIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setMatriculas((prev) => prev.filter((m) => m.id !== id));
        setFadingIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      }, 260);

      const w = resp?.warning ? ` (${resp.warning})` : "";
      setMsg(`Pagamento aprovado. E-mail: ${resp?.emailInstitucional || "-"}${w}`);
    } catch (e) {
      setErro(e?.payload?.message || "Erro ao aprovar pagamento.");
    }
  }

  return (
    <section className="panel" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <h2 className="dashboard-title" style={{ fontSize: "1.05rem", marginBottom: 4 }}>Matrículas</h2>
          <p className="dashboard-subtitle">
            Crie matrícula e aprove o pagamento para disparar o Power Automate.
          </p>
        </div>

        <button className="btn-secondary btn-small matriculas-refresh" type="button" onClick={carregarTudo} disabled={loading}>
          Atualizar
        </button>
      </div>

      {/* Criar matrícula (só Aluno + Turma) */}
      <div className="form-grid" style={{ marginTop: 12 }}>
        <div className="form-field">
          <label>Aluno</label>
          <select
            value={nova.alunoId}
            onChange={(e) => setNova((p) => ({ ...p, alunoId: e.target.value }))}
            style={inputStyle(theme)}
          >
            <option value="">Selecione...</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {(a.nome || "").trim()} — {a.ra}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label>Turma</label>
          <select
            value={nova.turmaId}
            onChange={(e) => setNova((p) => ({ ...p, turmaId: e.target.value }))}
            style={inputStyle(theme)}
          >
            <option value="">Selecione...</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.codigo} — {t.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field" style={{ justifyContent: "end" }}>
          <label style={{ opacity: 0 }}>.</label>
          <button className="btn-primary btn-small" type="button" onClick={criarMatricula} disabled={loading}>
            Criar matrícula
          </button>
        </div>
      </div>

      {erro && <p className="form-error" style={{ marginTop: 10 }}>{erro}</p>}
      {msg && <p style={{ marginTop: 10, fontSize: "0.85rem" }}>{msg}</p>}

      {/* ✅ tabela só com pendentes e só Aluno + Turma + Ações */}
      <div className="table-container" style={{ marginTop: 10 }}>
        <table className="list-table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Turma</th>
              <th className="col-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={3} className="table-empty">Carregando...</td></tr>
            )}

            {!loading && pendentes.length === 0 && (
              <tr><td colSpan={3} className="table-empty">Nenhuma matrícula pendente.</td></tr>
            )}

            {!loading && pendentes.map((m) => (
              <tr key={m.id} className={fadingIds.has(m.id) ? "row-fade" : ""}>
                <td>{m.alunoNome}</td>
                <td>{m.turmaCodigo} — {m.turmaNome}</td>
                <td className="col-actions">
                  <div className="row-actions">
                    <button className="btn-ghost btn-small" type="button" onClick={() => aprovarPagamento(m.id)}>
                      Aprovar pagamento
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

export default function ListaAlunos() {
  const { theme } = useTheme();

  // ✅ Turmas + matrículas pra filtrar alunos por turma (sem nova página)
  const [turmas, setTurmas] = useState([]);
  const [matriculas, setMatriculas] = useState([]);
  const [turmaFiltro, setTurmaFiltro] = useState("all"); // "all" | turmaId string

  useEffect(() => {
    async function load() {
      try {
        const [t, m] = await Promise.all([apiJson("/turmas"), apiJson("/matriculas")]);
        setTurmas(Array.isArray(t) ? t : []);
        setMatriculas(Array.isArray(m) ? m : []);
      } catch {
        // se falhar, o filtro vira “todas” e segue vida
      }
    }
    load();
  }, []);

  // alunoId -> set(turmaId)
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
      // ✅ filtro adicional por turma
      filterFn={filterFn}
      // ✅ dropdown no topo, ao lado da busca
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
    </AdminListPage>
  );
}
