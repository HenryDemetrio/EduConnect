import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [form, setForm] = useState({
    nome: "",
    email: "",
    ra: "",
    senha: "", // opcional (se o backend suportar)
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");

    if (!form.nome || !form.email || !form.ra) {
      setErro("Preencha Nome, E-mail e RA.");
      return;
    }

    setLoading(true);

    // payload mínimo (robusto)
    const basePayload = {
      nome: form.nome.trim(),
      email: form.email.trim(),
      ra: form.ra.trim(),
    };

    // tenta com senha se preenchida; se der 400, tenta sem senha (compatibilidade)
    const payloadComSenha = form.senha.trim()
      ? { ...basePayload, senha: form.senha.trim() }
      : basePayload;

    try {
      await apiJson("/alunos", "POST", payloadComSenha);
      navigate("/admin/alunos");
    } catch (e1) {
      // 409: duplicidade
      if (e1?.status === 409) {
        setErro(e1?.payload?.message || "Já existe aluno com esse e-mail/RA.");
        setLoading(false);
        return;
      }

      // fallback: backend pode não aceitar "senha"
      if (form.senha.trim() && e1?.status === 400) {
        try {
          await apiJson("/alunos", "POST", basePayload);
          navigate("/admin/alunos");
          return;
        } catch (e2) {
          setErro(e2?.payload?.message || "Erro ao cadastrar aluno.");
          setLoading(false);
          return;
        }
      }

      setErro(e1?.payload?.message || "Erro ao cadastrar aluno.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-shell">
      <main className="dashboard-main">
        <div style={{ marginBottom: 14 }}>
          <h1 className="dashboard-title" style={{ marginBottom: 6 }}>
            Novo aluno
          </h1>
          <p className="dashboard-subtitle">
            Cadastro rápido para aparecer na lista e ser matriculado em turmas.
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
                  placeholder="Ex: Ana Souza"
                  style={inputStyle(theme)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="email">E-mail institucional *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="nome@educonnect.com"
                  style={inputStyle(theme)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="ra">RA / Matrícula *</label>
                <input
                  id="ra"
                  name="ra"
                  value={form.ra}
                  onChange={handleChange}
                  placeholder="Ex: EC202401"
                  style={inputStyle(theme)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="senha">Senha inicial (opcional)</label>
                <input
                  id="senha"
                  name="senha"
                  type="password"
                  value={form.senha}
                  onChange={handleChange}
                  placeholder="Se o backend suportar"
                  style={inputStyle(theme)}
                />
              </div>
            </div>

            {erro && <p className="form-error">{erro}</p>}

            <div className="form-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate("/admin/alunos")}
                disabled={loading}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Salvando..." : "Salvar aluno"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
