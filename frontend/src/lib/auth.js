import { createContext, useContext, useState, useEffect } from "react";
import api from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState(null); // active college

  useEffect(() => {
    const t = localStorage.getItem("vidya_token");
    if (!t) { setLoading(false); return; }
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => localStorage.removeItem("vidya_token")).finally(() => setLoading(false));
    const p = localStorage.getItem("vidya_prop");
    if (p) try { setProperty(JSON.parse(p)); } catch {}
  }, []);

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem("vidya_token", r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };
  const register = async (name, email, password) => {
    const r = await api.post("/auth/register", { name, email, password });
    localStorage.setItem("vidya_token", r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };
  const logout = () => {
    localStorage.removeItem("vidya_token"); localStorage.removeItem("vidya_prop");
    setUser(null); setProperty(null);
  };
  const selectProperty = (p) => {
    setProperty(p);
    if (p) localStorage.setItem("vidya_prop", JSON.stringify(p));
    else localStorage.removeItem("vidya_prop");
  };

  return <AuthCtx.Provider value={{ user, loading, login, register, logout, property, selectProperty }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
