import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, LogIn, UserPlus, AlertCircle } from "lucide-react";

// Provedor de ícone Google oficial em SVG para um visual premium
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: "4px" }}>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { currentUser, login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (currentUser) {
      navigate("/dashboard");
    }
  }, [currentUser, navigate]);


  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("E-mail ou senha incorretos.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("Este e-mail já está em uso.");
      } else if (err.code === "auth/weak-password") {
        setError("A senha deve conter pelo menos 6 caracteres.");
      } else if (err.code === "auth/invalid-email") {
        setError("Formato de e-mail inválido.");
      } else {
        setError("Ocorreu um erro. Tente novamente mais tarde.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Falha ao entrar com o Google.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel">
        <h1 className="auth-title">Encurta Link</h1>
        <p className="auth-subtitle">
          {isRegistering
            ? "Crie sua conta para começar a gerenciar seus links"
            : "Faça login para gerenciar e encurtar seus links"}
        </p>

        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              E-mail
            </label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                placeholder="seu-email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Senha
            </label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="form-input"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? (
              "Aguarde..."
            ) : isRegistering ? (
              <>
                <UserPlus size={18} />
                <span>Criar Conta</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Entrar</span>
              </>
            )}
          </button>
        </form>

        <div className="divider">ou</div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="google-btn"
        >
          <GoogleIcon />
          <span>Entrar com o Google</span>
        </button>

        <p className="auth-toggle-text">
          {isRegistering ? "Já possui uma conta?" : "Não tem uma conta?"}
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError("");
            }}
            disabled={loading}
            className="auth-toggle-link"
          >
            {isRegistering ? "Faça login" : "Cadastre-se"}
          </button>
        </p>
      </div>
    </div>
  );
}
