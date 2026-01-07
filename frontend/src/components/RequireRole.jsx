import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireRole({ allow }) {
  const { me, token } = useAuth();

  // se não tem token/me, manda pro login
  if (!token) return <Navigate to="/login" replace />;

  const role = me?.role;
  if (!role) return <Navigate to="/dashboard" replace />;

  if (!allow.includes(role)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
