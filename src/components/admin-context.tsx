"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface AdminContextValue {
  isAdmin: boolean;
  password: string | null;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextValue>({
  isAdmin: false,
  password: null,
  login: async () => false,
  logout: () => {},
});

export function useAdmin() {
  return useContext(AdminContext);
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [password, setPassword] = useState<string | null>(null);

  // Restore from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("jaliscazo_admin_pw");
    if (stored) {
      setPassword(stored);
    }
  }, []);

  const login = useCallback(async (pw: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        setPassword(pw);
        sessionStorage.setItem("jaliscazo_admin_pw", pw);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setPassword(null);
    sessionStorage.removeItem("jaliscazo_admin_pw");
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin: !!password, password, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}
