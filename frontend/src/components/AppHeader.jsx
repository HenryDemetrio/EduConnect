import { NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiJson } from "../services/api";

function roleLinks(role) {
  if (role === "Admin") {
    return [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/admin/alunos", label: "Alunos" },
      { to: "/admin/professores", label: "Professores" },
      { to: "/admin/agenda", label: "Agenda" },
    ];
  }

  if (role === "Professor") {
    return [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/painel-professor", label: "Painel Professor" },
      { to: "/professor/agenda", label: "Agenda & Avisos" },
    ];
  }

  // Aluno
  return [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/meu-painel", label: "Meu painel" },
  ];
}

export default function AppHeader() {
  const { theme } = useTheme();
  const { me, logout } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const menuRef = useRef(null);

  const links = useMemo(() => roleLinks(me?.role), [me?.role]);

  // fecha dropdown clicando fora
  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // badge de notificações (não quebra se endpoint não existir)
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const data = await apiJson("/notificacoes/me");
        if (!alive) return;
        setNotifs(Array.isArray(data) ? data : []);
      } catch {
        if (!alive) return;
        setNotifs([]);
      }
    }
    load();
    return () => (alive = false);
  }, []);

  const unreadCount = useMemo(() => {
    // se seu backend tiver "lida: true/false"
    return notifs.filter(n => n?.lida === false).length;
  }, [notifs]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="app-header">
      <div className="app-header__left">
        <img
          className="app-header__logo"
          src={theme === "dark" ? "/educonnect-logo-dark.svg" : "/educonnect-logo.svg"}
          alt="Logo EduConnect"
          onClick={() => navigate("/dashboard")}
          style={{ cursor: "pointer" }}
        />
      </div>

      <div className="app-header__right">
        <ThemeToggle />

        <nav className="app-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Sino */}
        <button
          type="button"
          className="notif-btn"
          onClick={() => navigate("/config")}
          title="Notificações e configurações"
        >
          🔔
          {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
        </button>

        {/* Usuário / Dropdown */}
        <div className="user-menu" ref={menuRef}>
          <button
            type="button"
            className="user-chip"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="user-avatar">{(me?.nome?.[0] || "U").toUpperCase()}</span>
            <span className="user-name">{me?.nome || "Usuário"}</span>
            <span className="user-caret">▾</span>
          </button>

          {menuOpen && (
            <div className="user-dropdown">
              <div className="user-dropdown__meta">
                <div className="user-dropdown__title">{me?.nome || "Usuário"}</div>
                <div className="user-dropdown__sub">{me?.email || ""}</div>
                <div className="user-dropdown__role">{me?.role || ""}</div>
              </div>

              <button type="button" onClick={() => { setMenuOpen(false); navigate("/config"); }}>
                Configurações
              </button>

              <button type="button" onClick={handleLogout}>
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
