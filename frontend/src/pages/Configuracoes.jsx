import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export default function Configuracoes() {
  const { theme, toggleTheme } = useTheme();
  const { me } = useAuth();

  return (
    <div className="dashboard-shell">
      <main className="dashboard-main">
        <div style={{ marginBottom: 14 }}>
          <h1 className="dashboard-title" style={{ marginBottom: 6 }}>Configurações</h1>
          <p className="dashboard-subtitle">Preferências rápidas. Sem poluição de tela.</p>
        </div>

        <section className="panel" style={{ display: "grid", gap: 12 }}>
          <div className="teacher-card">
            <h3 className="panel-title">Perfil</h3>
            <p className="panel-subtitle" style={{ marginTop: 6 }}>
              <strong>Nome:</strong> {me?.nome || "—"}<br/>
              <strong>E-mail:</strong> {me?.email || "—"}<br/>
              <strong>Role:</strong> {me?.role || "—"}
            </p>
          </div>

          <div className="teacher-card">
            <h3 className="panel-title">Aparência</h3>
            <p className="panel-subtitle" style={{ marginTop: 6 }}>
              Tema atual: <strong>{theme === "dark" ? "Escuro" : "Claro"}</strong>
            </p>

            <div style={{ marginTop: 10 }}>
              <button className="btn-primary" type="button" onClick={toggleTheme}>
                Alternar tema
              </button>
            </div>
          </div>

          <div className="teacher-card">
            <h3 className="panel-title">Notificações</h3>
            <p className="panel-subtitle" style={{ marginTop: 6 }}>
              (por enquanto) Preferências simples — a parte “smart” a gente pluga depois.
            </p>

            <ul className="student-notifications" style={{ marginTop: 10 }}>
              <li>✅ Alertas de avaliação</li>
              <li>✅ Avisos de turma</li>
              <li>✅ Eventos do calendário</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
