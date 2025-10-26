import React from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./api";
import { useMe } from "./hooks/useMe";
import mascot from "./assets/mascot.png";

const navLinkClass = (locationPath, target) => {
  if (target === "/") {
    return locationPath === "/" || locationPath.startsWith("/collections")
      ? "nav-link is-active"
      : "nav-link";
  }
  return locationPath === target || (target !== "/" && locationPath.startsWith(target))
    ? "nav-link is-active"
    : "nav-link";
};

export default function App() {
  const { data: user, isLoading } = useMe();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => {
      queryClient.invalidateQueries(["me"]);
      navigate("/login");
    },
  });

  const onLogout = () => logoutMutation.mutate();

  if (isLoading) {
    return (
      <div className="auth-splash">
        <div className="auth-splash__card">
          <div className="auth-splash__spinner" />
          <p className="auth-splash__text">すずはら家加载中…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = user.role || "viewer";
  const isDeveloper = role === "developer";
  const isManager = role === "manager";
  const isViewer = role === "viewer";

  if (
    isViewer &&
    !(location.pathname === "/" || location.pathname.startsWith("/media"))
  ) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="app-root">
      <div className="app-shell">
        <header className="app-header">
          <Link to="/" className="app-logo">
            <span className="app-logo-badge" aria-hidden="true">
              <img src={mascot} alt="Suzuhara mascot" className="app-logo-icon" />
            </span>
            <span className="app-logo-text">
              <span>Suzuhara</span>
              <span className="app-logo-text__jp">家</span>
            </span>
          </Link>
          <nav className="app-nav">
            <Link to="/" className={navLinkClass(location.pathname, "/")}>
              首页
            </Link>
            {(isManager || isDeveloper) && (
              <Link to="/albums" className={navLinkClass(location.pathname, "/albums")}>
                相册
              </Link>
            )}
            {(isManager || isDeveloper) && (
              <Link to="/social" className={navLinkClass(location.pathname, "/social")}>
                社交
              </Link>
            )}
            {(isManager || isDeveloper) && (
              <Link to="/upload" className={navLinkClass(location.pathname, "/upload")}>
                上传
              </Link>
            )}
            <span className="nav-chip">
              FOX MODE
              <span style={{ width: 14, height: 14, background: "var(--brand-yellow)", borderRadius: "50%" }} />
            </span>
          </nav>
          <div className="app-user">
            {isLoading ? (
              <span style={{ color: "rgba(50, 44, 84, 0.55)", fontSize: 14 }}>加载中…</span>
            ) : user ? (
              <>
                {isDeveloper ? (
                  <button
                    type="button"
                    onClick={() => navigate("/control")}
                    style={{
                      fontSize: 14,
                      color: "var(--brand-ink)",
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      textDecoration: "underline",
                      textUnderlineOffset: 4,
                    }}
                  >
                    {user.username}（开发者）
                  </button>
                ) : isManager ? (
                  <span style={{ fontSize: 14, color: "var(--brand-ink)" }}>
                    {user.username}（二级管理员）
                  </span>
                ) : (
                  <span style={{ fontSize: 14, color: "var(--brand-ink)" }}>
                    {user.username}（访客）
                  </span>
                )}
                <button type="button" onClick={onLogout} className="button-primary" style={{ padding: "8px 16px" }}>
                  登出
                </button>
              </>
            ) : (
              <Link to="/login" className={navLinkClass(location.pathname, "/login")}>
                登录
              </Link>
            )}
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
