import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiJson } from "../services/api";

export default function CadastroProfessor() {
  const nav = useNavigate();
  const { id } = useParams();
  const editMode = useMemo(() => !!id, [id]);
  const professorIdNum = useMemo(() => (id ? Number(id) : null), [id]);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [registro, setRegistro] = useState("");
  const [nome, setNome] = useState("");
  const [emailContato, setEmailContato] = useState("");

  // vínculo turma/disciplina
  const [turmas, setTurmas] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [turmaId, setTurmaId] = useState("");
  const [disciplinaId, setDisciplinaId] = useState("");
  const [gradeTurma, setGradeTurma] = useState([]);

  async function carregarProfessor() {
    if (!editMode) return;
    setLoading(true);
    setErro("");
    try {
      const p = await apiJson(`/professores/${id}`);
      setRegistro(p?.registro ?? "");
      setNome(p?.nome ?? "");
      setEmailContato(p?.emailContato ?? "");
    } catch (e) {
      setErro(e?.payload?.message || "Erro ao carregar professor.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarAuxiliares() {
    try {
      const [t, d] = await Promise.all([apiJson("/turmas"), apiJson("/disciplinas")]);
      setTurmas(Array.isArray(t) ? t : []);
      setDisciplinas(Array.isArray(d) ? d : []);
    } catch {
      // silencioso
    }
  }

  async function carregarGradeDaTurma(tId) {
    if (!tId) {
      setGradeTurma([]);
      return;
    }
    try {
      const list = await apiJson(`/turmas/${tId}/disciplinas`);
      setGradeTurma(Array.isArray(list) ? list : []);
    } catch {
      setGradeTurma([]);
    }
  }

  useEffect(() => {
    carregarProfessor();
    carregarAuxiliares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    carregarGradeDaTurma(turmaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaId]);

  async function salvar(e) {
    e.preventDefault();
    setErro("");

    if (!registro.trim() || !nome.trim() || !emailContato.trim()) {
      setErro("Preencha registro, nome e e-mail de contato.");
      return;
    }

    setLoading(true);
    try {
      // ✅ backend espera emailContato (não email)
      const payload = {
        registro: registro.trim(),
        nome: nome.trim(),
        emailContato: emailContato.trim(),
      };

      if (editMode) {
        await apiJson(`/professores/${id}`, "PUT", payload);
        return;
      }

      const created = await apiJson("/professores", "POST", payload);
      const newId = created?.id ?? created?.professorId;
      nav(`/admin/professores/${newId}/editar`);
    } catch (e2) {
      setErro(e2?.payload?.message || "Erro ao salvar professor.");
    } finally {
      setLoading(false);
    }
  }

  async function gerarAcesso() {
    if (!editMode) {
      setErro("Salve o professor antes de gerar acesso.");
      return;
    }
    setErro("");
    setLoading(true);
    try {
      await apiJson(`/professores/${id}/gerar-acesso`, "POST");
      await carregarProfessor();
    } catch (e) {
      setErro(e?.payload?.message || "Erro ao gerar acesso.");
    } finally {
      setLoading(false);
    }
  }

  async function vincular() {
    if (!editMode) return;
    if (!turmaId || !disciplinaId) {
      setErro("Selecione a turma e a disciplina.");
      return;
    }

    setErro("");
    setLoading(true);

    try {
      const disciplinaNum = Number(disciplinaId);

      // se já existe disciplina na grade, só troca professor
      const existente = (gradeTurma || []).find(
        (x) => (x.disciplinaId ?? x.disciplinaID) === disciplinaNum
      );

      if (existente?.id) {
        await apiJson(`/turmas/disciplinas/${existente.id}`, "PUT", { professorId: professorIdNum });
      } else {
        await apiJson(`/turmas/${turmaId}/disciplinas`, "POST", {
          disciplinaId: disciplinaNum,
          professorId: professorIdNum,
        });
      }

      await carregarGradeDaTurma(turmaId);
    } catch (e) {
      setErro(e?.payload?.message || "Erro ao vincular professor.");
    } finally {
      setLoading(false);
    }
  }

  async function desvincular(turmaDisciplinaId) {
    const ok = window.confirm("Desvincular este professor da disciplina?");
    if (!ok) return;

    setErro("");
    setLoading(true);
    try {
      // backend ideal: aceita professorId null
      await apiJson(`/turmas/disciplinas/${turmaDisciplinaId}`, "PUT", { professorId: null });
      await carregarGradeDaTurma(turmaId);
    } catch (e) {
      setErro(
        e?.payload?.message ||
          "Erro ao desvincular. (Se o backend não aceitar null, a gente ajusta o endpoint.)"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-shell">
      <main>
        <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 className="dashboard-title" style={{ marginBottom: 6 }}>
              {editMode ? "Editar professor" : "Novo professor"}
            </h1>
            <p className="dashboard-subtitle">Cadastro e gestão de acesso.</p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <Link className="btn-secondary btn-small" to="/admin/professores">
              Voltar
            </Link>

            {editMode && (
              <button className="btn-secondary btn-small" type="button" onClick={gerarAcesso} disabled={loading}>
                Gerar acesso
              </button>
            )}
          </div>
        </div>

        <section className="panel">
          <form className="form-card" onSubmit={salvar}>
            <div className="form-grid">
              <div className="form-field">
                <label>Registro</label>
                <input value={registro} onChange={(e) => setRegistro(e.target.value)} placeholder="Ex: PROF2025001" />
              </div>

              <div className="form-field">
                <label>Nome</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do professor" />
              </div>

              <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                <label>E-mail contato</label>
                <input
                  value={emailContato}
                  onChange={(e) => setEmailContato(e.target.value)}
                  placeholder="email@dominio.com"
                />
              </div>
            </div>

            {erro && <p className="form-error">{erro}</p>}

            <div className="form-footer">
              <button className="btn-secondary btn-inline" type="button" onClick={() => nav("/admin/professores")}>
                Cancelar
              </button>

              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Salvando..." : editMode ? "Salvar professor" : "Salvar professor"}
              </button>
            </div>
          </form>
        </section>

        {/* vínculo */}
        <section className="panel" style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0 }}>Vínculo com Turma</h2>
              <p className="dashboard-subtitle" style={{ marginTop: 6 }}>
                Associa o professor às disciplinas de uma turma (TurmaDisciplina).
              </p>
            </div>
          </div>

          {!editMode ? (
            <p className="dashboard-subtitle" style={{ marginTop: 10 }}>
              Salve o professor para habilitar o vínculo.
            </p>
          ) : (
            <>
              <div className="form-grid" style={{ marginTop: 10 }}>
                <div className="form-field">
                  <label>Turma</label>
                  <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.codigo} — {t.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Disciplina</label>
                  <select value={disciplinaId} onChange={(e) => setDisciplinaId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {disciplinas.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-footer">
                <button className="btn-secondary btn-inline btn-small" type="button" onClick={vincular} disabled={loading}>
                  Vincular
                </button>
              </div>

              {turmaId && (
                <div className="table-container" style={{ marginTop: 8 }}>
                  <table className="list-table">
                    <thead>
                      <tr>
                        <th>Disciplina</th>
                        <th>Professor atual</th>
                        <th style={{ width: 170, textAlign: "right" }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(gradeTurma || []).map((x) => {
                        const xProfessorId = x.professorId ?? null;
                        const podeDesvincular =
                          xProfessorId !== null && professorIdNum !== null && xProfessorId === professorIdNum;

                        return (
                          <tr key={x.id}>
                            <td>{x.disciplinaNome}</td>
                            <td>{x.professorNome || "-"}</td>
                            <td style={{ textAlign: "right" }}>
                              {podeDesvincular ? (
                                <button
                                  className="btn-ghost btn-small btn-danger"
                                  type="button"
                                  onClick={() => desvincular(x.id)}
                                  disabled={loading}
                                >
                                  Desvincular
                                </button>
                              ) : (
                                <span style={{ color: "var(--muted)" }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {(gradeTurma || []).length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ padding: 16, color: "var(--muted)" }}>
                            Esta turma ainda não possui disciplinas vinculadas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
