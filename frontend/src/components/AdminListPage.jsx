import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

export default function AdminListPage({
  title,
  subtitle,
  endpoint,
  columns,       // [{ key, label }]
  mapItem,       // (raw) => { ...normalized }
  createTo,
  searchPlaceholder,
  searchFn,      // (item, queryLower) => boolean
}) {
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [items, setItems] = useState([]);
  const [busca, setBusca] = useState("");

  async function carregar() {
    try {
      setLoading(true);
      setErro("");
      const data = await apiJson(endpoint);
      const list = Array.isArray(data) ? data : [];
      setItems(list.map(mapItem));
    } catch (e) {
      setErro(e?.payload?.message || "Não foi possível carregar.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [endpoint]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => searchFn(it, q));
  }, [items, busca, searchFn]);

  return (
    <div className="dashboard-shell">
      <main className="dashboard-main">
        <div style={{ marginBottom: 14 }}>
          <h1 className="dashboard-title" style={{ marginBottom: 6 }}>{title}</h1>
          <p className="dashboard-subtitle">{subtitle}</p>
        </div>

        <section className="panel">
          <div
            className="list-toolbar"
            style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
          >
            <div style={{ minWidth: 280, flex: 1 }}>
              <label className="teacher-label">Buscar</label>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={searchPlaceholder}
                style={{ ...inputStyle(theme), marginTop: 6 }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "end" }}>
              <button type="button" className="btn-secondary" onClick={carregar}>
                Atualizar
              </button>

              <Link to={createTo} className="btn-primary btn-small">
                + Novo
              </Link>
            </div>
          </div>

          <div className="table-container" style={{ marginTop: 12 }}>
            <table className="list-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr><td colSpan={columns.length} className="table-empty">Carregando...</td></tr>
                )}

                {!loading && erro && (
                  <tr><td colSpan={columns.length} className="table-empty">{erro}</td></tr>
                )}

                {!loading && !erro && filtrados.length === 0 && (
                  <tr><td colSpan={columns.length} className="table-empty">Nenhum registro encontrado.</td></tr>
                )}

                {!loading && !erro && filtrados.map((it) => (
                  <tr key={it.id}>
                    {columns.map((c) => (
                      <td key={c.key}>{it[c.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
