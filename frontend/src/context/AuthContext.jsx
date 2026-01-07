import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiJson } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    try {
      const data = await apiJson("/auth/me");
      setMe(data);
    } catch {
      setMe(null);
      setToken(null);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadMe();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function login(email, senha) {
    setLoading(true);
    const resp = await apiJson("/auth/login", "POST", { email, senha });
    localStorage.setItem("token", resp.token);
    setToken(resp.token);
    await loadMe();
    return resp; // contém role -> você já usa no Login.jsx
  }

  function logout() {
    setMe(null);
    setToken(null);
    localStorage.removeItem("token");
  }

  const value = useMemo(
    () => ({ token, me, loading, login, logout, reloadMe: loadMe }),
    [token, me, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
