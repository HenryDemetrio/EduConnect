import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { apiJson } from "../services/api";

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

export default function CadastroAluno() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();

  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const [emailInstitucional, setEmailInstitucional] = useState("");

  const [form, setForm] = useState({
    nome: "",
    ra: "",
    emailContato: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  useEffect(() => {
    async function load() {
      if (!isEdit) return;
      try {
        setCarregando(true);
        setErro("");
        const data = await apiJson(`/alunos/${id}`);
        setForm({
          nome: data?.nome ?? "",
          ra: data?.ra ?? "",
          emailContato: data?.emailContato ?? "",
        });
        setEmailInstitucional(data?.emailInstitucional ?? "");
      } catch (e) {
        setErro(e?.payload?.message || "Não foi possível carregar o aluno.");
      } finally {
        setCarregando(false);
      }
    }
    load();
  }, [id, isEdit]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");

    if (!form.nome?.trim() || !form.ra?.trim() || !form.emailContato?.trim()) {
      setErro("Preencha Nome, RA e E-mail de contato.");
      return;
    }

    setLoading(true);

    const payload = {
      nome: form.nome.trim(),
      ra: form.ra.trim(),
      emailContato: form.emailContato.trim(),
    };

    try {
      if (isEdit) {
        await apiJson(`/alunos/${id}`, "PUT", payload);
      } else {
        await apiJson("/alunos", "POST", payload);
      }
      navigate("/admin/alunos");
    } catch (e1) {
      if (e1?.status === 409) {
        setErro(e1?.payload?.message || "Conflito: RA duplicado.");
      } else {
        setErro(e1?.payload?.message || "Erro ao salvar aluno.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-shell">
      <main className="dashboard-main">
        <div style={{ marginBottom: 14 }}>
          <h1 className="dashboard-title" style={{ marginBottom: 6 }}>
            {isEdit ? "Editar aluno" : "Novo aluno"}
          </h1>
          <p className="dashboard-subtitle">
            {isEdit
              ? "Ajuste os dados do aluno. O acesso é gerado na aprovação da matrícula."
              : "Cadastro rápido para aparecer na lista e ser matriculado em turmas."}
          </p>
        </div>

        <section className="panel">
          <form className="form-card" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="nome">Nome completo *</label>
                <input
                  id="nome"
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  placeholder="Ex: Marcos Martins"
                  style={inputStyle(theme)}
                  disabled={carregando}
                />
              </div>

              <div className="form-field">
                <label htmlFor="ra">RA *</label>
                <input
                  id="ra"
                  name="ra"
                  value={form.ra}
                  onChange={handleChange}
                  placeholder="Ex: 2026A004"
                  style={inputStyle(theme)}
                  disabled={carregando}
                />
              </div>

              <div className="form-field">
                <label htmlFor="emailContato">E-mail de contato *</label>
                <input
                  id="emailContato"
                  name="emailContato"
                  type="email"
                  value={form.emailContato}
                  onChange={handleChange}
                  placeholder="Ex: marcos.martins@tivit.com"
                  style={inputStyle(theme)}
                  disabled={carregando}
                />
              </div>

              <div className="form-field">
                <label htmlFor="emailInstitucional">E-mail institucional (gerado)</label>
                <input
                  id="emailInstitucional"
                  value={emailInstitucional}
                  placeholder="Gerado após aprovação da matrícula"
                  style={inputStyle(theme)}
                  disabled
                />
              </div>
            </div>

            {erro && <p className="form-error">{erro}</p>}

            <div className="form-footer">
              <button
                type="button"
                className="btn-secondary btn-small"
                onClick={() => navigate("/admin/alunos")}
                disabled={loading || carregando}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary btn-small" disabled={loading || carregando}>
                {loading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}