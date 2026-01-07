import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireAuth({ roles = [] }) {
  const { token, me, loading } = useAuth();

  if (loading) return null; // ou um spinner

  if (!token) return <Navigate to="/login" replace />;

  // me pode demorar na primeira carga, mas se chegou aqui e não tem me, manda pro login
  if (!me) return <Navigate to="/login" replace />;

  if (roles.length > 0 && !roles.includes(me.role)) {
    // sem permissão: manda para a “home” do papel
    if (me.role === "Admin") return <Navigate to="/dashboard" replace />;
    if (me.role === "Professor") return <Navigate to="/painel-professor" replace />;
    if (me.role === "Aluno") return <Navigate to="/meu-painel" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
