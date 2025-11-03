"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarNavigation from "@/components/navigation/SidebarNavigation";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function AppShell({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const syncSidebarState = () => {
      if (typeof window === "undefined") return;
      const shouldCollapse = window.innerWidth < 992;
      setSidebarOpen(!shouldCollapse);
    };

    syncSidebarState();
    window.addEventListener("resize", syncSidebarState);
    return () => window.removeEventListener("resize", syncSidebarState);
  }, []);

  const toggleSidebar = () => setSidebarOpen((open) => !open);

  const handleNavigate = () => {
    if (typeof window === "undefined") return;
    if (window.innerWidth < 992) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("uai:user");
    }
    router.replace("/");
  };

  return (
    <div className="app-shell d-flex min-vh-100">
      <aside
        className={`app-sidebar${sidebarOpen ? "" : " app-sidebar--collapsed"}`}
      >
        <SidebarNavigation onNavigate={handleNavigate} />
      </aside>
      <div className="app-content flex-grow-1 d-flex flex-column">
        <header className="app-header navbar px-3 py-2 d-flex align-items-center gap-3">
          <button
            type="button"
            className="navbar-toggler d-flex align-items-center justify-content-center"
            aria-label="Alternar navegação"
            aria-expanded={sidebarOpen}
            onClick={toggleSidebar}
          >
            <span className="navbar-toggler-icon" />
          </button>
          <span className="app-header__title fw-semibold text-uppercase small">Painel</span>
          <div className="ms-auto d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-light app-header__logout"
              onClick={handleLogout}
            >
              Sair
            </button>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-grow-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
