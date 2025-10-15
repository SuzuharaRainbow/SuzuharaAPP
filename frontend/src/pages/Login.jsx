import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api, { ApiError } from "../api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (body) => api.post("/auth/login", body),
    onSuccess: () => {
      queryClient.invalidateQueries(["me"]);
      navigate("/");
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message || "登录失败");
      } else {
        setError("登录失败");
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    mutation.mutate({ username, password });
  };

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <h2 className="page-title" style={{ fontSize: 28, marginBottom: 18 }}>登录后台</h2>
      <label style={{ display: "block", marginBottom: 16 }}>
        用户名
        <input value={username} onChange={(e) => setUsername(e.target.value)} required />
      </label>
      <label style={{ display: "block", marginBottom: 16 }}>
        密码
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && <div style={{ color: "#dc2626", marginBottom: 12 }}>{error}</div>}
      <button type="submit" disabled={mutation.isPending} className="button-primary" style={{ width: "100%" }}>
        {mutation.isPending ? "登录中…" : "登录"}
      </button>
    </form>
  );
}
